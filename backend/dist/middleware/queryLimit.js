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
var queryLimit_exports = {};
__export(queryLimit_exports, {
  checkQueryLimit: () => checkQueryLimit,
  default: () => queryLimit_default,
  getDailyQueriesUsed: () => getDailyQueriesUsed,
  getDailyQueryRedisKey: () => getDailyQueryRedisKey,
  getFreeTierDailyQueryLimit: () => getFreeTierDailyQueryLimit,
  getUserUsageStats: () => getUserUsageStats,
  incrementDailyQuery: () => incrementDailyQuery,
  incrementQueryCount: () => incrementQueryCount,
  queryLimitMiddleware: () => queryLimitMiddleware
});
module.exports = __toCommonJS(queryLimit_exports);
var import_prisma = require("../utils/prisma");
var import_subscription_tiers = require("../config/subscription-tiers");
var import_redis = require("../utils/redis");
var import_rateLimitHeaders = require("./rateLimitHeaders");
function getTodayKey() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function isAdminEmail(email) {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
  return adminEmails.includes(email);
}
function getDailyQueryRedisKey(userId) {
  return `queries:daily:${userId}:${getTodayKey()}`;
}
async function getFreeTierDailyQueryLimit() {
  try {
    const config = await import_prisma.prisma.adminConfig.findUnique({
      where: { key: "free_tier_daily_query_limit" }
    });
    if (config?.value) {
      const n = parseInt(config.value, 10);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {
  }
  return 3;
}
async function getDailyQueriesUsed(userId) {
  const val = await import_redis.redisClient.get(getDailyQueryRedisKey(userId));
  return parseInt(val || "0", 10);
}
async function incrementDailyQuery(userId) {
  const key = getDailyQueryRedisKey(userId);
  const newTotal = await import_redis.redisClient.incr(key);
  if (newTotal === 1) {
    await import_redis.redisClient.expire(key, 26 * 3600);
  }
  return newTotal;
}
async function checkBurstLimit(userId, tier) {
  if ((0, import_subscription_tiers.isUnlimitedBurst)(tier)) {
    return { allowed: true, remaining: "unlimited", retryAfter: 0 };
  }
  const burstLimit = (0, import_subscription_tiers.getBurstLimit)(tier);
  const burstKey = `ratelimit:burst:${userId}`;
  const currentCount = parseInt(await import_redis.redisClient.get(burstKey) || "0", 10);
  if (currentCount >= burstLimit) {
    const ttl = await import_redis.redisClient.ttl(burstKey);
    return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : 60 };
  }
  return { allowed: true, remaining: burstLimit - currentCount - 1, retryAfter: 0 };
}
async function incrementBurstCounter(userId, tier) {
  if ((0, import_subscription_tiers.isUnlimitedBurst)(tier)) return;
  const burstKey = `ratelimit:burst:${userId}`;
  const count = await import_redis.redisClient.incr(burstKey);
  if (count === 1) await import_redis.redisClient.expire(burstKey, 60);
}
async function queryLimitMiddleware(req, res, next) {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email || "";
    const userTier = req.user?.tier || "FREE";
    const userLanguage = req.user?.language || "bg";
    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    if (isAdminEmail(userEmail)) {
      req.queryLimit = { allowed: true, unlimited: true };
      next();
      return;
    }
    if ((0, import_subscription_tiers.isUnlimitedTier)(userTier)) {
      const burst = await checkBurstLimit(userId, userTier);
      if (!burst.allowed) {
        res.setHeader(import_rateLimitHeaders.RATE_LIMIT_HEADERS.RETRY_AFTER, burst.retryAfter);
        res.setHeader(import_rateLimitHeaders.RATE_LIMIT_HEADERS.TIER, userTier);
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: userLanguage === "en" ? "Too many requests. Please wait a moment before continuing." : "\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u044F\u0432\u043A\u0438. \u041C\u043E\u043B\u044F, \u0438\u0437\u0447\u0430\u043A\u0430\u0439\u0442\u0435 \u043C\u0430\u043B\u043A\u043E.",
            limitType: "burst",
            retryAfter: burst.retryAfter
          }
        });
        return;
      }
      await incrementBurstCounter(userId, userTier);
      req.queryLimit = { allowed: true, unlimited: true };
      next();
      return;
    }
    const [queriesUsed, queryLimit] = await Promise.all([
      getDailyQueriesUsed(userId),
      getFreeTierDailyQueryLimit()
    ]);
    if (queriesUsed >= queryLimit) {
      const tomorrow = /* @__PURE__ */ new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const retryAfter = Math.ceil((tomorrow.getTime() - Date.now()) / 1e3);
      res.setHeader(import_rateLimitHeaders.RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
      res.setHeader(import_rateLimitHeaders.RATE_LIMIT_HEADERS.TIER, userTier);
      res.status(429).json({
        success: false,
        error: {
          code: "DAILY_LIMIT_REACHED",
          message: userLanguage === "en" ? "You've used your 3 free questions for today. Resets at midnight." : "\u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0445\u0442\u0435 3-\u0442\u0435 \u0441\u0438 \u0431\u0435\u0437\u043F\u043B\u0430\u0442\u043D\u0438 \u0432\u044A\u043F\u0440\u043E\u0441\u0430 \u0437\u0430 \u0434\u043D\u0435\u0441. \u041D\u0443\u043B\u0438\u0440\u0430 \u0441\u0435 \u0432 \u043F\u043E\u043B\u0443\u043D\u043E\u0449.",
          limitType: "daily_queries",
          retryAfter,
          upgradeUrl: "/pricing"
        }
      });
      return;
    }
    await checkBurstLimit(userId, userTier);
    req.queryLimit = { allowed: true, queriesUsed, queryLimit };
    next();
  } catch (error) {
    console.error("[RateLimit] Error:", error);
    res.status(503).json({
      success: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable. Please try again." }
    });
  }
}
async function getUserUsageStats(userId, tier) {
  const tomorrow = /* @__PURE__ */ new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  if ((0, import_subscription_tiers.isUnlimitedTier)(tier)) {
    return { used: 0, limit: "unlimited", remaining: "unlimited", resetAt: tomorrow.toISOString(), percentage: null };
  }
  const [used, limit] = await Promise.all([
    getDailyQueriesUsed(userId),
    getFreeTierDailyQueryLimit()
  ]);
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, Math.round(used / limit * 100));
  return { used, limit, remaining, resetAt: tomorrow.toISOString(), percentage };
}
async function checkQueryLimit(userId, tier) {
  const tomorrow = /* @__PURE__ */ new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return { allowed: true, monthlyUsed: 0, monthlyLimit: "unlimited", monthlyRemaining: "unlimited", burstRemaining: "unlimited", resetAt: tomorrow, retryAfter: 0 };
}
async function incrementQueryCount(_userId, _tier) {
  return { newCount: 0, month: "" };
}
var queryLimit_default = { queryLimitMiddleware, getUserUsageStats, checkQueryLimit, incrementQueryCount };
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkQueryLimit,
  getDailyQueriesUsed,
  getDailyQueryRedisKey,
  getFreeTierDailyQueryLimit,
  getUserUsageStats,
  incrementDailyQuery,
  incrementQueryCount,
  queryLimitMiddleware
});
