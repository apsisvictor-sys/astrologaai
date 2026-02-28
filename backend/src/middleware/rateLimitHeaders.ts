/**
 * Rate Limit Headers Middleware
 * US-37: API Rate-Limit Burst/Retry Behavior
 * 
 * Adds standard X-RateLimit-* headers to all API responses
 * Works with both REST and WebSocket connections
 */

import { Request, Response, NextFunction } from 'express';
import { Tier } from '@prisma/client';
import {
  getBurstLimit,
  getMonthlyQueryLimit,
  isUnlimitedTier,
  isUnlimitedBurst,
} from '../config/subscription-tiers';
import { redisClient } from '../utils/redis';
import { prisma } from '../utils/prisma';

/**
 * Rate limit header names
 */
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
  TIER: 'X-RateLimit-Tier',
} as const;

/**
 * Get current month string in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get burst rate limit status from Redis
 */
async function getBurstStatus(
  userId: string,
  tier: Tier
): Promise<{ used: number; limit: number; remaining: number; resetAt: Date }> {
  const burstLimit = getBurstLimit(tier);
  
  // Unlimited burst
  if (burstLimit === -1 || isUnlimitedBurst(tier)) {
    return { used: 0, limit: -1, remaining: -1, resetAt: new Date(Date.now() + 60000) };
  }
  
  const burstKey = `ratelimit:burst:${userId}`;
  const currentCount = parseInt(await redisClient.get(burstKey) || '0', 10);
  const ttl = await redisClient.ttl(burstKey);
  
  const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : 60) * 1000);
  
  return {
    used: currentCount,
    limit: burstLimit,
    remaining: Math.max(0, burstLimit - currentCount),
    resetAt,
  };
}

/**
 * Get monthly query limit status from database
 */
async function getMonthlyStatus(
  userId: string,
  tier: Tier
): Promise<{ used: number; limit: number; remaining: number; resetAt: Date }> {
  // Unlimited tier
  if (isUnlimitedTier(tier)) {
    return { used: 0, limit: -1, remaining: -1, resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
  }
  
  const monthlyLimit = getMonthlyQueryLimit(tier);
  const month = getCurrentMonth();
  
  const record = await prisma.usageRecord.findUnique({
    where: { userId_month: { userId, month } },
  });
  
  const used = record?.queryCount ?? 0;
  
  // Calculate next reset date (1st of next month)
  const now = new Date();
  const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  return {
    used,
    limit: monthlyLimit,
    remaining: Math.max(0, monthlyLimit - used),
    resetAt,
  };
}

/**
 * Extended request with rate limit info
 */
export interface RateLimitRequest extends Request {
  rateLimit?: {
    burst: { used: number; limit: number; remaining: number; resetAt: Date };
    monthly: { used: number; limit: number; remaining: number; resetAt: Date };
  };
}

/**
 * Middleware to add rate limit headers to all responses
 * Must be placed after auth middleware
 */
export async function rateLimitHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Store original json function
  const originalJson = res.json.bind(res);
  
  // Override json function to add headers
  res.json = function (body: any): Response {
    // Add rate limit headers if user is authenticated
    const userId = (req as any).user?.id;
    const userTier = ((req as any).user?.tier as Tier) || 'FREE';
    
    if (userId) {
      // Use cached rate limit info if available
      const rateLimitInfo = (req as RateLimitRequest).rateLimit;
      if (rateLimitInfo) {
        const { burst, monthly } = rateLimitInfo;
        
        // Use burst limit for immediate rate limiting
        const limit = burst.limit === -1 ? 'unlimited' : burst.limit;
        const remaining = burst.remaining === -1 ? 'unlimited' : burst.remaining;
        const reset = Math.floor(burst.resetAt.getTime() / 1000);
        
        res.setHeader(RATE_LIMIT_HEADERS.LIMIT, limit);
        res.setHeader(RATE_LIMIT_HEADERS.REMAINING, remaining);
        res.setHeader(RATE_LIMIT_HEADERS.RESET, reset);
        res.setHeader(RATE_LIMIT_HEADERS.TIER, userTier);
        
        // Add monthly info for informational purposes
        if (monthly.limit !== -1) {
          res.setHeader('X-RateLimit-Monthly-Limit', monthly.limit);
          res.setHeader('X-RateLimit-Monthly-Remaining', monthly.remaining);
        }
      }
    }
    
    return originalJson(body);
  };
  
  next();
}

