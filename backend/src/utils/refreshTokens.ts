/**
 * Refresh token management — BUG-38
 *
 * Opaque tokens (48-byte random hex) stored as SHA-256 hashes in the DB.
 * Token families: all tokens from one login share a familyId.
 * Reuse detection: if an already-consumed token arrives, revoke the entire family.
 */

import * as crypto from 'crypto';
import prisma from './prisma';

const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — rolling window

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Create a new refresh token (called on login/OAuth).
 * Returns the raw token to set in the httpOnly cookie.
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, familyId, expiresAt },
  });

  return raw;
}

/**
 * Validate an incoming refresh token and rotate it.
 * Returns { userId, email, tier, newToken } on success, or null on failure.
 * Null means: force re-login. Caller should clear the cookie and return 401.
 */
export async function validateAndRotate(raw: string): Promise<{
  userId: string;
  email: string;
  tier: string;
  newToken: string;
} | null> {
  const tokenHash = hashToken(raw);

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, tier: true } } },
  });

  if (!record) {
    // Token not in DB — never issued or already cleaned up. Reject silently.
    return null;
  }

  // Already revoked (logout, password reset, or prior reuse detection)
  if (record.revokedAt) {
    return null;
  }

  // Reuse detected: token was already consumed. Revoke entire family.
  if (record.usedAt) {
    console.warn(`[Auth] Refresh token reuse detected — revoking family ${record.familyId} for user ${record.userId}`);
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  // Expired
  if (record.expiresAt < new Date()) {
    return null;
  }

  // Valid — rotate: mark old as used, create new in same family
  const newRaw = crypto.randomBytes(48).toString('hex');
  const newHash = hashToken(newRaw);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: newHash,
        familyId: record.familyId,
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  return {
    userId: record.userId,
    email: record.user.email,
    tier: record.user.tier,
    newToken: newRaw,
  };
}

/**
 * Revoke a single token (logout).
 */
export async function revokeToken(raw: string): Promise<void> {
  const tokenHash = hashToken(raw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke ALL refresh tokens for a user (password reset, account compromise).
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
