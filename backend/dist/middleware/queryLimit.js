"use strict";
/**
 * Query Limit Middleware
 * US-36: Free-tier Query Limit Enforcement
 * US-37: API Rate-Limit Burst/Retry Behavior
 *
 * Middleware that checks if user has remaining queries before allowing access
 * Works with both HTTP and WebSocket connections
 *
 * Features:
 * - Monthly query limits per tier
 * - Burst rate limiting (requests per minute)
 * - 429 responses with Retry-After header
 * - Bulgarian & English error messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementQueryCount = incrementQueryCount;
exports.checkQueryLimit = checkQueryLimit;
exports.queryLimitMiddleware = queryLimitMiddleware;
exports.getUserUsageStats = getUserUsageStats;
const prisma_1 = require("../utils/prisma");
const subscription_tiers_1 = require("../config/subscription-tiers");
const redis_1 = require("../utils/redis");
const rateLimitHeaders_1 = require("./rateLimitHeaders");
/**
 * Get current month string in YYYY-MM format
 */
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
/**
 * Get next reset date (first day of next month)
 */
function getNextResetDate() {
    const now = new Date();
    const resetDay = (0, subscription_tiers_1.getMonthlyResetDay)();
    // If we're past the reset day this month, next reset is next month
    if (now.getDate() >= resetDay) {
        return new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
    }
    // Otherwise, reset is this month
    return new Date(now.getFullYear(), now.getMonth(), resetDay);
}
/**
 * Check burst rate limit (requests per minute)
 * US-37: PREMIUM tier has unlimited burst
 */
async function checkBurstLimit(userId, tier) {
    // US-37: PREMIUM tier has unlimited burst
    if ((0, subscription_tiers_1.isUnlimitedBurst)(tier)) {
        return {
            allowed: true,
            remaining: 'unlimited',
            resetAt: new Date(Date.now() + 60000),
            retryAfter: 0,
        };
    }
    const burstLimit = (0, subscription_tiers_1.getBurstLimit)(tier);
    const burstKey = `ratelimit:burst:${userId}`;
    const windowSeconds = 60;
    const currentCount = parseInt(await redis_1.redisClient.get(burstKey) || '0', 10);
    if (currentCount >= burstLimit) {
        const ttl = await redis_1.redisClient.ttl(burstKey);
        const retryAfter = ttl > 0 ? ttl : windowSeconds;
        const resetAt = new Date(Date.now() + retryAfter * 1000);
        return { allowed: false, remaining: 0, resetAt, retryAfter };
    }
    return {
        allowed: true,
        remaining: burstLimit - currentCount - 1,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
        retryAfter: 0,
    };
}
/**
 * Increment burst counter
 */
async function incrementBurstCounter(userId, tier) {
    // Don't increment for unlimited burst tiers
    if ((0, subscription_tiers_1.isUnlimitedBurst)(tier)) {
        return;
    }
    const burstKey = `ratelimit:burst:${userId}`;
    const count = await redis_1.redisClient.incr(burstKey);
    // Set expiry on first increment
    if (count === 1) {
        await redis_1.redisClient.expire(burstKey, 60); // 60 seconds window
    }
}
/**
 * Get or create usage record for current month
 */
async function getOrCreateUsageRecord(userId) {
    const month = getCurrentMonth();
    const record = await prisma_1.prisma.usageRecord.findUnique({
        where: {
            userId_month: { userId, month },
        },
    });
    return {
        queryCount: record?.queryCount ?? 0,
        month,
    };
}
/**
 * Increment query count in database
 */
