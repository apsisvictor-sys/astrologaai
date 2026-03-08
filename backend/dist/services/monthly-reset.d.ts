/**
 * Monthly Reset Service
 * US-36: Free-tier Query Limit Enforcement
 *
 * Handles monthly query counter resets via scheduled jobs
 * Can be run as a cron job or called manually
 */
/**
 * Check if today is reset day
 */
export declare function isResetDay(): boolean;
/**
 * Reset monthly query counters for all FREE tier users
 *
 * This function:
 * 1. Creates new usage records for the current month (if not exist)
 * 2. Optionally archives old usage data for analytics
 * 3. Logs the reset operation
 */
export declare function resetMonthlyQueryCounters(): Promise<{
    success: boolean;
    usersProcessed: number;
    errors: string[];
    duration: number;
}>;
/**
 * Archive old usage records (optional cleanup)
 * Removes records older than the specified number of months
 */
export declare function archiveOldUsageRecords(monthsToKeep?: number): Promise<{
    success: boolean;
    recordsDeleted: number;
    errors: string[];
}>;
/**
 * Initialize usage records for a new user
 * Creates a record for the current month
 */
export declare function initializeUserUsageRecord(userId: string): Promise<void>;
/**
 * Run scheduled reset check
 * Call this from a cron job or scheduler
 */
export declare function runScheduledReset(): Promise<void>;
//# sourceMappingURL=monthly-reset.d.ts.map