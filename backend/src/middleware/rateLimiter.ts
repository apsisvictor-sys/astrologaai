/**
 * Rate Limiter Middleware
 * Implements rate limiting for authentication endpoints
 * 
 * US-01: Rate limit: 5 registration attempts per hour per IP
 * US-05: Rate limit for birth data and location search
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Generic rate limiter factory
 * Creates a rate limiter with custom limits
 */
export function rateLimiter(max: number, windowSeconds: number) {
  return rateLimit({
    windowMs: windowSeconds * 1000,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      // Use user ID if authenticated, otherwise use IP
      return (req as any).user?.id || req.ip || req.connection.remoteAddress || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again in ${Math.ceil(windowSeconds / 60)} minutes.`,
        },
      });
    },
  });
}

/**
 * Rate limiter for registration endpoint
 * 5 attempts per hour per IP
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again later.',
      retryAfter: '1 hour',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request): string => {
    // Use IP address as the key
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts from this IP. Please try again in 1 hour.',
        retryAfter: '1 hour',
      },
    });
  },
});

/**
 * Rate limiter for login endpoint
 * 10 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: '15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
        retryAfter: '15 minutes',
      },
    });
  },
});

/**
 * Rate limiter for magic link resend endpoint
 * 3 resends per hour per IP
 */
export const magicLinkResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RESEND_LIMIT_EXCEEDED',
      message: 'Too many magic link resend attempts. Please try again later.',
      retryAfter: '1 hour',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RESEND_LIMIT_EXCEEDED',
        message: 'Too many magic link resend attempts. Please try again later.',
        retryAfter: '1 hour',
      },
    });
  },
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  rateLimiter,
  registrationLimiter,
  loginLimiter,
  magicLinkResendLimiter,
  apiLimiter,
};
