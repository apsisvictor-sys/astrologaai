"use strict";
/**
 * Rate Limit Headers Middleware
 * US-37: API Rate-Limit Burst/Retry Behavior
 *
 * Adds standard X-RateLimit-* headers to all API responses
 * Works with both REST and WebSocket connections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMIT_HEADERS = void 0;
exports.rateLimitHeadersMiddleware = rateLimitHeadersMiddleware;
exports.fetchRateLimitStatus = fetchRateLimitStatus;
exports.createRateLimitErrorResponse = createRateLimitErrorResponse;
exports.createWebSocketRateLimitError = createWebSocketRateLimitError;
const subscription_tiers_1 = require("../config/subscription-tiers");
const redis_1 = require("../utils/redis");
const prisma_1 = require("../utils/prisma");
/**
 * Rate limit header names
 */
exports.RATE_LIMIT_HEADERS = {
    LIMIT: 'X-RateLimit-Limit',
    REMAINING: 'X-RateLimit-Remaining',
    RESET: 'X-RateLimit-Reset',
    RETRY_AFTER: 'Retry-After',
    TIER: 'X-RateLimit-Tier',
};
/**
 * Get current month string in YYYY-MM format
 */
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
/**
 * Get burst rate limit status from Redis
 */
async function getBurstStatus(userId, tier) {
    const burstLimit = (0, subscription_tiers_1.getBurstLimit)(tier);
    // Unlimited burst
    if (burstLimit === -1 || (0, subscription_tiers_1.isUnlimitedBurst)(tier)) {
        return { used: 0, limit: -1, remaining: -1, resetAt: new Date(Date.now() + 60000) };
    }
    const burstKey = `ratelimit:burst:${userId}`;
    const currentCount = parseInt(await redis_1.redisClient.get(burstKey) || '0', 10);
    const ttl = await redis_1.redisClient.ttl(burstKey);
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : 60) * 1000);
    return {
        used: currentCount,
        limit: burstLimit,
        remaining: Math.max(0, burstLimit - currentCount),
        resetAt,
    };
}
/**
 * Get monthly query limit status from database
 */
async function getMonthlyStatus(userId, tier) {
    // Unlimited tier
    if ((0, subscription_tiers_1.isUnlimitedTier)(tier)) {
        return { used: 0, limit: -1, remaining: -1, resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    }
    const monthlyLimit = (0, subscription_tiers_1.getMonthlyQueryLimit)(tier);
    const month = getCurrentMonth();
    const record = await prisma_1.prisma.usageRecord.findUnique({
        where: { userId_month: { userId, month } },
    });
    const used = record?.queryCount ?? 0;
    // Calculate next reset date (1st of next month)
    const now = new Date();
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
        used,
        limit: monthlyLimit,
        remaining: Math.max(0, monthlyLimit - used),
        resetAt,
    };
}
/**
 * Middleware to add rate limit headers to all responses
 * Must be placed after auth middleware
 */
async function rateLimitHeadersMiddleware(req, res, next) {
    // Store original json function
    const originalJson = res.json.bind(res);
    // Override json function to add headers
    res.json = function (body) {
        try {
            // Add rate limit headers if user is authenticated
            const userId = req.user?.id;
            const userTier = req.user?.tier || 'FREE';
            if (userId) {
                // Use cached rate limit info if available
                const rateLimitInfo = req.rateLimit;
                if (rateLimitInfo?.burst && rateLimitInfo?.monthly) {
                    const { burst, monthly } = rateLimitInfo;
                    // Use burst limit for immediate rate limiting
                    const limit = burst.limit === -1 ? 'unlimited' : burst.limit;
                    const remaining = burst.remaining === -1 ? 'unlimited' : burst.remaining;
                    const reset = Math.floor(burst.resetAt.getTime() / 1000);
                    res.setHeader(exports.RATE_LIMIT_HEADERS.LIMIT, limit);
                    res.setHeader(exports.RATE_LIMIT_HEADERS.REMAINING, remaining);
                    res.setHeader(exports.RATE_LIMIT_HEADERS.RESET, reset);
                    res.setHeader(exports.RATE_LIMIT_HEADERS.TIER, userTier);
                    // Add monthly info for informational purposes
                    if (monthly.limit !== -1) {
                        res.setHeader('X-RateLimit-Monthly-Limit', monthly.limit);
                        res.setHeader('X-RateLimit-Monthly-Remaining', monthly.remaining);
                    }
                }
            }
        }
        catch (err) {
            console.error('[RateLimitHeaders] Error adding headers:', err);
        }
        return originalJson(body);
    };
    next();
}
/**
 * Middleware to fetch rate limit status and attach to request
 * Use this before routes that need rate limit info
 */
