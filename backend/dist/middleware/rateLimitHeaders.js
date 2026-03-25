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
var rateLimitHeaders_exports = {};
__export(rateLimitHeaders_exports, {
  RATE_LIMIT_HEADERS: () => RATE_LIMIT_HEADERS,
  createRateLimitErrorResponse: () => createRateLimitErrorResponse,
  createWebSocketRateLimitError: () => createWebSocketRateLimitError,
  default: () => rateLimitHeaders_default,
  fetchRateLimitStatus: () => fetchRateLimitStatus,
  rateLimitHeadersMiddleware: () => rateLimitHeadersMiddleware
});
module.exports = __toCommonJS(rateLimitHeaders_exports);
var import_subscription_tiers = require("../config/subscription-tiers");
var import_redis = require("../utils/redis");
var import_prisma = require("../utils/prisma");
const RATE_LIMIT_HEADERS = {
  LIMIT: "X-RateLimit-Limit",
  REMAINING: "X-RateLimit-Remaining",
  RESET: "X-RateLimit-Reset",
  RETRY_AFTER: "Retry-After",
  TIER: "X-RateLimit-Tier"
};
function getCurrentMonth() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
async function getBurstStatus(userId, tier) {
  const burstLimit = (0, import_subscription_tiers.getBurstLimit)(tier);
  if (burstLimit === -1 || (0, import_subscription_tiers.isUnlimitedBurst)(tier)) {
    return { used: 0, limit: -1, remaining: -1, resetAt: new Date(Date.now() + 6e4) };
  }
  const burstKey = `ratelimit:burst:${userId}`;
  const currentCount = parseInt(await import_redis.redisClient.get(burstKey) || "0", 10);
  const ttl = await import_redis.redisClient.ttl(burstKey);
  const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : 60) * 1e3);
  return {
    used: currentCount,
    limit: burstLimit,
    remaining: Math.max(0, burstLimit - currentCount),
    resetAt
  };
}
async function getMonthlyStatus(userId, tier) {
  if ((0, import_subscription_tiers.isUnlimitedTier)(tier)) {
    return { used: 0, limit: -1, remaining: -1, resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3) };
  }
  const monthlyLimit = (0, import_subscription_tiers.getMonthlyQueryLimit)(tier);
  const month = getCurrentMonth();
  const record = await import_prisma.prisma.usageRecord.findUnique({
    where: { userId_month: { userId, month } }
  });
  const used = record?.queryCount ?? 0;
  const now = /* @__PURE__ */ new Date();
  const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    used,
    limit: monthlyLimit,
    remaining: Math.max(0, monthlyLimit - used),
    resetAt
  };
}
async function rateLimitHeadersMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    try {
      const userId = req.user?.id;
      const userTier = req.user?.tier || "FREE";
      if (userId) {
        const rateLimitInfo = req.rateLimit;
        if (rateLimitInfo?.burst && rateLimitInfo?.monthly) {
          const { burst, monthly } = rateLimitInfo;
          const limit = burst.limit === -1 ? "unlimited" : burst.limit;
          const remaining = burst.remaining === -1 ? "unlimited" : burst.remaining;
          const reset = Math.floor(burst.resetAt.getTime() / 1e3);
          res.setHeader(RATE_LIMIT_HEADERS.LIMIT, limit);
          res.setHeader(RATE_LIMIT_HEADERS.REMAINING, remaining);
          res.setHeader(RATE_LIMIT_HEADERS.RESET, reset);
          res.setHeader(RATE_LIMIT_HEADERS.TIER, userTier);
          if (monthly.limit !== -1) {
            res.setHeader("X-RateLimit-Monthly-Limit", monthly.limit);
            res.setHeader("X-RateLimit-Monthly-Remaining", monthly.remaining);
          }
        }
      }
    } catch (err) {
      console.error("[RateLimitHeaders] Error adding headers:", err);
    }
    return originalJson(body);
  };
  next();
}
async function fetchRateLimitStatus(req, res, next) {
  const userId = req.user?.id;
  const userTier = req.user?.tier || "FREE";
  if (!userId) {
    next();
    return;
  }
  try {
    const [burst, monthly] = await Promise.all([
      getBurstStatus(userId, userTier),
      getMonthlyStatus(userId, userTier)
    ]);
    req.rateLimit = { burst, monthly };
    next();
  } catch (error) {
    console.error("[RateLimitHeaders] Error fetching status:", error);
    next();
  }
}
function createRateLimitErrorResponse(res, options) {
  const {
    retryAfter,
    limit,
    remaining,
    resetAt,
    limitType,
    tier,
    language = "bg",
    monthlyInfo
  } = options;
  res.setHeader(RATE_LIMIT_HEADERS.LIMIT, limit);
  res.setHeader(RATE_LIMIT_HEADERS.REMAINING, remaining);
  res.setHeader(RATE_LIMIT_HEADERS.RESET, Math.floor(resetAt.getTime() / 1e3));
  res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
  res.setHeader(RATE_LIMIT_HEADERS.TIER, tier);
  if (monthlyInfo) {
    res.setHeader("X-RateLimit-Monthly-Limit", monthlyInfo.limit);
    res.setHeader("X-RateLimit-Monthly-Remaining", monthlyInfo.remaining);
  }
  const message = limitType === "burst" ? language === "bg" ? "\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u044F\u0432\u043A\u0438. \u041C\u043E\u043B\u044F, \u0438\u0437\u0447\u0430\u043A\u0430\u0439\u0442\u0435 \u043C\u0430\u043B\u043A\u043E." : "Too many requests. Please wait a moment." : language === "bg" ? `\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0430\u0445\u0442\u0435 \u043B\u0438\u043C\u0438\u0442\u0430 \u043E\u0442 ${monthlyInfo?.limit ?? limit} \u0432\u044A\u043F\u0440\u043E\u0441\u0430 \u0437\u0430 \u0442\u043E\u0437\u0438 \u043C\u0435\u0441\u0435\u0446. \u041D\u0430\u0434\u0433\u0440\u0430\u0434\u0435\u0442\u0435 \u0434\u043E Pro \u0437\u0430 \u043D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438 \u0432\u044A\u043F\u0440\u043E\u0441\u0438.` : `You've reached your monthly limit of ${monthlyInfo?.limit ?? limit} queries. Upgrade to Pro for unlimited queries.`;
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message,
      limitType,
      retryAfter,
      limit,
      remaining,
      resetAt: resetAt.toISOString(),
      upgradeUrl: tier === "FREE" ? "/subscription/plans" : void 0
    }
  });
}
function createWebSocketRateLimitError(options) {
  const {
    retryAfter,
    limit,
    remaining,
    resetAt,
    limitType,
    tier,
    language = "bg",
    conversationId
  } = options;
  const message = limitType === "burst" ? language === "bg" ? "\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u044F\u0432\u043A\u0438. \u041C\u043E\u043B\u044F, \u0438\u0437\u0447\u0430\u043A\u0430\u0439\u0442\u0435 \u043C\u0430\u043B\u043A\u043E." : "Too many requests. Please wait a moment." : language === "bg" ? `\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0430\u0445\u0442\u0435 \u043B\u0438\u043C\u0438\u0442\u0430 \u043E\u0442 ${limit} \u0432\u044A\u043F\u0440\u043E\u0441\u0430 \u0437\u0430 \u0442\u043E\u0437\u0438 \u043C\u0435\u0441\u0435\u0446.` : `You've reached your monthly limit of ${limit} queries.`;
  return {
    type: "chat:error",
    payload: {
      code: "RATE_LIMIT_EXCEEDED",
      message,
      retryAfter,
      limit,
      remaining,
      resetAt: resetAt.toISOString(),
      limitType,
      conversationId
    }
  };
}
var rateLimitHeaders_default = {
  rateLimitHeadersMiddleware,
  fetchRateLimitStatus,
  createRateLimitErrorResponse,
  createWebSocketRateLimitError,
  RATE_LIMIT_HEADERS
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RATE_LIMIT_HEADERS,
  createRateLimitErrorResponse,
  createWebSocketRateLimitError,
  fetchRateLimitStatus,
  rateLimitHeadersMiddleware
});
