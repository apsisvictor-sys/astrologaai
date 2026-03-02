/**
 * Cron Configuration Utilities
 * SECURITY: Validates CRON_SECRET at startup - no open endpoints
 */

/**
 * Get cron secret with validation
 * SECURITY FIX: Fails at startup if CRON_SECRET is not set
 * 
 * @throws Error if CRON_SECRET is not configured
 */
export function getCronSecret(): string {
  const secret = process.env.CRON_SECRET;
  
  if (!secret) {
    throw new Error(
      'SECURITY ERROR: CRON_SECRET environment variable is not set. ' +
      'Please configure CRON_SECRET before starting the server. ' +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  return secret;
}

/**
 * Validated cron secret (computed once at startup)
 */
export const CRON_SECRET = getCronSecret();
