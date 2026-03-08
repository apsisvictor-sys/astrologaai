"use strict";
/**
 * Rate Limiter Middleware
 * Implements rate limiting for authentication endpoints
 *
 * US-01: Rate limit: 5 registration attempts per hour per IP
 * US-05: Rate limit for birth data and location search
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLimiter = exports.loginLimiter = exports.registrationLimiter = void 0;
exports.rateLimiter = rateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Generic rate limiter factory
 * Creates a rate limiter with custom limits
 */
function rateLimiter(max, windowSeconds) {
    return (0, express_rate_limit_1.default)({
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
        keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise use IP
            return req.user?.id || req.ip || req.connection.remoteAddress || 'unknown';
        },
        handler: (req, res) => {
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
exports.registrationLimiter = (0, express_rate_limit_1.default)({
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
    keyGenerator: (req) => {
        // Use IP address as the key
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    handler: (req, res) => {
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
exports.loginLimiter = (0, express_rate_limit_1.default)({
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
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    handler: (req, res) => {
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
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
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
exports.default = {
    rateLimiter,
    registrationLimiter: exports.registrationLimiter,
    loginLimiter: exports.loginLimiter,
    apiLimiter: exports.apiLimiter,
};
//# sourceMappingURL=rateLimiter.js.map