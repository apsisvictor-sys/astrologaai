/**
 * Subscription Tier Configuration
 * US-36: Free-tier Query Limit Enforcement
 * US-37: API Rate-Limit Burst/Retry Behavior
 *
 * Defines limits and features for each subscription tier
 */
import { Tier } from '@prisma/client';
export interface TierLimits {
    tier: Tier;
    name: {
        bg: string;
        en: string;
    };
    monthlyQueries: number;
    dailyQueries?: number;
    burstLimit: number;
    features: string[];
    price: {
        monthly: number;
        yearly: number;
        currency: string;
    };
}
/**
 * Tier configuration with query limits
 * US-36: FREE tier = 10 queries/month, 4 queries/day
 * US-37: Burst limits based on OpenAI provider limits:
 *   - FREE: 3 req/min (matches OpenAI free tier)
 *   - PRO: 30 req/min (10x free - gives paying users more headroom)
 *   - PREMIUM: 60 req/min (matches OpenAI Tier 1)
 */
export declare const TIER_CONFIG: Record<Tier, TierLimits>;
/**
 * Get tier limits for a specific tier
 */
export declare function getTierLimits(tier: Tier): TierLimits;
/**
 * Check if tier has unlimited queries
 */
export declare function isUnlimitedTier(tier: Tier): boolean;
/**
 * Get monthly query limit for tier
 * Returns -1 for unlimited, or positive number for limit
 */
export declare function getMonthlyQueryLimit(tier: Tier): number;
/**
 * Get burst limit (requests per minute) for tier
 * US-37: Returns -1 for unlimited tiers
 */
export declare function getBurstLimit(tier: Tier): number;
/**
 * Check if tier has unlimited burst (no rate limiting)
 * US-37: PREMIUM tier has no burst limit
 */
export declare function isUnlimitedBurst(tier: Tier): boolean;
/**
 * Check if feature is available in tier
 */
export declare function hasFeature(tier: Tier, feature: string): boolean;
/**
 * Environment-based overrides (for A/B testing or promotions)
 */
export declare function getEffectiveMonthlyLimit(tier: Tier): number;
/**
 * Get the day of month when limits reset
 * Default: 1st of each month
 */
export declare function getMonthlyResetDay(): number;
export default TIER_CONFIG;
//# sourceMappingURL=subscription-tiers.d.ts.map