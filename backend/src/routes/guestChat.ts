/**
 * Guest Chat Routes
 * Public chat endpoint for unauthenticated users
 * Rate limited + HMAC-signed session tokens for abuse prevention
 */

import { Router, Request, Response } from 'express';
import { rateLimiter } from '../middleware/rateLimiter';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { calculateNatalChart, BirthDataInput } from '../services/astrology';
import { buildSystemPrompt, generateChartSummary } from '../services/llm-helpers';
import { streamChatCompletion } from '../services/llm';
import { redisClient } from '../utils/redis';

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

interface GuestBirthData {
  birthDate: string;       // ISO YYYY-MM-DD
  birthTime: string | null; // HH:MM or null
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface GuestMessageBody {
  token: string;
  sessionId: string;
  content: string;
  birthData?: GuestBirthData;
}

// POST /api/v1/chat/guest/message
// Streams an AI response for a guest user. Rate limited: 30/IP/hour.
router.post(
  '/message',
  rateLimiter(30, 3600),
  async (req: Request, res: Response) => {
    const { token, sessionId, content, birthData, language } = req.body as GuestMessageBody & { language?: string };
    const guestLanguage = language === 'bg' ? 'bg' : 'en';

    // Validate required fields
    if (!token || !sessionId || !content) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'token, sessionId, and content are required' } });
      return;
    }

    // Fix 1: Content length limit
    if (content.length > 2000) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_TOO_LONG', message: 'Message too long. Maximum 2000 characters.' } });
      return;
    }

    // Verify session token
    const session = verifyGuestToken(token, req.ip || 'unknown');
    if (!session) {
      res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session token' } });
      return;
    }

    // Fix 2: Cross-check sessionId from token payload against request body
    if (session.sessionId !== sessionId) {
      res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Session ID mismatch.' } });
      return;
    }
    // Also validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_SESSION_ID', message: 'Invalid session ID format.' } });
      return;
    }

    // Check message count
    let msgCount = 0;
    try {
      const countStr = await redisClient.get(`guest_msg_count:${sessionId}`);
      msgCount = countStr ? parseInt(countStr, 10) : 0;
    } catch (e) {
      // Fix 3: Warn when Redis fails on message count check
      console.warn('[GuestChat] Redis unavailable for message count check — failing open:', e);
    }

    if (msgCount >= MAX_GUEST_MESSAGES) {
      res.status(429).json({ success: false, error: { code: 'GUEST_LIMIT_REACHED', message: 'Guest message limit reached. Please register to continue.' } });
      return;
    }

    // Get or compute chart summary
    let chartSummary: string | undefined;
    try {
      const cached = await redisClient.get(`guest_chart:${sessionId}`);
      if (cached) {
        chartSummary = cached;
      } else if (birthData) {
        const [year, month, day] = birthData.birthDate.split('-').map(Number);
        const [hour, minute] = birthData.birthTime ? birthData.birthTime.split(':').map(Number) : [12, 0];
        const input: BirthDataInput = { year, month, day, hour, minute, latitude: birthData.latitude, longitude: birthData.longitude, timezone: birthData.timezone };
        const chart = await calculateNatalChart(input);
        chartSummary = generateChartSummary(chart, 'en');
        await redisClient.setEx(`guest_chart:${sessionId}`, 86400, chartSummary);
      }
    } catch {
      // Redis or chart failure — proceed without chart summary
    }

    // Get conversation history
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    try {
      const historyStr = await redisClient.get(`guest_context:${sessionId}`);
      if (historyStr) {
        history = JSON.parse(historyStr);
      }
    } catch {
      // Redis failure — proceed with empty history
    }

    // Build messages array
    const systemPrompt = await buildSystemPrompt({ chartSummary, language: guestLanguage });
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content },
    ];

    // Set SSE headers before streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial metadata event
    res.write(`event: metadata\ndata: ${JSON.stringify({ sessionId, remaining: Math.max(0, MAX_GUEST_MESSAGES - msgCount - 1) })}\n\n`);

    // Stream AI response
    let fullResponse = '';
    let hasError = false;

    try {
      for await (const chunk of streamChatCompletion(messages)) {
        if (chunk.error) {
          hasError = true;
          res.write(`event: error\ndata: ${JSON.stringify({ message: chunk.error })}\n\n`);
          break;
        }
        fullResponse += chunk.content;
        res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk.content, done: chunk.done })}\n\n`);
        if (chunk.done) break;
      }
    } catch (streamError) {
      hasError = true;
      const msg = streamError instanceof Error ? streamError.message : 'Streaming error';
      res.write(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`);
    }

    // After stream: update history and message count in Redis
    if (!hasError && fullResponse) {
      try {
        const updatedHistory = [
          ...history,
          { role: 'user' as const, content },
          { role: 'assistant' as const, content: fullResponse },
        ].slice(-20); // Keep last 20 messages
        await redisClient.setEx(`guest_context:${sessionId}`, 86400, JSON.stringify(updatedHistory));
        await redisClient.setEx(`guest_msg_count:${sessionId}`, 86400, String(msgCount + 1));
      } catch {
        // Redis failure — non-fatal
      }
    }

    // Send completion event and end response
    res.write(`event: complete\ndata: ${JSON.stringify({ hasError })}\n\n`);
    res.end();
  }
);

export default router;