/**
 * Middleware to fetch rate limit status and attach to request
 * Use this before routes that need rate limit info
 */
export async function fetchRateLimitStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as any).user?.id;
  const userTier = ((req as any).user?.tier as Tier) || 'FREE';
  
  if (!userId) {
    next();
    return;
  }
  
  try {
    const [burst, monthly] = await Promise.all([
      getBurstStatus(userId, userTier),
      getMonthlyStatus(userId, userTier),
    ]);
    
    (req as RateLimitRequest).rateLimit = { burst, monthly };
    next();
  } catch (error) {
    console.error('[RateLimitHeaders] Error fetching status:', error);
    // Continue without rate limit info
    next();
  }
}

/**
 * Helper to create a 429 response with proper headers
 */
export function createRateLimitErrorResponse(
  res: Response,
  options: {
    retryAfter: number; // Seconds until retry
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
  }
): void {
  const {
    retryAfter,
    limit,
    remaining,
    resetAt,
    limitType,
    tier,
    language = 'bg',
    monthlyInfo,
  } = options;
  
  // Set rate limit headers
  res.setHeader(RATE_LIMIT_HEADERS.LIMIT, limit);
  res.setHeader(RATE_LIMIT_HEADERS.REMAINING, remaining);
  res.setHeader(RATE_LIMIT_HEADERS.RESET, Math.floor(resetAt.getTime() / 1000));
  res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
  res.setHeader(RATE_LIMIT_HEADERS.TIER, tier);
  
  // Add monthly info if available
  if (monthlyInfo) {
    res.setHeader('X-RateLimit-Monthly-Limit', monthlyInfo.limit);
    res.setHeader('X-RateLimit-Monthly-Remaining', monthlyInfo.remaining);
  }
  
  // Create response body
  const message = limitType === 'burst'
    ? (language === 'bg'
        ? 'Твърде много заявки. Моля, изчакайте малко.'
        : 'Too many requests. Please wait a moment.')
    : (language === 'bg'
        ? `Достигнахте лимита от ${monthlyInfo?.limit ?? limit} въпроса за този месец. Надградете до Pro за неограничени въпроси.`
        : `You've reached your monthly limit of ${monthlyInfo?.limit ?? limit} queries. Upgrade to Pro for unlimited queries.`);
  
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      limitType,
      retryAfter,
      limit,
      remaining,
      resetAt: resetAt.toISOString(),
      upgradeUrl: tier === 'FREE' ? '/subscription/plans' : undefined,
    },
  });
}

/**
 * WebSocket rate limit response helper
 */
export function createWebSocketRateLimitError(
  options: {
    retryAfter: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    resetAt: Date;
    limitType: 'burst' | 'monthly';
    tier: Tier;
    language?: 'bg' | 'en';
    conversationId?: string;
  }
): {
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
} {
  const {
    retryAfter,
    limit,
    remaining,
    resetAt,
    limitType,
    tier,
    language = 'bg',
    conversationId,
  } = options;
  
  const message = limitType === 'burst'
    ? (language === 'bg'
        ? 'Твърде много заявки. Моля, изчакайте малко.'
        : 'Too many requests. Please wait a moment.')
    : (language === 'bg'
        ? `Достигнахте лимита от ${limit} въпроса за този месец.`
        : `You've reached your monthly limit of ${limit} queries.`);
  
  return {
    type: 'chat:error',
    payload: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      retryAfter,
      limit,
      remaining,
      resetAt: resetAt.toISOString(),
      limitType,
      conversationId,
    },
  };
}

export default {
  rateLimitHeadersMiddleware,
  fetchRateLimitStatus,
  createRateLimitErrorResponse,
  createWebSocketRateLimitError,
  RATE_LIMIT_HEADERS,
};
