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
    dailyQueries: 10,           // PRO: 10 queries per day
    burstLimit: 30,
    features: [
      '10_queries_day',
      'tool:get_natal_chart',
      'tool:get_transits',       // Live transit timing predictions
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
    burstLimit: 60,
    features: [
      'unlimited_queries',
      'claude_opus_ai',          // Most powerful AI model
      'tool:get_natal_chart',
      'tool:get_transits',
      'tool:get_solar_return',   // Year Ahead Forecast (PREMIUM only)
      'tool:get_synastry',       // Relationship compatibility
      'tool:get_progressions',   // Advanced Psychological Timing
      'tool:get_relocation',     // Astrocartography / Moving
      'tool:get_composite',      // Destiny of Relationship
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
 * Check if tier has unlimited queries (PREMIUM only)
 * FREE: 3/day, PRO: 10/day, PREMIUM: unlimited
 */
export function isUnlimitedTier(tier: Tier): boolean {
  return tier === 'PREMIUM';
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

/**
 * Gift subscription price IDs from Stripe (one-time payments, mode: "payment")
 * FEAT-14: Gift subscriptions
 *
 * Keys map to env vars: STRIPE_GIFT_PREMIUM_{1M|3M|6M|12M}_PRICE_ID
 * Prices: €19.99 / €54.99 / €99.99 / €179.88
 */
export interface GiftPriceConfig {
  durationMonths: 1 | 3 | 6 | 12;
  amountCents: number;
  currency: 'eur';
  priceIdEnvKey: string;
}

export const GIFT_PRICE_CONFIG: Record<string, GiftPriceConfig> = {
  GIFT_PREMIUM_1M: {
    durationMonths: 1,
    amountCents: 1999,
    currency: 'eur',
    priceIdEnvKey: 'STRIPE_GIFT_PREMIUM_1M_PRICE_ID',
  },
  GIFT_PREMIUM_3M: {
    durationMonths: 3,
    amountCents: 5499,
    currency: 'eur',
    priceIdEnvKey: 'STRIPE_GIFT_PREMIUM_3M_PRICE_ID',
  },
  GIFT_PREMIUM_6M: {
    durationMonths: 6,
    amountCents: 9999,
    currency: 'eur',
    priceIdEnvKey: 'STRIPE_GIFT_PREMIUM_6M_PRICE_ID',
  },
  GIFT_PREMIUM_12M: {
    durationMonths: 12,
    amountCents: 17988,
    currency: 'eur',
    priceIdEnvKey: 'STRIPE_GIFT_PREMIUM_12M_PRICE_ID',
  },
};

/**
 * Resolve the Stripe price ID for a gift duration from environment.
 * Throws if the env var is missing or is a placeholder.
 */
export function getGiftPriceId(durationMonths: 1 | 3 | 6 | 12): string {
  const key = `GIFT_PREMIUM_${durationMonths}M` as keyof typeof GIFT_PRICE_CONFIG;
  const config = GIFT_PRICE_CONFIG[key];
  if (!config) throw new Error(`No gift price config for ${durationMonths} months`);
  const priceId = process.env[config.priceIdEnvKey];
  if (!priceId || priceId.startsWith('price_') === false) {
    throw new Error(`Missing or invalid env var: ${config.priceIdEnvKey}`);
  }
  return priceId;
}
