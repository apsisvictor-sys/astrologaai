/**
 * Redis Client Singleton
 * Used for password reset tokens, session caching, and chat context
 *
 * US-34: Graceful fallback to in-memory when Redis is unavailable.
 * Connects via REDIS_URL env var (Upstash rediss:// URL).
 */
export declare const redisClient: {
    get: (key: string) => Promise<string | null>;
    setEx: (key: string, ttl: number, value: string) => Promise<void>;
    del: (...keys: string[]) => Promise<void>;
    lPush: (_key: string, _value: string) => Promise<void>;
    rPush: (_key: string, _value: string) => Promise<void>;
    lPop: (_key: string) => Promise<null>;
    lTrim: (_key: string, _start: number, _stop: number) => Promise<void>;
    keys: (_pattern: string) => Promise<string[]>;
    ping: () => Promise<string>;
    on: () => void;
    connect: () => Promise<void>;
};
export declare function isRedisConnected(): boolean;
/**
 * Store chat session context in Redis
 * Stores last N messages for quick context retrieval. Now supports Vercel SDK CoreMessages (tool calls).
 */
export declare function storeSessionContext(sessionId: string, userId: string, messages: Array<any>, // Changed to any to support complex CoreMessages (tool_calls, tool_results)
summary?: string): Promise<void>;
/**
 * Get chat session context from Redis
 * Returns null if context doesn't exist or expired. Supports CoreMessage arrays.
 */
export declare function getSessionContext(sessionId: string): Promise<{
    sessionId: string;
    userId: string;
    recentMessages: Array<any>;
    messageCount: number;
    summary: string | null;
    lastUpdated: string;
} | null>;
/**
 * Update session summary in Redis
 */
export declare function updateSessionSummary(sessionId: string, summary: string): Promise<void>;
/**
 * Clear session context from Redis
 * Used when starting a new conversation
 */
export declare function clearSessionContext(sessionId: string): Promise<void>;
/**
 * Clear all session contexts for a user
 * Used when user requests to clear all chat history
 */
export declare function clearUserSessionContexts(userId: string): Promise<void>;
/**
 * Store password reset token
 * TTL: 24 hours (86400 seconds)
 */
export declare function storeResetToken(token: string, userId: string): Promise<void>;
/**
 * Get user ID from reset token
 * Returns null if token doesn't exist or expired
 */
export declare function getResetToken(token: string): Promise<string | null>;
/**
 * Invalidate reset token (single-use)
 */
export declare function invalidateResetToken(token: string): Promise<void>;
/**
 * Invalidate all user sessions
 * Used after password reset for security
 */
export declare function invalidateUserSessions(userId: string): Promise<void>;
export default redisClient;
//# sourceMappingURL=redis.d.ts.map