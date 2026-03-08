"use strict";
/**
 * Cron Configuration Utilities
 *
 * Production reliability hardening:
 * - Do NOT crash whole API when CRON_SECRET is missing.
 * - Keep cron endpoints closed when secret is not configured.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCronSecret = getCronSecret;
exports.hasCronSecret = hasCronSecret;
/**
 * Get cron secret from environment.
 * Returns null when not configured.
 */
function getCronSecret() {
    const secret = process.env.CRON_SECRET?.trim();
    return secret || null;
}
/**
 * Whether cron authentication is configured.
 */
function hasCronSecret() {
    return !!getCronSecret();
}
//# sourceMappingURL=cron.js.map