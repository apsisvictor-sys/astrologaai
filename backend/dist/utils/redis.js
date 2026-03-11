"use strict";
/**
 * Redis Client Singleton
 * Used for password reset tokens, session caching, and chat context
 *
 * US-34: Graceful fallback when Redis is unavailable
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.isRedisConnected = isRedisConnected;
exports.storeSessionContext = storeSessionContext;
exports.getSessionContext = getSessionContext;
exports.updateSessionSummary = updateSessionSummary;
exports.clearSessionContext = clearSessionContext;
exports.clearUserSessionContexts = clearUserSessionContexts;
exports.storeResetToken = storeResetToken;
exports.getResetToken = getResetToken;
exports.invalidateResetToken = invalidateResetToken;
exports.invalidateUserSessions = invalidateUserSessions;
// Redis disabled — using in-memory fallback only.
const memoryCache = new Map();
function createMemoryFallbackClient() {
    return {
        get: async (key) => {
            const item = memoryCache.get(key);
            if (item && item.expiresAt > Date.now()) {
                return item.value;
            }
            memoryCache.delete(key);
            return null;
        },
        setEx: async (key, ttl, value) => {
            memoryCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
        },
        del: async (...keys) => {
            keys.forEach(k => memoryCache.delete(k));
        },
        lPush: async (_key, _value) => { },
        rPush: async (_key, _value) => { },
        lPop: async (_key) => null,
        lTrim: async (_key, _start, _stop) => { },
        keys: async (_pattern) => [],
        ping: async () => 'PONG',
        on: () => { },
        connect: async () => { },
    };
}
console.log('[Redis] Using in-memory fallback (Redis disabled)');
exports.redisClient = createMemoryFallbackClient();
function isRedisConnected() {
    return false;
}
// ============================================
// Session Context Management (US-09)
// ============================================
const SESSION_CONTEXT_TTL = 24 * 60 * 60; // 24 hours in seconds
const MAX_CONTEXT_MESSAGES = 10; // Last 10 messages for context
const SUMMARY_THRESHOLD = 20; // Generate summary after 20 messages
/**
 * Store chat session context in Redis
 * Stores last N messages for quick context retrieval. Now supports Vercel SDK CoreMessages (tool calls).
 */
async function storeSessionContext(sessionId, userId, messages, // Changed to any to support complex CoreMessages (tool_calls, tool_results)
summary) {
    const key = `chat_context:${sessionId}`;
    const context = {
        sessionId,
        userId,
        recentMessages: messages.slice(-MAX_CONTEXT_MESSAGES),
        messageCount: messages.length,
        summary: summary || null,
        lastUpdated: new Date().toISOString(),
    };
    await exports.redisClient.setEx(key, SESSION_CONTEXT_TTL, JSON.stringify(context));
}
/**
 * Get chat session context from Redis
 * Returns null if context doesn't exist or expired. Supports CoreMessage arrays.
 */
async function getSessionContext(sessionId) {
    const key = `chat_context:${sessionId}`;
    const data = await exports.redisClient.get(key);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
}
/**
 * Update session summary in Redis
 */
async function updateSessionSummary(sessionId, summary) {
    const existing = await getSessionContext(sessionId);
    if (existing) {
        const key = `chat_context:${sessionId}`;
        existing.summary = summary;
        existing.lastUpdated = new Date().toISOString();
        await exports.redisClient.setEx(key, SESSION_CONTEXT_TTL, JSON.stringify(existing));
    }
}
/**
 * Clear session context from Redis
 * Used when starting a new conversation
 */
async function clearSessionContext(sessionId) {
    const key = `chat_context:${sessionId}`;
    await exports.redisClient.del(key);
}
/**
 * Clear all session contexts for a user
 * Used when user requests to clear all chat history
 */
async function clearUserSessionContexts(userId) {
    const pattern = `chat_context:*`;
    const keys = await exports.redisClient.keys(pattern);
    // Filter keys that belong to this user
    const userContextKeys = [];
    for (const key of keys) {
        const data = await exports.redisClient.get(key);
        if (data) {
            try {
                const context = JSON.parse(data);
                if (context.userId === userId) {
                    userContextKeys.push(key);
                }
            }
            catch {
                // Skip invalid data
            }
        }
    }
    if (userContextKeys.length > 0) {
        await exports.redisClient.del(userContextKeys);
    }
}
/**
 * Store password reset token
 * TTL: 24 hours (86400 seconds)
 */
async function storeResetToken(token, userId) {
    const key = `reset_token:${token}`;
    await exports.redisClient.setEx(key, 86400, userId);
}
/**
 * Get user ID from reset token
 * Returns null if token doesn't exist or expired
 */
async function getResetToken(token) {
    const key = `reset_token:${token}`;
    return await exports.redisClient.get(key);
}
/**
 * Invalidate reset token (single-use)
 */
async function invalidateResetToken(token) {
    const key = `reset_token:${token}`;
    await exports.redisClient.del(key);
}
/**
 * Invalidate all user sessions
 * Used after password reset for security
 */
async function invalidateUserSessions(userId) {
    // Get all session keys for user
    const pattern = `session:*:${userId}`;
    const keys = await exports.redisClient.keys(pattern);
    if (keys.length > 0) {
        await exports.redisClient.del(keys);
    }
}
exports.default = exports.redisClient;
//# sourceMappingURL=redis.js.map