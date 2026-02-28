/**
 * Monthly Reset Service
 * US-36: Free-tier Query Limit Enforcement
 * 
 * Handles monthly query counter resets via scheduled jobs
 * Can be run as a cron job or called manually
 */

import { prisma } from '../utils/prisma';
import { getMonthlyResetDay, getTierLimits } from '../config/subscription-tiers';

/**
 * Get current month string in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get previous month string in YYYY-MM format
 */
function getPreviousMonth(): string {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Check if today is reset day
 */
export function isResetDay(): boolean {
  const today = new Date().getDate();
  const resetDay = getMonthlyResetDay();
  return today === resetDay;
}

/**
 * Reset monthly query counters for all FREE tier users
 * 
 * This function:
 * 1. Creates new usage records for the current month (if not exist)
 * 2. Optionally archives old usage data for analytics
 * 3. Logs the reset operation
 */
export async function resetMonthlyQueryCounters(): Promise<{
  success: boolean;
  usersProcessed: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let usersProcessed = 0;

  try {
    console.log('[Monthly Reset] Starting monthly query counter reset...');
    
    const currentMonth = getCurrentMonth();
    const previousMonth = getPreviousMonth();
    
    // Get all FREE tier users who had usage last month
    const usersWithUsage = await prisma.usageRecord.findMany({
      where: {
        month: previousMonth,
        user: {
          tier: 'FREE',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tier: true,
          },
        },
      },
    });

    console.log(`[Monthly Reset] Found ${usersWithUsage.length} FREE tier users with usage in ${previousMonth}`);

    // For each user, ensure they have a fresh record for the new month
    // The Prisma schema default is 0, so new records will start at 0
    for (const record of usersWithUsage) {
      try {
        // Check if current month record already exists
        const existingRecord = await prisma.usageRecord.findUnique({
          where: {
            userId_month: {
              userId: record.userId,
              month: currentMonth,
            },
          },
        });

        if (!existingRecord) {
          // Create new record with count 0 (default)
          await prisma.usageRecord.create({
            data: {
              userId: record.userId,
              month: currentMonth,
              queryCount: 0,
            },
          });
          
          usersProcessed++;
        }

        // Optional: Log the previous month's usage for analytics
        console.log(`[Monthly Reset] User ${record.user.email}: Reset from ${record.queryCount} queries in ${previousMonth}`);
      } catch (userError) {
        const errorMsg = `Failed to reset for user ${record.userId}: ${userError}`;
        console.error(`[Monthly Reset] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Also create records for FREE users who didn't have usage last month
    // This ensures all FREE users have a record for the current month
    const freeUsersWithoutRecord = await prisma.user.findMany({
      where: {
        tier: 'FREE',
        NOT: {
          usageRecords: {
            some: {
              month: currentMonth,
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`[Monthly Reset] Found ${freeUsersWithoutRecord.length} FREE tier users without current month record`);

    for (const user of freeUsersWithoutRecord) {
      try {
        await prisma.usageRecord.create({
          data: {
            userId: user.id,
            month: currentMonth,
            queryCount: 0,
          },
        });
        
        usersProcessed++;
      } catch (userError) {
        // Ignore duplicate key errors (race condition)
        if (!(userError as any).code?.includes('P2002')) {
          const errorMsg = `Failed to create record for user ${user.id}: ${userError}`;
          console.error(`[Monthly Reset] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`[Monthly Reset] Completed in ${duration}ms. Users processed: ${usersProcessed}`);
    
    return {
      success: true,
      usersProcessed,
      errors,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = `Monthly reset failed: ${error}`;
    console.error(`[Monthly Reset] ${errorMsg}`);
    errors.push(errorMsg);
    
    return {
      success: false,
      usersProcessed,
      errors,
      duration,
    };
  }
}

/**
 * Archive old usage records (optional cleanup)
 * Removes records older than the specified number of months
 */
export async function archiveOldUsageRecords(monthsToKeep: number = 12): Promise<{
  success: boolean;
  recordsDeleted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let recordsDeleted = 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[Monthly Reset] Archiving usage records older than ${cutoffMonth}`);

    const result = await prisma.usageRecord.deleteMany({
      where: {
        month: {
          lt: cutoffMonth,
        },
      },
    });

    recordsDeleted = result.count;
    console.log(`[Monthly Reset] Archived ${recordsDeleted} old usage records`);

    return {
      success: true,
      recordsDeleted,
      errors,
    };
  } catch (error) {
    const errorMsg = `Failed to archive old records: ${error}`;
    console.error(`[Monthly Reset] ${errorMsg}`);
    errors.push(errorMsg);
    
    return {
      success: false,
      recordsDeleted,
      errors,
    };
  }
}

/**
 * Initialize usage records for a new user
 * Creates a record for the current month
 */
export async function initializeUserUsageRecord(userId: string): Promise<void> {
  const currentMonth = getCurrentMonth();
  
  try {
    await prisma.usageRecord.create({
      data: {
        userId,
        month: currentMonth,
        queryCount: 0,
      },
    });
  } catch (error) {
    // Ignore duplicate key errors
    if (!(error as any).code?.includes('P2002')) {
      console.error(`[Monthly Reset] Failed to initialize usage record for user ${userId}:`, error);
    }
  }
}

/**
 * Run scheduled reset check
 * Call this from a cron job or scheduler
 */
export async function runScheduledReset(): Promise<void> {
  if (isResetDay()) {
    console.log('[Monthly Reset] Today is reset day. Running monthly reset...');
    
    const result = await resetMonthlyQueryCounters();
    
    if (result.success) {
      console.log(`[Monthly Reset] Successfully reset ${result.usersProcessed} users in ${result.duration}ms`);
      
      if (result.errors.length > 0) {
        console.warn(`[Monthly Reset] Completed with ${result.errors.length} errors`);
      }
    } else {
      console.error(`[Monthly Reset] Reset failed with ${result.errors.length} errors`);
    }
    
    // Optionally archive old records
    const archiveResult = await archiveOldUsageRecords(12);
    if (archiveResult.success && archiveResult.recordsDeleted > 0) {
      console.log(`[Monthly Reset] Archived ${archiveResult.recordsDeleted} old records`);
    }
  } else {
    console.log('[Monthly Reset] Not reset day. Skipping.');
  }
}
