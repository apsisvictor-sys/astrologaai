"use strict";
/**
 * Guest Chat Routes
 * Public chat endpoint for unauthenticated users
 * Rate limited + HMAC-signed session tokens for abuse prevention
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_GUEST_MESSAGES = void 0;
exports.signGuestToken = signGuestToken;
exports.verifyGuestToken = verifyGuestToken;
const express_1 = require("express");
const rateLimiter_1 = require("../middleware/rateLimiter");
const crypto_1 = require("crypto");
const astrology_1 = require("../services/astrology");
const llm_helpers_1 = require("../services/llm-helpers");
const llm_1 = require("../services/llm");
const redis_1 = require("../utils/redis");
const router = (0, express_1.Router)();
const GUEST_CHAT_SECRET = process.env.GUEST_CHAT_SECRET || 'guest-chat-secret-change-in-prod';
if (!process.env.GUEST_CHAT_SECRET) {
    console.warn('[GuestChat] WARNING: GUEST_CHAT_SECRET env var not set. Using insecure default. Set this in production!');
}
exports.MAX_GUEST_MESSAGES = 10;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
function signGuestToken(sessionId, ip) {
    const payload = JSON.stringify({ sessionId, createdAt: Date.now(), ip });
    const sig = (0, crypto_1.createHmac)('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
    return Buffer.from(payload).toString('base64') + '.' + sig;
}
function verifyGuestToken(token, ip) {
    if (!token || typeof token !== 'string')
        return null;
    try {
        const dotIndex = token.lastIndexOf('.');
        if (dotIndex === -1)
            return null;
        const payloadB64 = token.slice(0, dotIndex);
        const sig = token.slice(dotIndex + 1);
        const payload = Buffer.from(payloadB64, 'base64').toString();
        const expectedSig = (0, crypto_1.createHmac)('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
        const sigBuf = Buffer.from(sig, 'hex');
        const expectedBuf = Buffer.from(expectedSig, 'hex');
        if (sigBuf.length !== expectedBuf.length || !(0, crypto_1.timingSafeEqual)(sigBuf, expectedBuf))
            return null;
        const parsed = JSON.parse(payload);
        if (Date.now() - parsed.createdAt > TOKEN_TTL_MS)
            return null;
        // Soft IP check — log mismatch but still allow (mobile IPs shift)
        if (parsed.ip && parsed.ip !== ip && parsed.ip !== 'unknown') {
            console.warn(`[GuestChat] Token IP mismatch: token=${parsed.ip} req=${ip}`);
            // Don't reject — just log. Mobile users change IPs between requests.
        }
        return parsed;
    }
    catch {
        return null;
    }
}
// POST /api/v1/chat/guest/start
// Issues a signed session token. Rate limited: 3 per IP per hour.
router.post('/start', (0, rateLimiter_1.rateLimiter)(3, 3600), (req, res) => {
    const ip = req.ip || 'unknown';
    const sessionId = (0, crypto_1.randomUUID)();
    const token = signGuestToken(sessionId, ip);
    res.json({
        success: true,
        data: { sessionId, token, maxMessages: exports.MAX_GUEST_MESSAGES },
    });
});
// POST /api/v1/chat/guest/message
// Streams an AI response for a guest user. Rate limited: 30/IP/hour.
router.post('/message', (0, rateLimiter_1.rateLimiter)(30, 3600), async (req, res) => {
    const { token, sessionId, content, birthData } = req.body;
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
        const countStr = await redis_1.redisClient.get(`guest_msg_count:${sessionId}`);
        msgCount = countStr ? parseInt(countStr, 10) : 0;
    }
    catch (e) {
        // Fix 3: Warn when Redis fails on message count check
        console.warn('[GuestChat] Redis unavailable for message count check — failing open:', e);
    }
    if (msgCount >= exports.MAX_GUEST_MESSAGES) {
        res.status(429).json({ success: false, error: { code: 'GUEST_LIMIT_REACHED', message: 'Guest message limit reached. Please register to continue.' } });
        return;
    }
    // Get or compute chart summary
    let chartSummary;
    try {
        const cached = await redis_1.redisClient.get(`guest_chart:${sessionId}`);
        if (cached) {
            chartSummary = cached;
        }
        else if (birthData) {
            const [year, month, day] = birthData.birthDate.split('-').map(Number);
            const [hour, minute] = birthData.birthTime ? birthData.birthTime.split(':').map(Number) : [12, 0];
            const input = { year, month, day, hour, minute, latitude: birthData.latitude, longitude: birthData.longitude, timezone: birthData.timezone };
            const chart = await (0, astrology_1.calculateNatalChart)(input);
            chartSummary = (0, llm_helpers_1.generateChartSummary)(chart, 'en');
            await redis_1.redisClient.setEx(`guest_chart:${sessionId}`, 86400, chartSummary);
        }
    }
    catch {
        // Redis or chart failure — proceed without chart summary
    }
    // Get conversation history
    let history = [];
    try {
        const historyStr = await redis_1.redisClient.get(`guest_context:${sessionId}`);
        if (historyStr) {
            history = JSON.parse(historyStr);
        }
    }
    catch {
        // Redis failure — proceed with empty history
    }
    // Build messages array
    const systemPrompt = (0, llm_helpers_1.buildSystemPrompt)({ chartSummary, language: 'en' });
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content },
    ];
    // Set SSE headers before streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    // Send initial metadata event
    res.write(`event: metadata\ndata: ${JSON.stringify({ sessionId, remaining: Math.max(0, exports.MAX_GUEST_MESSAGES - msgCount - 1) })}\n\n`);
    // Stream AI response
    let fullResponse = '';
    let hasError = false;
    try {
        for await (const chunk of (0, llm_1.streamChatCompletion)(messages)) {
            if (chunk.error) {
                hasError = true;
                res.write(`event: error\ndata: ${JSON.stringify({ message: chunk.error })}\n\n`);
                break;
            }
            fullResponse += chunk.content;
            res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk.content, done: chunk.done })}\n\n`);
            if (chunk.done)
                break;
        }
    }
    catch (streamError) {
        hasError = true;
        const msg = streamError instanceof Error ? streamError.message : 'Streaming error';
        res.write(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`);
    }
    // After stream: update history and message count in Redis
    if (!hasError && fullResponse) {
        try {
            const updatedHistory = [
                ...history,
                { role: 'user', content },
                { role: 'assistant', content: fullResponse },
            ].slice(-20); // Keep last 20 messages
            await redis_1.redisClient.setEx(`guest_context:${sessionId}`, 86400, JSON.stringify(updatedHistory));
            await redis_1.redisClient.setEx(`guest_msg_count:${sessionId}`, 86400, String(msgCount + 1));
        }
        catch {
            // Redis failure — non-fatal
        }
    }
    // Send completion event and end response
    res.write(`event: complete\ndata: ${JSON.stringify({ hasError })}\n\n`);
    res.end();
});
exports.default = router;
//# sourceMappingURL=guestChat.js.map