/**
 * Query Limit Middleware
 * US-36: Free-tier Query Limit Enforcement
 * US-37: API Rate-Limit Burst/Retry Behavior
 *
 * Middleware that checks if user has remaining queries before allowing access
 * Works with both HTTP and WebSocket connections
 *
 * Features:
 * - Monthly query limits per tier
 * - Burst rate limiting (requests per minute)
 * - 429 responses with Retry-After header
 * - Bulgarian & English error messages
 */
import { Request, Response, NextFunction } from 'express';
import { Tier } from '@prisma/client';
/**
 * Increment query count in database
 */
export declare function incrementQueryCount(userId: string, tier: Tier): Promise<{
    newCount: number;
    month: string;
}>;
/**
 * Check if user has remaining queries for this month
 * Returns full status info for both monthly and burst limits
 * US-37: Includes retryAfter for 429 responses
 */
export declare function checkQueryLimit(userId: string, tier: Tier): Promise<{
    allowed: boolean;
    monthlyUsed: number;
    monthlyLimit: number | 'unlimited';
    monthlyRemaining: number | 'unlimited';
    burstRemaining: number | 'unlimited';
    resetAt: Date;
    retryAfter: number;
    limitType?: 'monthly' | 'burst' | 'daily';
    warningAt80Percent?: boolean;
}>;
/**
 * Express middleware for query limit checking
 * Use this before routes that consume queries (chat, forecasts, etc.)
 */
export declare function queryLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Helper to get usage stats for a user
 */
export declare function getUserUsageStats(userId: string, tier: Tier): Promise<{
    used: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    resetAt: string;
    percentage: number | null;
}>;
declare const _default: {
    queryLimitMiddleware: typeof queryLimitMiddleware;
    checkQueryLimit: typeof checkQueryLimit;
    incrementQueryCount: typeof incrementQueryCount;
    getUserUsageStats: typeof getUserUsageStats;
};
export default _default;
//# sourceMappingURL=queryLimit.d.ts.map