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
export declare function getCronSecret(): string | null;
/**
 * Whether cron authentication is configured.
 */
export declare function hasCronSecret(): boolean;
//# sourceMappingURL=cron.d.ts.map