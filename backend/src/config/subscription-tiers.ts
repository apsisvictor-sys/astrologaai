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
 * US-36: FREE tier = 10 queries/month
 * US-37: Burst limits based on OpenAI provider limits:
 *   - FREE: 3 req/min (matches OpenAI free tier)
 *   - PRO: 30 req/min (10x free - gives paying users more headroom)
 *   - PREMIUM: 60 req/min (matches OpenAI Tier 1)
 */
export const TIER_CONFIG: Record<Tier, TierLimits> = {
  FREE: {
    tier: 'FREE',
    name: { bg: 'Безплатен', en: 'Free' },
    monthlyQueries: 10, // US-36: 10 queries per month (BMAD specification)
    burstLimit: 3, // US-37: 3 requests per minute (matches OpenAI free tier)
    features: [
      '10_queries_month',
      'basic_horoscope',
      'limited_chart_access',
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
    burstLimit: 30, // US-37: 30 requests per minute (10x free tier)
    features: [
      'unlimited_queries',
      'core_astrology',
      'vedic_astrology',
      'relationship_analysis',
      'daily_forecast',
      'weekly_forecast',
      'full_chart_access',
    ],
    price: {
      monthly: 10,
      yearly: 96, // 20% discount
      currency: 'EUR',
    },
  },
  PREMIUM: {
    tier: 'PREMIUM',
    name: { bg: 'Премиум', en: 'Premium' },
    monthlyQueries: -1, // unlimited
    burstLimit: 60, // US-37: 60 requests per minute (matches OpenAI Tier 1)
    features: [
      'everything_in_pro',
      'business_astrology',
      'tarot_readings',
      'numerology',
      'chinese_astrology',
      'priority_support',
    ],
    price: {
      monthly: 20,
      yearly: 192, // 20% discount
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
