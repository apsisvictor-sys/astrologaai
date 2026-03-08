/**
 * Rate Limiter Middleware
 * Implements rate limiting for authentication endpoints
 *
 * US-01: Rate limit: 5 registration attempts per hour per IP
 * US-05: Rate limit for birth data and location search
 */
/**
 * Generic rate limiter factory
 * Creates a rate limiter with custom limits
 */
export declare function rateLimiter(max: number, windowSeconds: number): import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter for registration endpoint
 * 5 attempts per hour per IP
 */
export declare const registrationLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter for login endpoint
 * 10 attempts per 15 minutes per IP
 */
export declare const loginLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
declare const _default: {
    rateLimiter: typeof rateLimiter;
    registrationLimiter: import("express-rate-limit").RateLimitRequestHandler;
    loginLimiter: import("express-rate-limit").RateLimitRequestHandler;
    apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
};
export default _default;
//# sourceMappingURL=rateLimiter.d.ts.map