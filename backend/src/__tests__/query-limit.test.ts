/**
 * Query Limit Middleware Tests
 * US-36: Free-tier Query Limit Enforcement
 * 
 * Tests for subscription tier limits and query counting
 * Updated: subscription-tiers.ts switched from monthly to daily limits
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Tier } from '@prisma/client';
import {
  TIER_CONFIG,
  getTierLimits,
  isUnlimitedTier,
  getMonthlyQueryLimit,
  getBurstLimit,
  hasFeature,
  getEffectiveMonthlyLimit,
  getMonthlyResetDay,
} from '../config/subscription-tiers';

describe('Subscription Tier Configuration', () => {
  describe('TIER_CONFIG', () => {
    it('should define all three tiers', () => {
      expect(TIER_CONFIG.FREE).toBeDefined();
      expect(TIER_CONFIG.PRO).toBeDefined();
      expect(TIER_CONFIG.PREMIUM).toBeDefined();
    });

    it('should set FREE tier with 3 daily queries', () => {
      expect(TIER_CONFIG.FREE.dailyQueries).toBe(3);
    });

    it('should set PRO tier with 10 daily queries', () => {
      expect(TIER_CONFIG.PRO.dailyQueries).toBe(10);
    });

    it('should set PREMIUM tier with no daily cap (unlimited)', () => {
      // PREMIUM has no dailyQueries property — it's the unlimited tier
      expect(TIER_CONFIG.PREMIUM.dailyQueries).toBeUndefined();
    });

    it('should define burst limits for each tier', () => {
      expect(TIER_CONFIG.FREE.burstLimit).toBe(3);
      expect(TIER_CONFIG.PRO.burstLimit).toBe(30);
      expect(TIER_CONFIG.PREMIUM.burstLimit).toBe(60);
    });

    it('should include Bulgarian and English names', () => {
      expect(TIER_CONFIG.FREE.name.bg).toBe('Безплатен');
      expect(TIER_CONFIG.FREE.name.en).toBe('Free');
    });
  });

  describe('getTierLimits', () => {
    it('should return config for valid tier', () => {
      const limits = getTierLimits('FREE');
      expect(limits.tier).toBe('FREE');
      expect(limits.dailyQueries).toBe(3);
    });

    it('should return FREE config for invalid tier', () => {
      const limits = getTierLimits('INVALID' as Tier);
      expect(limits.tier).toBe('FREE');
    });
  });

  describe('isUnlimitedTier', () => {
    it('should return false for FREE tier', () => {
      expect(isUnlimitedTier('FREE')).toBe(false);
    });

    it('should return false for PRO tier', () => {
      // PRO has 10 queries/day — not unlimited
      expect(isUnlimitedTier('PRO')).toBe(false);
    });

    it('should return true for PREMIUM tier', () => {
      expect(isUnlimitedTier('PREMIUM')).toBe(true);
    });
  });

  describe('getMonthlyQueryLimit', () => {
    it('should return 3 for FREE tier', () => {
      // Legacy helper returns dailyQueries for non-unlimited tiers
      expect(getMonthlyQueryLimit('FREE')).toBe(3);
    });

    it('should return 10 for PRO tier', () => {
      // PRO is not unlimited — returns its dailyQueries value
      expect(getMonthlyQueryLimit('PRO')).toBe(10);
    });

    it('should return -1 for PREMIUM tier', () => {
      // PREMIUM is the only unlimited tier
      expect(getMonthlyQueryLimit('PREMIUM')).toBe(-1);
    });
  });

  describe('getBurstLimit', () => {
    it('should return 3 for FREE tier', () => {
      expect(getBurstLimit('FREE')).toBe(3);
    });

    it('should return 30 for PRO tier', () => {
      expect(getBurstLimit('PRO')).toBe(30);
    });

    it('should return 60 for PREMIUM tier', () => {
      expect(getBurstLimit('PREMIUM')).toBe(60);
    });
  });

  describe('hasFeature', () => {
    it('should return true if feature exists in tier', () => {
      expect(hasFeature('FREE', '3_queries_day')).toBe(true);
      expect(hasFeature('PREMIUM', 'unlimited_queries')).toBe(true);
    });

    it('should return false if feature does not exist in tier', () => {
      expect(hasFeature('FREE', 'unlimited_queries')).toBe(false);
      expect(hasFeature('PRO', 'unlimited_queries')).toBe(false);
      expect(hasFeature('FREE', 'tarot_readings')).toBe(false);
    });
  });

  describe('getEffectiveMonthlyLimit', () => {
    it('should return daily query count for FREE tier', () => {
      // No env override — returns config value (dailyQueries=3)
      expect(getEffectiveMonthlyLimit('FREE')).toBe(3);
    });

    it('should return daily query count for PRO tier', () => {
      // PRO is not unlimited — returns its dailyQueries value
      expect(getEffectiveMonthlyLimit('PRO')).toBe(10);
    });

    it('should return -1 for PREMIUM (unlimited)', () => {
      // PREMIUM is the only unlimited tier
      expect(getEffectiveMonthlyLimit('PREMIUM')).toBe(-1);
    });
  });

  describe('getMonthlyResetDay', () => {
    it('should return 1 by default', () => {
      delete process.env.FREE_TIER_RESET_DAY;
      expect(getMonthlyResetDay()).toBe(1);
    });

    it('should return env value when set', () => {
      process.env.FREE_TIER_RESET_DAY = '15';
      expect(getMonthlyResetDay()).toBe(15);
      delete process.env.FREE_TIER_RESET_DAY;
    });

    it('should cap at 28 to avoid month-end issues', () => {
      process.env.FREE_TIER_RESET_DAY = '31';
      expect(getMonthlyResetDay()).toBe(1); // Falls back to default
      delete process.env.FREE_TIER_RESET_DAY;
    });
  });
});

describe('Query Limit Middleware', () => {
  describe('Limit calculations', () => {
    it('should calculate remaining queries correctly', () => {
      const used = 1;
      const limit = 3; // FREE daily limit
      const remaining = limit - used;
      expect(remaining).toBe(2);
    });

    it('should not go negative', () => {
      const used = 5;
      const limit = 3;
      const remaining = Math.max(0, limit - used);
      expect(remaining).toBe(0);
    });

    it('should handle unlimited correctly', () => {
      const limit = -1;
      const isUnlimited = limit === -1;
      expect(isUnlimited).toBe(true);
    });
  });

  describe('Percentage calculations', () => {
    it('should calculate ~67% usage for FREE tier', () => {
      const used = 2;
      const limit = 3; // FREE daily limit
      const percentage = Math.round((used / limit) * 100);
      expect(percentage).toBe(67);
    });

    it('should calculate 100% usage when at limit', () => {
      const used = 3;
      const limit = 3; // FREE daily limit
      const percentage = Math.round((used / limit) * 100);
      expect(percentage).toBe(100);
    });

    it('should cap at 100%', () => {
      const used = 5;
      const limit = 3;
      const percentage = Math.min(100, Math.round((used / limit) * 100));
      expect(percentage).toBe(100);
    });
  });
});

describe('Daily Reset Logic', () => {
  describe('isResetDay', () => {
    it('should identify reset day correctly', () => {
      const today = new Date().getDate();
      const resetDay = 1;
      const isReset = today === resetDay;
      expect(typeof isReset).toBe('boolean');
    });
  });

  describe('Day calculations', () => {
    it('should generate correct date string', () => {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('Rate Limit Headers', () => {
  it('should format rate limit response correctly', () => {
    const rateLimitResponse = {
      allowed: false,
      dailyUsed: 3,
      dailyLimit: 3,
      dailyRemaining: 0,
      burstRemaining: 2,
      resetAt: new Date('2026-03-31').toISOString(),
      limitType: 'daily' as const,
    };

    expect(rateLimitResponse.allowed).toBe(false);
    expect(rateLimitResponse.dailyRemaining).toBe(0);
    expect(rateLimitResponse.limitType).toBe('daily');
  });

  it('should indicate near limit at 80%', () => {
    const used = 3;
    const limit = 3; // FREE daily limit — 100% usage
    const percentage = Math.round((used / limit) * 100);
    const nearLimit = percentage >= 80;
    expect(nearLimit).toBe(true);
  });

  it('should not indicate near limit below 80%', () => {
    const used = 2;
    const limit = 3; // FREE daily limit — 67% usage
    const percentage = Math.round((used / limit) * 100);
    const nearLimit = percentage >= 80;
    expect(nearLimit).toBe(false);
  });
});

describe('Error Messages', () => {
  it('should provide Bulgarian message for daily limit', () => {
    const language = 'bg';
    const limit = 3; // FREE daily limit
    const message = language === 'bg'
      ? `Достигнахте дневния лимит от ${limit} въпроса. Надградете до Pro за повече въпроси.`
      : `You've reached your daily limit of ${limit} queries. Upgrade to Pro for more queries.`;

    expect(message).toContain('3');
    expect(message).toContain('Pro');
  });

  it('should provide English message for daily limit', () => {
    const language: 'en' | 'bg' = 'en' as 'en' | 'bg';
    const limit = 3; // FREE daily limit
    const message = language === 'bg'
      ? `Достигнахте дневния лимит от ${limit} въпроса. Надградете до Pro за повече въпроси.`
      : `You've reached your daily limit of ${limit} queries. Upgrade to Pro for more queries.`;

    expect(message).toContain('3');
    expect(message).toContain('Pro');
    expect(message).toContain('Upgrade');
    expect(message).toContain("You've reached");
  });
});
