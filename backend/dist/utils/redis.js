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
var redis_exports = {};
__export(redis_exports, {
  clearSessionContext: () => clearSessionContext,
  clearUserSessionContexts: () => clearUserSessionContexts,
  default: () => redis_default,
  getResetToken: () => getResetToken,
  getSessionContext: () => getSessionContext,
  invalidateResetToken: () => invalidateResetToken,
  invalidateUserSessions: () => invalidateUserSessions,
  isRedisConnected: () => isRedisConnected,
  redisClient: () => redisClient,
  storeResetToken: () => storeResetToken,
  storeSessionContext: () => storeSessionContext,
  updateSessionSummary: () => updateSessionSummary
});
module.exports = __toCommonJS(redis_exports);
var import_redis = require("redis");
const memoryCache = /* @__PURE__ */ new Map();
const memoryClient = {
  get: async (key) => {
    const item = memoryCache.get(key);
    if (item && item.expiresAt > Date.now()) return item.value;
    memoryCache.delete(key);
    return null;
  },
  setEx: async (key, ttl, value) => {
    memoryCache.set(key, { value, expiresAt: Date.now() + ttl * 1e3 });
  },
  del: async (...keys) => {
    keys.forEach((k) => memoryCache.delete(k));
  },
  lPush: async (_key, _value) => {
  },
  rPush: async (_key, _value) => {
  },
  lPop: async (_key) => null,
  lTrim: async (_key, _start, _stop) => {
  },
  keys: async (_pattern) => [],
  sadd: async (_key, ..._members) => 0,
  smembers: async (_key) => [],
  ping: async () => "PONG",
  on: () => {
  },
  connect: async () => {
  }
};
let _connected = false;
let activeClient = memoryClient;
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  const realClient = (0, import_redis.createClient)({ url: redisUrl });
  realClient.on("connect", () => {
    _connected = true;
    activeClient = realClient;
    console.log("[Redis] Connected to Upstash Redis");
  });
  realClient.on("error", (err) => {
    if (_connected) {
      _connected = false;
      activeClient = memoryClient;
      console.error("[Redis] Lost connection, falling back to in-memory:", err.message);
    }
  });
  realClient.connect().catch((err) => {
    console.error("[Redis] \u26A0\uFE0F  Initial connect FAILED \u2014 cache will NOT persist across requests! All LLM forecast calls will re-run on every request. Error:", err.message);
  });
} else {
  console.warn("[Redis] \u26A0\uFE0F  No REDIS_URL set \u2014 using in-memory fallback. Cache lost on every restart. All LLM forecast calls will re-run after restarts.");
}
const redisClient = new Proxy(memoryClient, {
  get(_target, prop) {
    const value = activeClient[prop];
    if (typeof value === "function") {
      return value.bind(activeClient);
    }
    return value;
  }
});
function isRedisConnected() {
  return _connected;
}
const SESSION_CONTEXT_TTL = 24 * 60 * 60;
const MAX_CONTEXT_MESSAGES = 10;
const SUMMARY_THRESHOLD = 20;
async function storeSessionContext(sessionId, userId, messages, summary) {
  const key = `chat_context:${sessionId}`;
  const context = {
    sessionId,
    userId,
    recentMessages: messages.slice(-MAX_CONTEXT_MESSAGES),
    messageCount: messages.length,
    summary: summary || null,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  await redisClient.setEx(key, SESSION_CONTEXT_TTL, JSON.stringify(context));
}
async function getSessionContext(sessionId) {
  const key = `chat_context:${sessionId}`;
  const data = await redisClient.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
async function updateSessionSummary(sessionId, summary) {
  const existing = await getSessionContext(sessionId);
  if (existing) {
    const key = `chat_context:${sessionId}`;
    existing.summary = summary;
    existing.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    await redisClient.setEx(key, SESSION_CONTEXT_TTL, JSON.stringify(existing));
  }
}
async function clearSessionContext(sessionId) {
  const key = `chat_context:${sessionId}`;
  await redisClient.del(key);
}
async function clearUserSessionContexts(userId) {
  const pattern = `chat_context:*`;
  const keys = await redisClient.keys(pattern);
  const userContextKeys = [];
  for (const key of keys) {
    const data = await redisClient.get(key);
    if (data) {
      try {
        const context = JSON.parse(data);
        if (context.userId === userId) {
          userContextKeys.push(key);
        }
      } catch {
      }
    }
  }
  if (userContextKeys.length > 0) {
    await redisClient.del(userContextKeys);
  }
}
async function storeResetToken(token, userId) {
  const key = `reset_token:${token}`;
  await redisClient.setEx(key, 86400, userId);
}
async function getResetToken(token) {
  const key = `reset_token:${token}`;
  return await redisClient.get(key);
}
async function invalidateResetToken(token) {
  const key = `reset_token:${token}`;
  await redisClient.del(key);
}
async function invalidateUserSessions(userId) {
  try {
    const setKey = `user_sessions:${userId}`;
    const sessionIds = await redisClient.smembers(setKey);
    if (sessionIds.length > 0) {
      const contextKeys = sessionIds.map((id) => `chat_context:${id}`);
      await redisClient.del(setKey, ...contextKeys);
    }
  } catch (err) {
    console.error("[Redis] invalidateUserSessions error:", err);
  }
}
var redis_default = redisClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clearSessionContext,
  clearUserSessionContexts,
  getResetToken,
  getSessionContext,
  invalidateResetToken,
  invalidateUserSessions,
  isRedisConnected,
  redisClient,
  storeResetToken,
  storeSessionContext,
  updateSessionSummary
});
