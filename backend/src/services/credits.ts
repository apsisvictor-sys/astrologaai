/**
 * Credits Service — FEAT-10
 * Atomic credit deduction and refund with FOR UPDATE row-level locking.
 */

import { prisma } from '../utils/prisma';

/**
 * Deduct credits from a user's balance atomically.
 * Uses SELECT FOR UPDATE to prevent double-spend under concurrent requests.
 * Throws with code 'INSUFFICIENT_CREDITS' if balance < amount.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<{ newBalance: number }> {
  return prisma.$transaction(async (tx) => {
    // FOR UPDATE locks the row until transaction commits
    const rows = await tx.$queryRaw<Array<{ id: string; balance: number }>>`
      SELECT id, balance FROM user_credits WHERE user_id = ${userId} FOR UPDATE
    `;

    if (rows.length === 0) {
      const err = new Error('Credits record not found for user');
      (err as any).code = 'CREDITS_NOT_FOUND';
      throw err;
    }

    const { balance } = rows[0];

    if (balance < amount) {
      const err = new Error('Insufficient credits');
      (err as any).code = 'INSUFFICIENT_CREDITS';
      (err as any).required = amount;
      (err as any).available = balance;
      throw err;
    }

    const newBalance = balance - amount;

    await tx.userCredits.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount },
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: 'spend',
        amount: -amount,
        balanceAfter: newBalance,
        description,
        relatedEntityType: relatedEntityType ?? null,
        relatedEntityId: relatedEntityId ?? null,
      },
    });

    return { newBalance };
  });
}

/**
 * Refund credits to a user's balance.
 * Used for auto-refund when an API call fails after credit deduction.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  description: string,
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<{ newBalance: number }> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.userCredits.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        totalSpent: { decrement: amount },
      },
      select: { balance: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: 'refund',
        amount,
        balanceAfter: updated.balance,
        description,
        relatedEntityType: relatedEntityType ?? null,
        relatedEntityId: relatedEntityId ?? null,
      },
    });

    return { newBalance: updated.balance };
  });
}
