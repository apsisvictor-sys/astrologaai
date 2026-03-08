/**
 * Rate Limit Headers Middleware
 * US-37: API Rate-Limit Burst/Retry Behavior
 *
 * Adds standard X-RateLimit-* headers to all API responses
 * Works with both REST and WebSocket connections
 */
import { Request, Response, NextFunction } from 'express';
import { Tier } from '@prisma/client';
/**
 * Rate limit header names
 */
export declare const RATE_LIMIT_HEADERS: {
    readonly LIMIT: "X-RateLimit-Limit";
    readonly REMAINING: "X-RateLimit-Remaining";
    readonly RESET: "X-RateLimit-Reset";
    readonly RETRY_AFTER: "Retry-After";
    readonly TIER: "X-RateLimit-Tier";
};
/**
 * Extended request with rate limit info
 */
export interface RateLimitRequest extends Request {
    rateLimit?: {
        burst: {
            used: number;
            limit: number;
            remaining: number;
            resetAt: Date;
        };
        monthly: {
            used: number;
            limit: number;
            remaining: number;
            resetAt: Date;
        };
    };
}
/**
 * Middleware to add rate limit headers to all responses
 * Must be placed after auth middleware
 */
export declare function rateLimitHeadersMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware to fetch rate limit status and attach to request
 * Use this before routes that need rate limit info
 */
export declare function fetchRateLimitStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Helper to create a 429 response with proper headers
 */
export declare function createRateLimitErrorResponse(res: Response, options: {
    retryAfter: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    resetAt: Date;
    limitType: 'burst' | 'monthly';
    tier: Tier;
    language?: 'bg' | 'en';
    monthlyInfo?: {
        used: number;
        limit: number | 'unlimited';
        remaining: number | 'unlimited';
    };
}): void;
/**
 * WebSocket rate limit response helper
 */
export declare function createWebSocketRateLimitError(options: {
    retryAfter: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    resetAt: Date;
    limitType: 'burst' | 'monthly';
    tier: Tier;
    language?: 'bg' | 'en';
    conversationId?: string;
}): {
    type: 'chat:error';
    payload: {
        code: 'RATE_LIMIT_EXCEEDED';
        message: string;
        retryAfter: number;
        limit: number | 'unlimited';
        remaining: number | 'unlimited';
        resetAt: string;
        limitType: 'burst' | 'monthly';
        conversationId?: string;
    };
};
declare const _default: {
    rateLimitHeadersMiddleware: typeof rateLimitHeadersMiddleware;
    fetchRateLimitStatus: typeof fetchRateLimitStatus;
    createRateLimitErrorResponse: typeof createRateLimitErrorResponse;
    createWebSocketRateLimitError: typeof createWebSocketRateLimitError;
    RATE_LIMIT_HEADERS: {
        readonly LIMIT: "X-RateLimit-Limit";
        readonly REMAINING: "X-RateLimit-Remaining";
        readonly RESET: "X-RateLimit-Reset";
        readonly RETRY_AFTER: "Retry-After";
        readonly TIER: "X-RateLimit-Tier";
    };
};
export default _default;
//# sourceMappingURL=rateLimitHeaders.d.ts.map