/**
 * Gift Subscription Expiry Sweep — FEAT-14-F
 *
 * Daily cron: expires gift subscriptions past their end date and marks
 * unclaimed gift codes past their 1-year claim window as EXPIRED.
 */

import { prisma } from '../utils/prisma';

export interface GiftExpirySweepResult {
  subscriptionsExpired: number;
  giftCodesExpired: number;
}

export async function runGiftExpirySweep(): Promise<GiftExpirySweepResult> {
  const now = new Date();

  // 1. Find active gift subscriptions whose period has ended.
  const expiredSubs = await prisma.subscription.findMany({
    where: {
      isGiftSubscription: true,
      status: 'ACTIVE',
      currentPeriodEnd: { lte: now },
    },
    select: { id: true, userId: true },
  });

  // 2. Downgrade each expired gift subscriber back to FREE.
  let subscriptionsExpired = 0;
  for (const sub of expiredSubs) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: sub.userId },
        data: { tier: 'FREE' },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELED', tier: 'FREE' },
      }),
    ]);
    subscriptionsExpired++;
  }

  // 3. Mark unclaimed ACTIVE gift codes whose claim window has passed as EXPIRED.
  const expiredCodes = await prisma.giftCode.updateMany({
    where: {
      status: 'ACTIVE',
      claimExpiresAt: { lte: now },
    },
    data: { status: 'EXPIRED' },
  });

  console.log(
    `[gift-expiry] subscriptions expired: ${subscriptionsExpired}, codes expired: ${expiredCodes.count}`,
  );

  return {
    subscriptionsExpired,
    giftCodesExpired: expiredCodes.count,
  };
}
