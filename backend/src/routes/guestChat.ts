/**
 * Guest Chat Routes
 * Public chat endpoint for unauthenticated users
 * Rate limited + HMAC-signed session tokens for abuse prevention
 */

import { Router, Request, Response } from 'express';
import { rateLimiter } from '../middleware/rateLimiter';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

const router = Router();

const GUEST_CHAT_SECRET = process.env.GUEST_CHAT_SECRET || 'guest-chat-secret-change-in-prod';
if (!process.env.GUEST_CHAT_SECRET) {
  console.warn('[GuestChat] WARNING: GUEST_CHAT_SECRET env var not set. Using insecure default. Set this in production!');
}
export const MAX_GUEST_MESSAGES = 10;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function signGuestToken(sessionId: string, ip: string): string {
  const payload = JSON.stringify({ sessionId, createdAt: Date.now(), ip });
  const sig = createHmac('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}

export function verifyGuestToken(token: string, ip: string): { sessionId: string; createdAt: number; ip: string } | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;
    const payloadB64 = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const payload = Buffer.from(payloadB64, 'base64').toString();
    const expectedSig = createHmac('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
    const parsed = JSON.parse(payload);
    if (Date.now() - parsed.createdAt > TOKEN_TTL_MS) return null;
    // Soft IP check — log mismatch but still allow (mobile IPs shift)
    if (parsed.ip && parsed.ip !== ip && parsed.ip !== 'unknown') {
      console.warn(`[GuestChat] Token IP mismatch: token=${parsed.ip} req=${ip}`);
      // Don't reject — just log. Mobile users change IPs between requests.
    }
    return parsed;
  } catch {
    return null;
  }
}

// POST /api/v1/chat/guest/start
// Issues a signed session token. Rate limited: 3 per IP per hour.
router.post(
  '/start',
  rateLimiter(3, 3600),
  (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    const sessionId = randomUUID();
    const token = signGuestToken(sessionId, ip);
    res.json({
      success: true,
      data: { sessionId, token, maxMessages: MAX_GUEST_MESSAGES },
    });
  }
);

export default router;
