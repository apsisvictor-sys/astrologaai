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
  name: { bg: string; en: string };
  monthlyQueries: number; // -1 = unlimited
  dailyQueries?: number; // Daily cap for retention loops
  burstLimit: number; // Requests per minute, -1 = unlimited
  features: string[];
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
}

/**
 * Tier configuration with query limits
 * US-36: FREE tier = 3 queries/day (no monthly cap)
 * US-37: Burst limits based on OpenAI provider limits:
 *   - FREE: 3 req/min (matches OpenAI free tier)
 *   - PRO: 30 req/min (10x free - gives paying users more headroom)
 *   - PREMIUM: 60 req/min (matches OpenAI Tier 1)
 */
export const TIER_CONFIG: Record<Tier, TierLimits> = {
  FREE: {
    tier: 'FREE',
    name: { bg: 'Безплатен', en: 'Free' },
    monthlyQueries: 9999, // effectively unlimited — daily cap is the binding constraint
    dailyQueries: 3,
    burstLimit: 3,
    features: [
      '3_queries_day',
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
    burstLimit: 10,
    features: [
      'unlimited_queries',
      'tool:get_natal_chart',
      'tool:get_transits',       // Live transit timing predictions
      'tool:get_solar_return',   // Annual solar return / year-ahead forecast
      'tool:get_lunar_return',   // Monthly lunar return cycle
    ],
    price: {
      monthly: 9.99,
      yearly: 89.88, // 25% off: 9.99 * 12 * 0.75
      currency: 'EUR',
    },
  },
  PREMIUM: {
    tier: 'PREMIUM',
    name: { bg: 'Премиум', en: 'Premium' },
    monthlyQueries: -1, // unlimited
    burstLimit: 10, // 10 req/min — realistic for human use, protects against abuse
    features: [
      'everything_in_pro',
      'tool:get_natal_chart',
      'tool:get_transits',
      'tool:get_synastry', // Premium users unlock relationship compatibility
      'tool:get_progressions', // Advanced Psychological Timing
      'tool:get_solar_return', // Year Ahead Forecast
      'tool:get_relocation', // Astrocartography / Moving
      'tool:get_composite', // Destiny of Relationship
      'tool:get_lunar_return',   // Monthly lunar return cycle
      'tool:get_venus_return',   // Precise Love timing
      'tool:get_solar_arc',      // Long-term solar arc directions
      'priority_support',
    ],
    price: {
      monthly: 19.99,
      yearly: 179.88, // 25% off: 19.99 * 12 * 0.75
      currency: 'EUR',
    },
  },
};

/**
 * Get tier limits for a specific tier
 */
export function getTierLimits(tier: Tier): TierLimits {
  return TIER_CONFIG[tier] || TIER_CONFIG.FREE;
}

/**
 * Check if tier has unlimited queries
 */
export function isUnlimitedTier(tier: Tier): boolean {
  return TIER_CONFIG[tier]?.monthlyQueries === -1;
}

/**
 * Get monthly query limit for tier
 * Returns -1 for unlimited, or positive number for limit
 */
export function getMonthlyQueryLimit(tier: Tier): number {
  return TIER_CONFIG[tier]?.monthlyQueries ?? 10;
}

/**
 * Get burst limit (requests per minute) for tier
 * US-37: Returns -1 for unlimited tiers
 */
export function getBurstLimit(tier: Tier): number {
  return TIER_CONFIG[tier]?.burstLimit ?? 10;
}

/**
 * Check if tier has unlimited burst (no rate limiting)
 * US-37: PREMIUM tier has no burst limit
 */
export function isUnlimitedBurst(tier: Tier): boolean {
  return TIER_CONFIG[tier]?.burstLimit === -1;
}

/**
 * Check if feature is available in tier
 */
export function hasFeature(tier: Tier, feature: string): boolean {
  return TIER_CONFIG[tier]?.features.includes(feature) ?? false;
}

/**
 * Environment-based overrides (for A/B testing or promotions)
 */
export function getEffectiveMonthlyLimit(tier: Tier): number {
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
export function getMonthlyResetDay(): number {
  const envDay = process.env.FREE_TIER_RESET_DAY;
  if (envDay) {
    const day = parseInt(envDay, 10);
    if (!isNaN(day) && day >= 1 && day <= 28) { // Max 28 to avoid month-end issues
      return day;
    }
  }
  return 1; // Default: 1st of month
}

export default TIER_CONFIG;