async function incrementQueryCount(userId, tier) {
    const month = getCurrentMonth();
    const record = await prisma_1.prisma.usageRecord.upsert({
        where: {
            userId_month: { userId, month },
        },
        create: {
            userId,
            month,
            queryCount: 1,
        },
        update: {
            queryCount: { increment: 1 },
        },
    });
    // Custom logic for daily limits and bonus queries on Free tier
    if (tier === 'FREE') {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const now = new Date();
            const last = user.lastQueryDate;
            const isNewDay = !last || (last.getDate() !== now.getDate() || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear());
            const currentDaily = isNewDay ? 0 : user.dailyQueryCount;
            let nextDaily = currentDaily + 1;
            let nextBonus = user.bonusQueries;
            if (nextDaily > 4 && nextBonus > 0) {
                nextBonus -= 1; // Used a bonus query
            }
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: {
                    dailyQueryCount: isNewDay ? 1 : { increment: 1 },
                    lastQueryDate: now,
                    bonusQueries: nextBonus
                }
            });
        }
    }
    // Also increment burst counter
    await incrementBurstCounter(userId, tier);
    return { newCount: record.queryCount, month };
}
/**
 * Check if user has remaining queries for this month
 * Returns full status info for both monthly and burst limits
 * US-37: Includes retryAfter for 429 responses
 */
async function checkQueryLimit(userId, tier) {
    // Unlimited tiers always allowed (but still check burst if not unlimited)
    if ((0, subscription_tiers_1.isUnlimitedTier)(tier)) {
        const burst = await checkBurstLimit(userId, tier);
        return {
            allowed: burst.allowed,
            monthlyUsed: 0,
            monthlyLimit: 'unlimited',
            monthlyRemaining: 'unlimited',
            burstRemaining: burst.remaining,
            resetAt: burst.resetAt,
            retryAfter: burst.retryAfter,
            limitType: burst.allowed ? undefined : 'burst',
            warningAt80Percent: false, // No warning for unlimited tiers
        };
    }
    // Check monthly limit
    const { queryCount } = await getOrCreateUsageRecord(userId);
    const monthlyLimit = (0, subscription_tiers_1.getEffectiveMonthlyLimit)(tier);
    const resetAt = getNextResetDate();
    // Check burst limit first
    const burst = await checkBurstLimit(userId, tier);
    if (!burst.allowed) {
        return {
            allowed: false,
            monthlyUsed: queryCount,
            monthlyLimit,
            monthlyRemaining: Math.max(0, monthlyLimit - queryCount),
            burstRemaining: 0,
            resetAt: burst.resetAt,
            retryAfter: burst.retryAfter,
            limitType: 'burst',
        };
    }
    // Check daily limit and bonus for FREE tier
    if (tier === 'FREE') {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const now = new Date();
            const last = user.lastQueryDate;
            const isNewDay = !last || (last.getDate() !== now.getDate() || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear());
            const currentDaily = isNewDay ? 0 : user.dailyQueryCount;
            const bonus = user.bonusQueries;
            if (currentDaily >= 4 && bonus <= 0) {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                return {
                    allowed: false,
                    monthlyUsed: queryCount,
                    monthlyLimit,
                    monthlyRemaining: Math.max(0, monthlyLimit - queryCount),
                    burstRemaining: burst.remaining,
                    resetAt: tomorrow,
                    retryAfter: Math.ceil((tomorrow.getTime() - now.getTime()) / 1000),
                    limitType: 'daily'
                };
            }
        }
    }
    // Check monthly limit
    if (queryCount >= monthlyLimit) {
        // Calculate retry after for monthly reset
        const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
        return {
            allowed: false,
            monthlyUsed: queryCount,
            monthlyLimit,
            monthlyRemaining: 0,
            burstRemaining: burst.remaining,
            resetAt,
            retryAfter,
            limitType: 'monthly',
        };
    }
    return {
        allowed: true,
        monthlyUsed: queryCount,
        monthlyLimit,
        monthlyRemaining: monthlyLimit - queryCount,
        burstRemaining: burst.remaining,
        resetAt,
        retryAfter: 0,
        warningAt80Percent: queryCount >= Math.floor(monthlyLimit * 0.8), // US-36: Warning at 80% (40 of 50)
    };
}
/**
 * Error messages in Bulgarian and English
 * US-37: Localized rate limit messages
 */
const RATE_LIMIT_MESSAGES = {
    burst: {
        bg: 'Твърде много заявки за кратко време. Моля, изчакайте малко преди да продължите.',
        en: 'Too many requests in a short time. Please wait a moment before continuing.',
    },
    daily: {
        bg: 'Звездите имат нужда от време, за да се подредят. Достигнахте дневния си космически лимит. Опитайте утре.',
        en: 'The stars need time to align. You\'ve reached your daily cosmic limit. Check back tomorrow.',
    },
    monthly: {
        bg: 'Достигнахте лимита от {limit} въпроса за този месец. Надградете до Pro за неограничени въпроси.',
        en: 'You\'ve reached your monthly limit of {limit} queries. Upgrade to Pro for unlimited queries.',
    },
};
/**
 * Express middleware for query limit checking
 * Use this before routes that consume queries (chat, forecasts, etc.)
 */
