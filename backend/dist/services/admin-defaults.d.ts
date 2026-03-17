/**
 * Admin Defaults
 * Seeds AdminConfig with model prices and alert thresholds on startup.
 * Uses createMany + skipDuplicates so existing admin-configured values are NEVER overwritten.
 *
 * To update prices: use the admin dashboard Model Config page,
 * or update AdminConfig rows directly. No code deploy needed.
 *
 * Price format: USD cents per 1M tokens
 *   e.g. claude-sonnet-4-6 input = 300 → $3.00 per 1M input tokens
 *
 * eur_usd_rate: stored as integer × 100
 *   e.g. 108 → 1.08 (1 EUR = 1.08 USD)
 *
 * alert thresholds: EUR cents
 *   e.g. 500 → 5.00 EUR
 */
export declare function seedAdminDefaults(): Promise<void>;
//# sourceMappingURL=admin-defaults.d.ts.map