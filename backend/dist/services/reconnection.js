"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var reconnection_exports = {};
__export(reconnection_exports, {
  HEARTBEAT_INTERVAL_MS: () => HEARTBEAT_INTERVAL_MS,
  MAX_RECONNECT_ATTEMPTS: () => MAX_RECONNECT_ATTEMPTS,
  clearMessageQueue: () => clearMessageQueue,
  clearStreamState: () => clearStreamState,
  createHeartbeatHandler: () => createHeartbeatHandler,
  default: () => reconnection_default,
  getConnectionMeta: () => getConnectionMeta,
  getQueuedMessages: () => getQueuedMessages,
  getReconnectionStatus: () => getReconnectionStatus,
  getStreamState: () => getStreamState,
  handleHeartbeatPong: () => handleHeartbeatPong,
  queueMessage: () => queueMessage,
  recordReconnectionAttempt: () => recordReconnectionAttempt,
  storeStreamState: () => storeStreamState,
  updateConnectionMeta: () => updateConnectionMeta
});
module.exports = __toCommonJS(reconnection_exports);
var import_redis = require("../utils/redis");
const HEARTBEAT_INTERVAL_MS = 3e4;
const MAX_RECONNECT_ATTEMPTS = 3;
const STREAM_STATE_TTL_SECONDS = 3600;
async function storeStreamState(userId, conversationId, state) {
  if (!import_redis.redisClient) return;
  const key = `stream:state:${userId}:${conversationId}`;
  try {
    await import_redis.redisClient.setEx(key, STREAM_STATE_TTL_SECONDS, JSON.stringify(state));
  } catch (error) {
    console.error("[Reconnection] Failed to store stream state:", error);
  }
}
async function getStreamState(userId, conversationId) {
  if (!import_redis.redisClient) return null;
  const key = `stream:state:${userId}:${conversationId}`;
  try {
    const data = await import_redis.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("[Reconnection] Failed to get stream state:", error);
    return null;
  }
}
async function clearStreamState(userId, conversationId) {
  if (!import_redis.redisClient) return;
  const key = `stream:state:${userId}:${conversationId}`;
  try {
    await import_redis.redisClient.del(key);
  } catch (error) {
    console.error("[Reconnection] Failed to clear stream state:", error);
  }
}
async function updateConnectionMeta(userId, data) {
  if (!import_redis.redisClient) return;
  const key = `connection:meta:${userId}`;
  try {
    const existing = await import_redis.redisClient.get(key);
    const meta = existing ? JSON.parse(existing) : {};
    await import_redis.redisClient.set(key, JSON.stringify({
      ...meta,
      ...data,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }));
  } catch (error) {
    console.error("[Reconnection] Failed to update connection meta:", error);
  }
}
async function getConnectionMeta(userId) {
  if (!import_redis.redisClient) return null;
  const key = `connection:meta:${userId}`;
  try {
    const data = await import_redis.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("[Reconnection] Failed to get connection meta:", error);
    return null;
  }
}
function createHeartbeatHandler(userId, socket, intervalMs = HEARTBEAT_INTERVAL_MS) {
  const interval = setInterval(() => {
    if (socket.connected) {
      socket.emit("ping:heartbeat", { timestamp: Date.now() });
      updateConnectionMeta(userId, {
        lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString()
      }).catch(console.error);
    }
  }, intervalMs);
  return interval;
}
async function handleHeartbeatPong(userId, timestamp) {
  const latency = Date.now() - timestamp;
  if (latency > 5e3) {
    console.warn(`[Heartbeat] High latency for user ${userId}: ${latency}ms`);
  }
  await updateConnectionMeta(userId, {
    lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function queueMessage(userId, message) {
  if (!import_redis.redisClient) return;
  const key = `message:queue:${userId}`;
  try {
    const existing = await import_redis.redisClient.lRange(key, 0, -1);
    const queue = existing.map((item) => JSON.parse(item));
    if (queue.length < 50) {
      queue.push({
        ...message,
        queuedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await import_redis.redisClient.del(key);
      for (const msg of queue) {
        await import_redis.redisClient.rPush(key, JSON.stringify(msg));
      }
    }
  } catch (error) {
    console.error("[Reconnection] Failed to queue message:", error);
  }
}
async function getQueuedMessages(userId) {
  if (!import_redis.redisClient) return [];
  const key = `message:queue:${userId}`;
  try {
    const existing = await import_redis.redisClient.lRange(key, 0, -1);
    return existing.map((item) => JSON.parse(item));
  } catch (error) {
    console.error("[Reconnection] Failed to get queued messages:", error);
    return [];
  }
}
async function clearMessageQueue(userId) {
  if (!import_redis.redisClient) return;
  const key = `message:queue:${userId}`;
  try {
    await import_redis.redisClient.del(key);
  } catch (error) {
    console.error("[Reconnection] Failed to clear message queue:", error);
  }
}
async function getReconnectionStatus(userId) {
  const meta = await getConnectionMeta(userId);
  return {
    canReconnect: (meta?.reconnectCount || 0) < MAX_RECONNECT_ATTEMPTS,
    reconnectCount: meta?.reconnectCount || 0,
    lastConnected: meta?.connectedAt,
    lastHeartbeat: meta?.lastHeartbeat
  };
}
async function recordReconnectionAttempt(userId, success) {
  await updateConnectionMeta(userId, {
    reconnectCount: success ? 0 : void 0,
    connectedAt: success ? (/* @__PURE__ */ new Date()).toISOString() : void 0
  });
  if (!success) {
    if (!import_redis.redisClient) return;
    const key = `connection:meta:${userId}`;
    try {
      const existing = await import_redis.redisClient.get(key);
      const meta = existing ? JSON.parse(existing) : {};
      await import_redis.redisClient.set(key, JSON.stringify({
        ...meta,
        reconnectCount: (meta.reconnectCount || 0) + 1,
        lastReconnectAttempt: (/* @__PURE__ */ new Date()).toISOString()
      }));
    } catch (error) {
      console.error("[Reconnection] Failed to record attempt:", error);
    }
  }
}
var reconnection_default = {
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
  MAX_RECONNECT_ATTEMPTS
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HEARTBEAT_INTERVAL_MS,
  MAX_RECONNECT_ATTEMPTS,
  clearMessageQueue,
  clearStreamState,
  createHeartbeatHandler,
  getConnectionMeta,
  getQueuedMessages,
  getReconnectionStatus,
  getStreamState,
  handleHeartbeatPong,
  queueMessage,
  recordReconnectionAttempt,
  storeStreamState,
  updateConnectionMeta
});
