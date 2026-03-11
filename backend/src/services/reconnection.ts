/**
 * WebSocket Reconnection Service
 * US-38: WebSocket/Stream Reconnection Strategy
 * 
 * Handles heartbeat, connection state management, and stream resumption
 */

import { PrismaClient } from '@prisma/client';
import { redisClient } from '../utils/redis';

const prisma = new PrismaClient();

// Configuration
export const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
export const MAX_RECONNECT_ATTEMPTS = 3; // US-38: Maximum 3 retry attempts
const STREAM_STATE_TTL_SECONDS = 3600; // 1 hour

/**
 * Store stream state for resumption
 */
export async function storeStreamState(
  userId: string,
  conversationId: string,
  state: {
    lastTokenIndex?: number;
    lastContent?: string;
    messageId?: string;
    sessionContext?: string;
  }
): Promise<void> {
  if (!redisClient) return;

  const key = `stream:state:${userId}:${conversationId}`;
  try {
    await redisClient.setEx(key, STREAM_STATE_TTL_SECONDS, JSON.stringify(state));
  } catch (error) {
    console.error('[Reconnection] Failed to store stream state:', error);
  }
}

/**
 * Get stored stream state for resumption
 */
export async function getStreamState(
  userId: string,
  conversationId: string
): Promise<{
  lastTokenIndex?: number;
  lastContent?: string;
  messageId?: string;
  sessionContext?: string;
} | null> {
  if (!redisClient) return null;

  const key = `stream:state:${userId}:${conversationId}`;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Reconnection] Failed to get stream state:', error);
    return null;
  }
}

/**
 * Clear stream state after completion
 */
export async function clearStreamState(
  userId: string,
  conversationId: string
): Promise<void> {
  if (!redisClient) return;

  const key = `stream:state:${userId}:${conversationId}`;
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('[Reconnection] Failed to clear stream state:', error);
  }
}

/**
 * Store connection metadata for monitoring
 */
export async function updateConnectionMeta(
  userId: string,
  data: {
    connectedAt?: string;
    lastHeartbeat?: string;
    reconnectCount?: number;
    lastConversationId?: string;
  }
): Promise<void> {
  if (!redisClient) return;

  const key = `connection:meta:${userId}`;
  try {
    const existing = await redisClient.get(key);
    const meta = existing ? JSON.parse(existing) : {};
    
    await redisClient.set(key, JSON.stringify({
      ...meta,
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[Reconnection] Failed to update connection meta:', error);
  }
}

/**
 * Get connection metadata
 */
export async function getConnectionMeta(
  userId: string
): Promise<{
  connectedAt?: string;
  lastHeartbeat?: string;
  reconnectCount?: number;
  lastConversationId?: string;
} | null> {
  if (!redisClient) return null;

  const key = `connection:meta:${userId}`;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Reconnection] Failed to get connection meta:', error);
    return null;
  }
}

/**
 * Register heartbeat interval for a socket
 */
export function createHeartbeatHandler(
  userId: string,
  socket: any,
  intervalMs: number = HEARTBEAT_INTERVAL_MS
): NodeJS.Timeout {
  const interval = setInterval(() => {
    if (socket.connected) {
      // Send heartbeat ping
      socket.emit('ping:heartbeat', { timestamp: Date.now() });
      
      // Update last heartbeat time
      updateConnectionMeta(userId, {
        lastHeartbeat: new Date().toISOString(),
      }).catch(console.error);
    }
  }, intervalMs);

  return interval;
}

/**
 * Handle pong response from client
 */
export async function handleHeartbeatPong(
  userId: string,
  timestamp: number
): Promise<void> {
  const latency = Date.now() - timestamp;
  
  // Log latency for monitoring (could be used for alerting)
  if (latency > 5000) {
    console.warn(`[Heartbeat] High latency for user ${userId}: ${latency}ms`);
  }
  
  await updateConnectionMeta(userId, {
    lastHeartbeat: new Date().toISOString(),
  });
}

/**
 * Store message queue for disconnected state
 */
export async function queueMessage(
  userId: string,
  message: {
    conversationId: string;
    content: string;
    language?: 'bg' | 'en';
    messageId?: string;
  }
): Promise<void> {
  if (!redisClient) return;

  const key = `message:queue:${userId}`;
  try {
    const existing = await redisClient.lRange(key, 0, -1);
    const queue = existing.map(item => JSON.parse(item));
    
    // Add new message to queue (max 50 messages)
    if (queue.length < 50) {
      queue.push({
        ...message,
        queuedAt: new Date().toISOString(),
      });
      await redisClient.del(key);
      for (const msg of queue) {
        await redisClient.rPush(key, JSON.stringify(msg));
      }
    }
  } catch (error) {
    console.error('[Reconnection] Failed to queue message:', error);
  }
}

/**
 * Get queued messages for user
 */
export async function getQueuedMessages(
  userId: string
): Promise<Array<{
  conversationId: string;
  content: string;
  language?: 'bg' | 'en';
  messageId?: string;
  queuedAt: string;
}>> {
  if (!redisClient) return [];

  const key = `message:queue:${userId}`;
  try {
    const existing = await redisClient.lRange(key, 0, -1);
    return existing.map(item => JSON.parse(item));
  } catch (error) {
    console.error('[Reconnection] Failed to get queued messages:', error);
    return [];
  }
}

/**
 * Clear message queue after successful delivery
 */
export async function clearMessageQueue(userId: string): Promise<void> {
  if (!redisClient) return;

  const key = `message:queue:${userId}`;
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('[Reconnection] Failed to clear message queue:', error);
  }
}

/**
 * Get reconnection status for a user
 */
export async function getReconnectionStatus(
  userId: string
): Promise<{
  canReconnect: boolean;
  reconnectCount: number;
  lastConnected?: string;
  lastHeartbeat?: string;
}> {
  const meta = await getConnectionMeta(userId);
  
  return {
    canReconnect: (meta?.reconnectCount || 0) < MAX_RECONNECT_ATTEMPTS,
    reconnectCount: meta?.reconnectCount || 0,
    lastConnected: meta?.connectedAt,
    lastHeartbeat: meta?.lastHeartbeat,
  };
}

/**
 * Record reconnection attempt
 */
export async function recordReconnectionAttempt(
  userId: string,
  success: boolean
): Promise<void> {
  await updateConnectionMeta(userId, {
    reconnectCount: success ? 0 : undefined,
    connectedAt: success ? new Date().toISOString() : undefined,
  });
  
  if (!success) {
    // Increment reconnect count
    if (!redisClient) return;
    const key = `connection:meta:${userId}`;
    try {
      const existing = await redisClient.get(key);
      const meta = existing ? JSON.parse(existing) : {};
      await redisClient.set(key, JSON.stringify({
        ...meta,
        reconnectCount: (meta.reconnectCount || 0) + 1,
        lastReconnectAttempt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[Reconnection] Failed to record attempt:', error);
    }
  }
}

export default {
  storeStreamState,
  getStreamState,
  clearStreamState,
  updateConnectionMeta,
  getConnectionMeta,
  createHeartbeatHandler,
  handleHeartbeatPong,
  queueMessage,
  getQueuedMessages,
  clearMessageQueue,
  getReconnectionStatus,
  recordReconnectionAttempt,
  HEARTBEAT_INTERVAL_MS,
  MAX_RECONNECT_ATTEMPTS,
};
