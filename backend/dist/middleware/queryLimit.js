"use strict";
/**
 * Rate Limit Middleware
 * - FREE tier: message-count daily limit (3 questions/day, tracked in Redis, limit from AdminConfig)
 * - Admin accounts: unlimited always
 * - PRO/PREMIUM: burst rate limit only (requests per minute)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementQueryCount = incrementQueryCount;
exports.checkQueryLimit = checkQueryLimit;
exports.queryLimitMiddleware = queryLimitMiddleware;
exports.getUserUsageStats = getUserUsageStats;
exports.getDailyQueryRedisKey = getDailyQueryRedisKey;
exports.getFreeTierDailyQueryLimit = getFreeTierDailyQueryLimit;
exports.getDailyQueriesUsed = getDailyQueriesUsed;
exports.incrementDailyQuery = incrementDailyQuery;
const prisma_1 = require("../utils/prisma");
const subscription_tiers_1 = require("../config/subscription-tiers");
const redis_1 = require("../utils/redis");
const rateLimitHeaders_1 = require("./rateLimitHeaders");

function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isAdminEmail(email) {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    return adminEmails.includes(email);
}

function getDailyQueryRedisKey(userId) {
    return `queries:daily:${userId}:${getTodayKey()}`;
}

async function getFreeTierDailyQueryLimit() {
    try {
        const config = await prisma_1.prisma.adminConfig.findUnique({
            where: { key: 'free_tier_daily_query_limit' },
        });
        if (config && config.value) {
            const n = parseInt(config.value, 10);
            if (!isNaN(n) && n > 0) return n;
        }
    } catch (_a) {
        // fallback
    }
    return 3;
}

async function getDailyQueriesUsed(userId) {
    const val = await redis_1.redisClient.get(getDailyQueryRedisKey(userId));
    return parseInt(val || '0', 10);
}

async function incrementDailyQuery(userId) {
    const key = getDailyQueryRedisKey(userId);
    const newTotal = await redis_1.redisClient.incr(key);
    if (newTotal === 1) {
        await redis_1.redisClient.expire(key, 26 * 3600);
    }
    return newTotal;
}

async function checkBurstLimit(userId, tier) {
    if ((0, subscription_tiers_1.isUnlimitedBurst)(tier)) {
        return { allowed: true, remaining: 'unlimited', retryAfter: 0 };
    }
    const burstLimit = (0, subscription_tiers_1.getBurstLimit)(tier);
    const burstKey = `ratelimit:burst:${userId}`;
    const currentCount = parseInt(await redis_1.redisClient.get(burstKey) || '0', 10);
    if (currentCount >= burstLimit) {
        const ttl = await redis_1.redisClient.ttl(burstKey);
        return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : 60 };
    }
    return { allowed: true, remaining: burstLimit - currentCount - 1, retryAfter: 0 };
}

async function incrementBurstCounter(userId, tier) {
    if ((0, subscription_tiers_1.isUnlimitedBurst)(tier)) return;
    const burstKey = `ratelimit:burst:${userId}`;
    const count = await redis_1.redisClient.incr(burstKey);
    if (count === 1) await redis_1.redisClient.expire(burstKey, 60);
}

async function queryLimitMiddleware(req, res, next) {
    try {
        const userId = req.user && req.user.id;
        const userEmail = (req.user && req.user.email) || '';
        const userTier = (req.user && req.user.tier) || 'FREE';
        const userLanguage = (req.user && req.user.language) || 'bg';
        if (!userId) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
            return;
        }
        // Admin accounts: unlimited always
        if (isAdminEmail(userEmail)) {
            req.queryLimit = { allowed: true, unlimited: true };
            next();
            return;
        }
        // PRO/PREMIUM: burst limit only
        if ((0, subscription_tiers_1.isUnlimitedTier)(userTier)) {
            const burst = await checkBurstLimit(userId, userTier);
            if (!burst.allowed) {
                res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.RETRY_AFTER, burst.retryAfter);
                res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.TIER, userTier);
                res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: userLanguage === 'en'
                            ? 'Too many requests. Please wait a moment before continuing.'
                            : 'Твърде много заявки. Моля, изчакайте малко.',
                        limitType: 'burst',
                        retryAfter: burst.retryAfter,
                    },
                });
                return;
            }
            await incrementBurstCounter(userId, userTier);
            req.queryLimit = { allowed: true, unlimited: true };
            next();
            return;
        }
        // FREE tier: check daily query limit
        const queriesUsedPromise = getDailyQueriesUsed(userId);
        const queryLimitPromise = getFreeTierDailyQueryLimit();
        const [queriesUsed, queryLimit] = await Promise.all([queriesUsedPromise, queryLimitPromise]);
        if (queriesUsed >= queryLimit) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const retryAfter = Math.ceil((tomorrow.getTime() - Date.now()) / 1000);
            res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
            res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.TIER, userTier);
            res.status(429).json({
                success: false,
                error: {
                    code: 'DAILY_LIMIT_REACHED',
                    message: userLanguage === 'en'
                        ? 'You\'ve used your 3 free questions for today. Resets at midnight.'
                        : 'Използвахте 3-те си безплатни въпроса за днес. Нулира се в полунощ.',
                    limitType: 'daily_queries',
                    retryAfter,
                    upgradeUrl: '/pricing',
                },
            });
            return;
        }
        // Also check burst for FREE
        await checkBurstLimit(userId, userTier); // non-blocking, ignore result for FREE
        req.queryLimit = { allowed: true, queriesUsed, queryLimit };
        next();
    } catch (error) {
        console.error('[RateLimit] Error:', error);
        res.status(503).json({
            success: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' },
        });
    }
}

async function getUserUsageStats(userId, tier) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if ((0, subscription_tiers_1.isUnlimitedTier)(tier)) {
        return { used: 0, limit: 'unlimited', remaining: 'unlimited', resetAt: tomorrow.toISOString(), percentage: null };
    }
    const usedPromise = getDailyQueriesUsed(userId);
    const limitPromise = getFreeTierDailyQueryLimit();
    const [used, limit] = await Promise.all([usedPromise, limitPromise]);
    const remaining = Math.max(0, limit - used);
    const percentage = Math.min(100, Math.round((used / limit) * 100));
    return { used, limit, remaining, resetAt: tomorrow.toISOString(), percentage };
}

async function checkQueryLimit(userId, tier) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return { allowed: true, monthlyUsed: 0, monthlyLimit: 'unlimited', monthlyRemaining: 'unlimited', burstRemaining: 'unlimited', resetAt: tomorrow, retryAfter: 0 };
}

async function incrementQueryCount(_userId, _tier) {
    return { newCount: 0, month: '' };
}

exports.default = { queryLimitMiddleware, getUserUsageStats, checkQueryLimit, incrementQueryCount };
//# sourceMappingURL=queryLimit.js.map