async function fetchRateLimitStatus(req, res, next) {
    const userId = req.user?.id;
    const userTier = req.user?.tier || 'FREE';
    if (!userId) {
        next();
        return;
    }
    try {
        const [burst, monthly] = await Promise.all([
            getBurstStatus(userId, userTier),
            getMonthlyStatus(userId, userTier),
        ]);
        req.rateLimit = { burst, monthly };
        next();
    }
    catch (error) {
        console.error('[RateLimitHeaders] Error fetching status:', error);
        // Continue without rate limit info
        next();
    }
}
/**
 * Helper to create a 429 response with proper headers
 */
function createRateLimitErrorResponse(res, options) {
    const { retryAfter, limit, remaining, resetAt, limitType, tier, language = 'bg', monthlyInfo, } = options;
    // Set rate limit headers
    res.setHeader(exports.RATE_LIMIT_HEADERS.LIMIT, limit);
    res.setHeader(exports.RATE_LIMIT_HEADERS.REMAINING, remaining);
    res.setHeader(exports.RATE_LIMIT_HEADERS.RESET, Math.floor(resetAt.getTime() / 1000));
    res.setHeader(exports.RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
    res.setHeader(exports.RATE_LIMIT_HEADERS.TIER, tier);
    // Add monthly info if available
    if (monthlyInfo) {
        res.setHeader('X-RateLimit-Monthly-Limit', monthlyInfo.limit);
        res.setHeader('X-RateLimit-Monthly-Remaining', monthlyInfo.remaining);
    }
    // Create response body
    const message = limitType === 'burst'
        ? (language === 'bg'
            ? 'Твърде много заявки. Моля, изчакайте малко.'
            : 'Too many requests. Please wait a moment.')
        : (language === 'bg'
            ? `Достигнахте лимита от ${monthlyInfo?.limit ?? limit} въпроса за този месец. Надградете до Pro за неограничени въпроси.`
            : `You've reached your monthly limit of ${monthlyInfo?.limit ?? limit} queries. Upgrade to Pro for unlimited queries.`);
    res.status(429).json({
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            limitType,
            retryAfter,
            limit,
            remaining,
            resetAt: resetAt.toISOString(),
            upgradeUrl: tier === 'FREE' ? '/subscription/plans' : undefined,
        },
    });
}
/**
 * WebSocket rate limit response helper
 */
function createWebSocketRateLimitError(options) {
    const { retryAfter, limit, remaining, resetAt, limitType, tier, language = 'bg', conversationId, } = options;
    const message = limitType === 'burst'
        ? (language === 'bg'
            ? 'Твърде много заявки. Моля, изчакайте малко.'
            : 'Too many requests. Please wait a moment.')
        : (language === 'bg'
            ? `Достигнахте лимита от ${limit} въпроса за този месец.`
            : `You've reached your monthly limit of ${limit} queries.`);
    return {
        type: 'chat:error',
        payload: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter,
            limit,
            remaining,
            resetAt: resetAt.toISOString(),
            limitType,
            conversationId,
        },
    };
}
exports.default = {
    rateLimitHeadersMiddleware,
    fetchRateLimitStatus,
    createRateLimitErrorResponse,
    createWebSocketRateLimitError,
    RATE_LIMIT_HEADERS: exports.RATE_LIMIT_HEADERS,
};
//# sourceMappingURL=rateLimitHeaders.js.map