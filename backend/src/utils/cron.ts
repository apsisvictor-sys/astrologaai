/**
 * Cron Configuration Utilities
 *
 * Production reliability hardening:
 * - Do NOT crash whole API when CRON_SECRET is missing.
 * - Keep cron endpoints closed when secret is not configured.
 */

/**
 * Get cron secret from environment.
 * Returns null when not configured.
 */
export function getCronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || null;
}

/**
 * Whether cron authentication is configured.
 */
export function hasCronSecret(): boolean {
  return !!getCronSecret();
}
