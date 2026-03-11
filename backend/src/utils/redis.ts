/**
 * Redis Client Singleton
 * Used for password reset tokens, session caching, and chat context
 * 
 * US-34: Graceful fallback when Redis is unavailable
 */

// Redis disabled — using in-memory fallback only.
// Re-enable by restoring the createClient() connection when Redis is needed.

// In-memory fallback cache
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function createMemoryFallbackClient() {
  return {
    get: async (key: string) => {
      const item = memoryCache.get(key);
      if (item && item.expiresAt > Date.now()) {
        return item.value;
      }
      memoryCache.delete(key);
      return null;
    },
    setEx: async (key: string, ttl: number, value: string) => {
      memoryCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    },
    del: async (...keys: string[]) => {
      keys.forEach(k => memoryCache.delete(k));
    },
    lPush: async (_key: string, _value: string) => { },
    rPush: async (_key: string, _value: string) => { },
    lPop: async (_key: string) => null,
    lTrim: async (_key: string, _start: number, _stop: number) => { },
    keys: async (_pattern: string) => [] as string[],
    ping: async () => 'PONG',
    on: () => { },
    connect: async () => { },
  };
}

console.log('[Redis] Using in-memory fallback (Redis disabled)');

export const redisClient = createMemoryFallbackClient() as any;

export function isRedisConnected(): boolean {
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
export async function storeSessionContext(
  sessionId: string,
  userId: string,
  messages: Array<any>, // Changed to any to support complex CoreMessages (tool_calls, tool_results)
  summary?: string
): Promise<void> {
  const key = `chat_context:${sessionId}`;

  const context = {
    sessionId,
    userId,
    recentMessages: messages.slice(-MAX_CONTEXT_MESSAGES),
    messageCount: messages.length,
    summary: summary || null,
    lastUpdated: new Date().toISOString(),
  };

  await redisClient.setEx(key, SESSION_CONTEXT_TTL, JSON.stringify(context));
}

/**
 * Get chat session context from Redis
 * Returns null if context doesn't exist or expired. Supports CoreMessage arrays.
 */
export async function getSessionContext(
  sessionId: string
): Promise<{
  sessionId: string;
  userId: string;
  recentMessages: Array<any>;
  messageCount: number;
  summary: string | null;
  lastUpdated: string;
} | null> {
  const key = `chat_context:${sessionId}`;
  const data = await redisClient.get(key);

  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Update session summary in Redis
 */
export async function updateSessionSummary(
  sessionId: string,
  summary: string
): Promise<void> {
  const existing = await getSessionContext(sessionId);

  if (existing) {
    const key = `chat_context:${sessionId}`;
    existing.summary = summary;
    existing.lastUpdated = new Date().toISOString();
    await redisClient.setEx(key, SESSION_CONTEXT_TTL, JSON.stringify(existing));
  }
}

/**
 * Clear session context from Redis
 * Used when starting a new conversation
 */
export async function clearSessionContext(sessionId: string): Promise<void> {
  const key = `chat_context:${sessionId}`;
  await redisClient.del(key);
}

/**
 * Clear all session contexts for a user
 * Used when user requests to clear all chat history
 */
export async function clearUserSessionContexts(userId: string): Promise<void> {
  const pattern = `chat_context:*`;
  const keys = await redisClient.keys(pattern);

  // Filter keys that belong to this user
  const userContextKeys: string[] = [];
  for (const key of keys) {
    const data = await redisClient.get(key);
    if (data) {
      try {
        const context = JSON.parse(data);
        if (context.userId === userId) {
          userContextKeys.push(key);
        }
      } catch {
        // Skip invalid data
      }
    }
  }

  if (userContextKeys.length > 0) {
    await redisClient.del(userContextKeys);
  }
}

/**
 * Store password reset token
 * TTL: 24 hours (86400 seconds)
 */
export async function storeResetToken(token: string, userId: string): Promise<void> {
  const key = `reset_token:${token}`;
  await redisClient.setEx(key, 86400, userId);
}

/**
 * Get user ID from reset token
 * Returns null if token doesn't exist or expired
 */
export async function getResetToken(token: string): Promise<string | null> {
  const key = `reset_token:${token}`;
  return await redisClient.get(key);
}

/**
 * Invalidate reset token (single-use)
 */
export async function invalidateResetToken(token: string): Promise<void> {
  const key = `reset_token:${token}`;
  await redisClient.del(key);
}

/**
 * Invalidate all user sessions
 * Used after password reset for security
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  // Get all session keys for user
  const pattern = `session:*:${userId}`;
  const keys = await redisClient.keys(pattern);

  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}

export default redisClient;
