/**
 * JWT Configuration Utilities
 * SECURITY: Validates JWT secret at startup - no insecure fallbacks
 */
/**
 * Get JWT secret with validation
 * SECURITY FIX: Fails at startup if JWT_SECRET is not set
 *
 * @throws Error if JWT_SECRET is not configured
 */
export declare function getJWTSecret(): string;
/**
 * JWT expiration configuration
 */
export declare const JWT_CONFIG: {
    expiresIn: string;
    refreshExpiresIn: string;
};
/**
 * Validated JWT secret (computed once at startup)
 */
export declare const JWT_SECRET: string;
//# sourceMappingURL=jwt.d.ts.map