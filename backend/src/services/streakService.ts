/**
 * Streak Service — ENH-23
 * Tracks consecutive Oracle-active days per user.
 * Rewards: 7-day streak → 48h PRO trial via subscription tier override.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Milestone streaks that trigger rewards
const MILESTONE_DAYS = [7, 14, 21, 30, 60, 100];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, today: Date): boolean {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return isSameDay(date, yesterday);
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  milestoneReached: number | null; // the milestone day count if one was just hit
}

/**
 * Call after a successful Oracle message.
 * Updates streak, checks for trial rewards.
 */
export async function updateStreak(userId: string): Promise<StreakResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get or create streak record
  let streak = await (prisma.userStreak as any).findUnique({ where: { userId } });

  if (!streak) {
    streak = await (prisma.userStreak as any).create({
      data: { userId, currentStreak: 0, longestStreak: 0 },
    });
  }

  const last = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;

  // Already counted today
  if (last && isSameDay(last, today)) {
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      milestoneReached: null,
    };
  }

  // Determine new streak value
  let newStreak: number;
  if (!last || isYesterday(last, today)) {
    newStreak = streak.currentStreak + 1;
  } else {
    // Gap > 1 day — streak broken
    newStreak = 1;
  }

  const newLongest = Math.max(streak.longestStreak, newStreak);

  // Check if we just hit a milestone
  const milestoneReached = MILESTONE_DAYS.includes(newStreak) ? newStreak : null;

  // Save updated streak
  await (prisma.userStreak as any).update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: today,
    },
  });

  // Grant trial reward on 7-day milestone
  if (milestoneReached && milestoneReached % 7 === 0) {
    await grantProTrial(userId, 48);
  }

  return { currentStreak: newStreak, longestStreak: newLongest, milestoneReached };
}

/**
 * Grant a temporary PRO trial by setting subscription tier + trialExpiresAt.
 */
async function grantProTrial(userId: string, hours: number): Promise<void> {
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

  // Update streak record to track the trial
  await (prisma.userStreak as any).update({
    where: { userId },
    data: { trialTier: 'PRO', trialExpiresAt: expiresAt },
  });

  // Elevate the user's subscription tier to PRO temporarily
  // Only grant if user is currently FREE (don't downgrade PRO/PREMIUM)
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.tier === 'FREE') {
    if (sub) {
      await prisma.subscription.update({
        where: { userId },
        data: { tier: 'PRO' },
      });
    }
    // Also update user.tier for fast reads
    await prisma.user.update({
      where: { id: userId },
      data: { tier: 'PRO' },
    });
  }
}

/**
 * Check if a user's trial has expired and revert them to FREE.
 * Call on login and in daily cron.
 */
export async function checkTrialExpiry(userId: string): Promise<void> {
  const streak = await (prisma.userStreak as any).findUnique({ where: { userId } });
  if (!streak?.trialTier || !streak?.trialExpiresAt) return;

  if (new Date(streak.trialExpiresAt) > new Date()) return; // still active

  // Trial expired — check if user has a paid Stripe subscription before reverting
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const hasPaidSub = sub?.stripeSubscriptionId && sub.status === 'ACTIVE';

  if (!hasPaidSub) {
    // Revert to FREE
    await prisma.user.update({ where: { id: userId }, data: { tier: 'FREE' } });
    if (sub) {
      await prisma.subscription.update({ where: { userId }, data: { tier: 'FREE' } });
    }
  }

  // Clear trial fields
  await (prisma.userStreak as any).update({
    where: { userId },
    data: { trialTier: null, trialExpiresAt: null },
  });
}

/**
 * Batch-revert all expired trials. For daily cron.
 */
export async function revertExpiredTrials(): Promise<number> {
  const expired = await (prisma.userStreak as any).findMany({
    where: {
      trialTier: { not: null },
      trialExpiresAt: { lt: new Date() },
    },
    select: { userId: true },
  });

  for (const { userId } of expired) {
    await checkTrialExpiry(userId);
  }

  return expired.length;
}

/**
 * Get current streak info for a user.
 */
export async function getStreakInfo(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  const streak = await (prisma.userStreak as any).findUnique({ where: { userId } });
  return {
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
  };
}
