"use strict";
/**
 * WebSocket Reconnection Service
 * US-38: WebSocket/Stream Reconnection Strategy
 *
 * Handles heartbeat, connection state management, and stream resumption
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_RECONNECT_ATTEMPTS = exports.HEARTBEAT_INTERVAL_MS = void 0;
exports.storeStreamState = storeStreamState;
exports.getStreamState = getStreamState;
exports.clearStreamState = clearStreamState;
exports.updateConnectionMeta = updateConnectionMeta;
exports.getConnectionMeta = getConnectionMeta;
exports.createHeartbeatHandler = createHeartbeatHandler;
exports.handleHeartbeatPong = handleHeartbeatPong;
exports.queueMessage = queueMessage;
exports.getQueuedMessages = getQueuedMessages;
exports.clearMessageQueue = clearMessageQueue;
exports.getReconnectionStatus = getReconnectionStatus;
exports.recordReconnectionAttempt = recordReconnectionAttempt;
const client_1 = require("@prisma/client");
const redis_1 = require("../utils/redis");
const prisma = new client_1.PrismaClient();
// Configuration
exports.HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
exports.MAX_RECONNECT_ATTEMPTS = 3; // US-38: Maximum 3 retry attempts
const STREAM_STATE_TTL_SECONDS = 3600; // 1 hour
/**
 * Store stream state for resumption
 */
async function storeStreamState(userId, conversationId, state) {
    if (!redis_1.redisClient)
        return;
    const key = `stream:state:${userId}:${conversationId}`;
    try {
        await redis_1.redisClient.setEx(key, STREAM_STATE_TTL_SECONDS, JSON.stringify(state));
    }
    catch (error) {
        console.error('[Reconnection] Failed to store stream state:', error);
    }
}
/**
 * Get stored stream state for resumption
 */
async function getStreamState(userId, conversationId) {
    if (!redis_1.redisClient)
        return null;
    const key = `stream:state:${userId}:${conversationId}`;
    try {
        const data = await redis_1.redisClient.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error('[Reconnection] Failed to get stream state:', error);
        return null;
    }
}
/**
 * Clear stream state after completion
 */
async function clearStreamState(userId, conversationId) {
    if (!redis_1.redisClient)
        return;
    const key = `stream:state:${userId}:${conversationId}`;
    try {
        await redis_1.redisClient.del(key);
    }
    catch (error) {
        console.error('[Reconnection] Failed to clear stream state:', error);
    }
}
/**
 * Store connection metadata for monitoring
 */
async function updateConnectionMeta(userId, data) {
    if (!redis_1.redisClient)
        return;
    const key = `connection:meta:${userId}`;
    try {
        const existing = await redis_1.redisClient.get(key);
        const meta = existing ? JSON.parse(existing) : {};
        await redis_1.redisClient.set(key, JSON.stringify({
            ...meta,
            ...data,
            updatedAt: new Date().toISOString(),
        }));
    }
    catch (error) {
        console.error('[Reconnection] Failed to update connection meta:', error);
    }
}
/**
 * Get connection metadata
 */
async function getConnectionMeta(userId) {
    if (!redis_1.redisClient)
        return null;
    const key = `connection:meta:${userId}`;
    try {
        const data = await redis_1.redisClient.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error('[Reconnection] Failed to get connection meta:', error);
        return null;
    }
}
/**
 * Register heartbeat interval for a socket
 */
function createHeartbeatHandler(userId, socket, intervalMs = exports.HEARTBEAT_INTERVAL_MS) {
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
async function handleHeartbeatPong(userId, timestamp) {
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
async function queueMessage(userId, message) {
    if (!redis_1.redisClient)
        return;
    const key = `message:queue:${userId}`;
    try {
        const existing = await redis_1.redisClient.lRange(key, 0, -1);
        const queue = existing.map(item => JSON.parse(item));
        // Add new message to queue (max 50 messages)
        if (queue.length < 50) {
            queue.push({
                ...message,
                queuedAt: new Date().toISOString(),
            });
            await redis_1.redisClient.del(key);
            for (const msg of queue) {
                await redis_1.redisClient.rPush(key, JSON.stringify(msg));
            }
        }
    }
    catch (error) {
        console.error('[Reconnection] Failed to queue message:', error);
    }
}
/**
 * Get queued messages for user
 */
async function getQueuedMessages(userId) {
    if (!redis_1.redisClient)
        return [];
    const key = `message:queue:${userId}`;
    try {
        const existing = await redis_1.redisClient.lRange(key, 0, -1);
        return existing.map(item => JSON.parse(item));
    }
    catch (error) {
        console.error('[Reconnection] Failed to get queued messages:', error);
        return [];
    }
}
/**
 * Clear message queue after successful delivery
 */
async function clearMessageQueue(userId) {
    if (!redis_1.redisClient)
        return;
    const key = `message:queue:${userId}`;
    try {
        await redis_1.redisClient.del(key);
    }
    catch (error) {
        console.error('[Reconnection] Failed to clear message queue:', error);
    }
}
/**
 * Get reconnection status for a user
 */
async function getReconnectionStatus(userId) {
    const meta = await getConnectionMeta(userId);
    return {
        canReconnect: (meta?.reconnectCount || 0) < exports.MAX_RECONNECT_ATTEMPTS,
        reconnectCount: meta?.reconnectCount || 0,
        lastConnected: meta?.connectedAt,
        lastHeartbeat: meta?.lastHeartbeat,
    };
}
/**
 * Record reconnection attempt
 */
async function recordReconnectionAttempt(userId, success) {
    await updateConnectionMeta(userId, {
        reconnectCount: success ? 0 : undefined,
        connectedAt: success ? new Date().toISOString() : undefined,
    });
    if (!success) {
        // Increment reconnect count
        if (!redis_1.redisClient)
            return;
        const key = `connection:meta:${userId}`;
        try {
            const existing = await redis_1.redisClient.get(key);
            const meta = existing ? JSON.parse(existing) : {};
            await redis_1.redisClient.set(key, JSON.stringify({
                ...meta,
                reconnectCount: (meta.reconnectCount || 0) + 1,
                lastReconnectAttempt: new Date().toISOString(),
            }));
        }
        catch (error) {
            console.error('[Reconnection] Failed to record attempt:', error);
        }
    }
}
exports.default = {
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
    HEARTBEAT_INTERVAL_MS: exports.HEARTBEAT_INTERVAL_MS,
    MAX_RECONNECT_ATTEMPTS: exports.MAX_RECONNECT_ATTEMPTS,
};
//# sourceMappingURL=reconnection.js.map