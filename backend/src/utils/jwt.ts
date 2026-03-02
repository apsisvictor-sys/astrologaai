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
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      'SECURITY ERROR: JWT_SECRET environment variable is not set. ' +
      'Please configure JWT_SECRET before starting the server. ' +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }
  
  if (secret.length < 32) {
    console.warn(
      '[SECURITY WARNING] JWT_SECRET is less than 32 characters. ' +
      'Consider using a longer secret for better security.'
    );
  }
  
  return secret;
}

/**
 * JWT expiration configuration
 */
export const JWT_CONFIG = {
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

/**
 * Validated JWT secret (computed once at startup)
 */
export const JWT_SECRET = getJWTSecret();
