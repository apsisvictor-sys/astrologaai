"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGuestToken = exports.signGuestToken = exports.MAX_GUEST_MESSAGES = void 0;
const express_1 = require("express");
const rateLimiter_1 = require("../middleware/rateLimiter");
const crypto_1 = require("crypto");

const router = (0, express_1.Router)();

const GUEST_CHAT_SECRET = process.env.GUEST_CHAT_SECRET || 'guest-chat-secret-change-in-prod';
if (!process.env.GUEST_CHAT_SECRET) {
    console.warn('[GuestChat] WARNING: GUEST_CHAT_SECRET env var not set. Using insecure default. Set this in production!');
}
const MAX_GUEST_MESSAGES = 10;
exports.MAX_GUEST_MESSAGES = MAX_GUEST_MESSAGES;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function signGuestToken(sessionId, ip) {
    const payload = JSON.stringify({ sessionId, createdAt: Date.now(), ip });
    const sig = (0, crypto_1.createHmac)('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
    return Buffer.from(payload).toString('base64') + '.' + sig;
}
exports.signGuestToken = signGuestToken;

function verifyGuestToken(token, ip) {
    if (!token || typeof token !== 'string') return null;
    try {
        const dotIndex = token.lastIndexOf('.');
        if (dotIndex === -1) return null;
        const payloadB64 = token.slice(0, dotIndex);
        const sig = token.slice(dotIndex + 1);
        const payload = Buffer.from(payloadB64, 'base64').toString();
        const expectedSig = (0, crypto_1.createHmac)('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
        const sigBuf = Buffer.from(sig, 'hex');
        const expectedBuf = Buffer.from(expectedSig, 'hex');
        if (sigBuf.length !== expectedBuf.length || !(0, crypto_1.timingSafeEqual)(sigBuf, expectedBuf)) return null;
        const parsed = JSON.parse(payload);
        if (Date.now() - parsed.createdAt > TOKEN_TTL_MS) return null;
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
exports.verifyGuestToken = verifyGuestToken;

router.post('/start', (0, rateLimiter_1.rateLimiter)(3, 3600), (req, res) => {
    const ip = req.ip || 'unknown';
    const sessionId = (0, crypto_1.randomUUID)();
    const token = signGuestToken(sessionId, ip);
    res.json({
        success: true,
        data: { sessionId, token, maxMessages: MAX_GUEST_MESSAGES },
    });
});

exports.default = router;
