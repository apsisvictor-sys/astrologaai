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
  dailyQueries?: number; // Daily cap (FREE tier = 3, PRO/PREMIUM = unlimited)
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
 * Check if tier has unlimited queries (PRO and PREMIUM are unlimited)
 */
export function isUnlimitedTier(tier: Tier): boolean {
  return tier === 'PRO' || tier === 'PREMIUM';
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
 * Returns -1 (unlimited) for PRO/PREMIUM, or daily query limit for FREE.
 * Used by rate limit headers and legacy callers.
 */
export function getMonthlyQueryLimit(tier: Tier): number {
  return isUnlimitedTier(tier) ? -1 : (TIER_CONFIG[tier]?.dailyQueries ?? 3);
}

/**
 * Effective query limit — same as getMonthlyQueryLimit (monthly concept removed).
 */
export function getEffectiveMonthlyLimit(tier: Tier): number {
  return getMonthlyQueryLimit(tier);
}

/**
 * Day of month when monthly DB counters reset (1st by default).
 * Kept for monthly-reset.ts compatibility.
 */
export function getMonthlyResetDay(): number {
  const envDay = process.env.FREE_TIER_RESET_DAY;
  if (envDay) {
    const day = parseInt(envDay, 10);
    if (!isNaN(day) && day >= 1 && day <= 28) {
      return day;
    }
  }
  return 1;
}

export default TIER_CONFIG;