async function queryLimitMiddleware(req, res, next) {
    try {
        const userId = req.user?.id;
        const userTier = req.user?.tier || 'FREE';
        const userLanguage = req.user?.language || 'bg';
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const status = await checkQueryLimit(userId, userTier);
        // Add limit info to request for downstream use
        req.queryLimit = status;
        // US-36: Add warning header when approaching limit (80% = 40 of 50 queries)
        if (status.warningAt80Percent && typeof status.monthlyLimit === 'number') {
            const lang = userLanguage === 'en' ? 'en' : 'bg';
            const warningMessage = lang === 'bg'
                ? `Предупреждение: Използвали сте ${status.monthlyUsed} от ${status.monthlyLimit} въпроса този месец.`
                : `Warning: You have used ${status.monthlyUsed} of ${status.monthlyLimit} queries this month.`;
            res.setHeader('X-Query-Warning', warningMessage);
        }
        if (!status.allowed) {
            const tierConfig = (0, subscription_tiers_1.getTierLimits)(userTier);
            const isMonthlyLimit = status.limitType === 'monthly';
            const lang = userLanguage === 'en' ? 'en' : 'bg';
            // US-37: Calculate retryAfter based on limit type
            const retryAfter = status.retryAfter ??
                (isMonthlyLimit
                    ? Math.ceil((status.resetAt.getTime() - Date.now()) / 1000)
                    : 60);
            // US-37: Add rate limit headers
            res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.LIMIT, status.monthlyLimit);
            res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.REMAINING, status.monthlyRemaining);
            res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.RESET, Math.floor(status.resetAt.getTime() / 1000));
            res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
            res.setHeader(rateLimitHeaders_1.RATE_LIMIT_HEADERS.TIER, userTier);
            // US-37: Use localized messages
            const message = status.limitType === 'monthly'
                ? RATE_LIMIT_MESSAGES.monthly[lang].replace('{limit}', String(status.monthlyLimit))
                : status.limitType === 'daily'
                    ? RATE_LIMIT_MESSAGES.daily[lang]
                    : RATE_LIMIT_MESSAGES.burst[lang];
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message,
                    limitType: status.limitType,
                    retryAfter,
                    monthlyUsed: status.monthlyUsed,
                    monthlyLimit: status.monthlyLimit,
                    monthlyRemaining: status.monthlyRemaining,
                    burstRemaining: status.burstRemaining,
                    resetAt: status.resetAt.toISOString(),
                    upgradeUrl: '/subscription/plans',
                    tierName: tierConfig.name[lang],
                },
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('[Query Limit Middleware] Error:', error);
        // On error, allow request through (fail open)
        // This prevents blocking users if there's a database issue
        console.warn('[Query Limit Middleware] Failing open due to error');
        next();
    }
}
/**
 * Helper to get usage stats for a user
 */
async function getUserUsageStats(userId, tier) {
    if ((0, subscription_tiers_1.isUnlimitedTier)(tier)) {
        return {
            used: 0,
            limit: 'unlimited',
            remaining: 'unlimited',
            resetAt: getNextResetDate().toISOString(),
            percentage: null,
        };
    }
    const { queryCount } = await getOrCreateUsageRecord(userId);
    const limit = (0, subscription_tiers_1.getEffectiveMonthlyLimit)(tier);
    const remaining = Math.max(0, limit - queryCount);
    const percentage = limit > 0 ? Math.round((queryCount / limit) * 100) : 0;
    return {
        used: queryCount,
        limit,
        remaining,
        resetAt: getNextResetDate().toISOString(),
        percentage,
    };
}
exports.default = {
    queryLimitMiddleware,
    checkQueryLimit,
    incrementQueryCount,
    getUserUsageStats,
};
//# sourceMappingURL=queryLimit.js.map