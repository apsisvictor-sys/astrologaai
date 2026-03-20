/**
 * Rate Limit Middleware
 * - FREE tier: token-based daily limit (output tokens tracked in Redis, limit from AdminConfig)
 * - Admin accounts: unlimited always
 * - PRO/PREMIUM: burst rate limit only (requests per minute)
 */

import { Request, Response, NextFunction } from 'express';
import { Tier } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  isUnlimitedTier,
  getBurstLimit,
  isUnlimitedBurst,
} from '../config/subscription-tiers';
import { redisClient } from '../utils/redis';
import { RATE_LIMIT_HEADERS } from './rateLimitHeaders';

// ── Helpers ────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  return adminEmails.includes(email);
}

export function getDailyTokenRedisKey(userId: string): string {
  return `tokens:daily:${userId}:${getTodayKey()}`;
}

/**
 * Read the FREE tier daily token limit from AdminConfig.
 * Falls back to 1500 if not set.
 */
export async function getFreeTierDailyTokenLimit(): Promise<number> {
  try {
    const config = await (prisma.adminConfig as any).findUnique({
      where: { key: 'free_tier_daily_token_limit' },
    });
    if (config?.value) {
      const n = parseInt(config.value, 10);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {
    // fallback
  }
  return 1500;
}

/**
 * Get today's token usage for a FREE user from Redis.
 */
export async function getDailyTokensUsed(userId: string): Promise<number> {
  const val = await redisClient.get(getDailyTokenRedisKey(userId));
  return parseInt(val || '0', 10);
}

/**
 * Increment daily token counter for a FREE user.
 * Sets a 26h TTL on first write so the key always expires after the day.
 */
export async function incrementDailyTokens(userId: string, tokens: number): Promise<number> {
  const key = getDailyTokenRedisKey(userId);
  const newTotal = await redisClient.incrby(key, tokens);
  if (newTotal === tokens) {
    // First write today — set TTL
    await redisClient.expire(key, 26 * 3600);
  }
  return newTotal;
}

// ── Burst limit (PRO/PREMIUM) ──────────────────────────────────────────────

async function checkBurstLimit(
  userId: string,
  tier: Tier
): Promise<{ allowed: boolean; remaining: number | 'unlimited'; retryAfter: number }> {
  if (isUnlimitedBurst(tier)) {
    return { allowed: true, remaining: 'unlimited', retryAfter: 0 };
  }

  const burstLimit = getBurstLimit(tier);
  const burstKey = `ratelimit:burst:${userId}`;
  const currentCount = parseInt(await redisClient.get(burstKey) || '0', 10);

  if (currentCount >= burstLimit) {
    const ttl = await redisClient.ttl(burstKey);
    return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : 60 };
  }

  return { allowed: true, remaining: burstLimit - currentCount - 1, retryAfter: 0 };
}

async function incrementBurstCounter(userId: string, tier: Tier): Promise<void> {
  if (isUnlimitedBurst(tier)) return;
  const burstKey = `ratelimit:burst:${userId}`;
  const count = await redisClient.incr(burstKey);
  if (count === 1) await redisClient.expire(burstKey, 60);
}

// ── Main middleware ────────────────────────────────────────────────────────

export async function queryLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email || '';
    const userTier = (req.user?.tier as Tier) || 'FREE';
    const userLanguage = req.user?.language || 'bg';

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Admin accounts: unlimited always
    if (isAdminEmail(userEmail)) {
      (req as any).queryLimit = { allowed: true, unlimited: true };
      next();
      return;
    }

    // PRO/PREMIUM: burst limit only
    if (isUnlimitedTier(userTier)) {
      const burst = await checkBurstLimit(userId, userTier);
      if (!burst.allowed) {
        res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, burst.retryAfter);
        res.setHeader(RATE_LIMIT_HEADERS.TIER, userTier);
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: userLanguage === 'en'
              ? 'Too many requests. Please wait a moment before continuing.'
              : 'Твърде много заявки. Моля, изчакайте малко.',
            limitType: 'burst',
            retryAfter: burst.retryAfter,
          },
        });
        return;
      }
      await incrementBurstCounter(userId, userTier);
      (req as any).queryLimit = { allowed: true, unlimited: true };
      next();
      return;
    }

    // FREE tier: check daily token limit
    const [tokensUsed, tokenLimit] = await Promise.all([
      getDailyTokensUsed(userId),
      getFreeTierDailyTokenLimit(),
    ]);

    if (tokensUsed >= tokenLimit) {
      // Already over — block this new message
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const retryAfter = Math.ceil((tomorrow.getTime() - Date.now()) / 1000);

      res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
      res.setHeader(RATE_LIMIT_HEADERS.TIER, userTier);
      res.status(429).json({
        success: false,
        error: {
          code: 'DAILY_LIMIT_REACHED',
          message: userLanguage === 'en'
            ? 'You\'ve reached your daily cosmic limit. Upgrade to Pro for unlimited access.'
            : 'Достигнахте дневния си лимит. Надградете до Pro за неограничен достъп.',
          limitType: 'daily_tokens',
          retryAfter,
          upgradeUrl: '/pricing',
        },
      });
      return;
    }

    // Also check burst for FREE
    await checkBurstLimit(userId, userTier); // non-blocking, ignore result for FREE

    (req as any).queryLimit = { allowed: true, tokensUsed, tokenLimit };
    next();
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' },
    });
  }
}

/**
 * Legacy export — kept for subscription status route compatibility
 */
export async function getUserUsageStats(_userId: string, tier: Tier): Promise<{
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  resetAt: string;
  percentage: number | null;
}> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (isUnlimitedTier(tier)) {
    return { used: 0, limit: 'unlimited', remaining: 'unlimited', resetAt: tomorrow.toISOString(), percentage: null };
  }

  return { used: 0, limit: 'unlimited', remaining: 'unlimited', resetAt: tomorrow.toISOString(), percentage: null };
}

export async function checkQueryLimit(
  userId: string,
  tier: Tier
): Promise<{ allowed: boolean; monthlyUsed: number; monthlyLimit: number | 'unlimited'; monthlyRemaining: number | 'unlimited'; burstRemaining: number | 'unlimited'; resetAt: Date; retryAfter: number }> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return { allowed: true, monthlyUsed: 0, monthlyLimit: 'unlimited', monthlyRemaining: 'unlimited', burstRemaining: 'unlimited', resetAt: tomorrow, retryAfter: 0 };
}

export async function incrementQueryCount(_userId: string, _tier: Tier): Promise<{ newCount: number; month: string }> {
  // No-op — query counting replaced by token counting
  return { newCount: 0, month: '' };
}

export default { queryLimitMiddleware, getUserUsageStats, checkQueryLimit, incrementQueryCount };
