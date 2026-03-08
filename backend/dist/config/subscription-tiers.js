"use strict";
/**
 * Subscription Tier Configuration
 * US-36: Free-tier Query Limit Enforcement
 * US-37: API Rate-Limit Burst/Retry Behavior
 *
 * Defines limits and features for each subscription tier
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_CONFIG = void 0;
exports.getTierLimits = getTierLimits;
exports.isUnlimitedTier = isUnlimitedTier;
exports.getMonthlyQueryLimit = getMonthlyQueryLimit;
exports.getBurstLimit = getBurstLimit;
exports.isUnlimitedBurst = isUnlimitedBurst;
exports.hasFeature = hasFeature;
exports.getEffectiveMonthlyLimit = getEffectiveMonthlyLimit;
exports.getMonthlyResetDay = getMonthlyResetDay;
/**
 * Tier configuration with query limits
 * US-36: FREE tier = 10 queries/month, 4 queries/day
 * US-37: Burst limits based on OpenAI provider limits:
 *   - FREE: 3 req/min (matches OpenAI free tier)
 *   - PRO: 30 req/min (10x free - gives paying users more headroom)
 *   - PREMIUM: 60 req/min (matches OpenAI Tier 1)
 */
exports.TIER_CONFIG = {
    FREE: {
        tier: 'FREE',
        name: { bg: 'Безплатен', en: 'Free' },
        monthlyQueries: 10,
        dailyQueries: 4,
        burstLimit: 3,
        features: [
            '10_queries_month',
            '4_queries_day',
            'tool:get_natal_chart', // Free users can only ask about their static birth chart
        ],
        price: {
            monthly: 0,
            yearly: 0,
            currency: 'EUR',
        },
    },
    PRO: {
        tier: 'PRO',
        name: { bg: 'Про', en: 'Pro' },
        monthlyQueries: -1, // unlimited
        burstLimit: 30,
        features: [
            'unlimited_queries',
            'tool:get_natal_chart',
            'tool:get_transits', // Live transit timing predictions
            'tool:get_solar_return', // Annual solar return / year-ahead forecast
            'tool:get_lunar_return', // Monthly lunar return cycle
        ],
        price: {
            monthly: 10,
            yearly: 96,
            currency: 'EUR',
        },
    },
    PREMIUM: {
        tier: 'PREMIUM',
        name: { bg: 'Премиум', en: 'Premium' },
        monthlyQueries: -1, // unlimited
        burstLimit: 60,
        features: [
            'everything_in_pro',
            'tool:get_natal_chart',
            'tool:get_transits',
            'tool:get_synastry', // Premium users unlock relationship compatibility
            'tool:get_progressions', // Advanced Psychological Timing
            'tool:get_solar_return', // Year Ahead Forecast
            'tool:get_relocation', // Astrocartography / Moving
            'tool:get_composite', // Destiny of Relationship
            'tool:get_lunar_return', // Monthly lunar return cycle
            'tool:get_venus_return', // Precise Love timing
            'tool:get_solar_arc', // Long-term solar arc directions
            'priority_support',
        ],
        price: {
            monthly: 20,
            yearly: 192,
            currency: 'EUR',
        },
    },
};
/**
 * Get tier limits for a specific tier
 */
function getTierLimits(tier) {
    return exports.TIER_CONFIG[tier] || exports.TIER_CONFIG.FREE;
}
/**
 * Check if tier has unlimited queries
 */
function isUnlimitedTier(tier) {
    return exports.TIER_CONFIG[tier]?.monthlyQueries === -1;
}
/**
 * Get monthly query limit for tier
 * Returns -1 for unlimited, or positive number for limit
 */
function getMonthlyQueryLimit(tier) {
    return exports.TIER_CONFIG[tier]?.monthlyQueries ?? 10;
}
/**
 * Get burst limit (requests per minute) for tier
 * US-37: Returns -1 for unlimited tiers
 */
function getBurstLimit(tier) {
    return exports.TIER_CONFIG[tier]?.burstLimit ?? 10;
}
/**
 * Check if tier has unlimited burst (no rate limiting)
 * US-37: PREMIUM tier has no burst limit
 */
function isUnlimitedBurst(tier) {
    return exports.TIER_CONFIG[tier]?.burstLimit === -1;
}
/**
 * Check if feature is available in tier
 */
function hasFeature(tier, feature) {
    return exports.TIER_CONFIG[tier]?.features.includes(feature) ?? false;
}
/**
 * Environment-based overrides (for A/B testing or promotions)
 */
function getEffectiveMonthlyLimit(tier) {
    const configLimit = getMonthlyQueryLimit(tier);
    // Allow environment variable override for FREE tier
    if (tier === 'FREE' && process.env.FREE_TIER_MONTHLY_LIMIT) {
        const envLimit = parseInt(process.env.FREE_TIER_MONTHLY_LIMIT, 10);
        if (!isNaN(envLimit) && envLimit >= 0) {
            return envLimit;
        }
    }
    return configLimit;
}
/**
 * Get the day of month when limits reset
 * Default: 1st of each month
 */
function getMonthlyResetDay() {
    const envDay = process.env.FREE_TIER_RESET_DAY;
    if (envDay) {
        const day = parseInt(envDay, 10);
        if (!isNaN(day) && day >= 1 && day <= 28) { // Max 28 to avoid month-end issues
            return day;
        }
    }
    return 1; // Default: 1st of month
}
exports.default = exports.TIER_CONFIG;
//# sourceMappingURL=subscription-tiers.js.map