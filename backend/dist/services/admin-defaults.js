"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminDefaults = seedAdminDefaults;
const prisma_1 = require("../utils/prisma");
const SYSTEM_ADMIN = 'system';
const DEFAULTS = [
    // ── Anthropic model prices (as of 2026-03) ──────────────────────────────────
    // claude-haiku-4-5-20251001
    { key: 'price_input_claude-haiku-4-5-20251001', value: '80' }, // $0.80/1M
    { key: 'price_output_claude-haiku-4-5-20251001', value: '400' }, // $4.00/1M
    // claude-sonnet-4-6
    { key: 'price_input_claude-sonnet-4-6', value: '300' }, // $3.00/1M
    { key: 'price_output_claude-sonnet-4-6', value: '1500' }, // $15.00/1M
    // claude-opus-4-6
    { key: 'price_input_claude-opus-4-6', value: '1500' }, // $15.00/1M
    { key: 'price_output_claude-opus-4-6', value: '7500' }, // $75.00/1M
    // ── Currency ──────────────────────────────────────────────────────────────
    { key: 'eur_usd_rate', value: '108' }, // 1.08 × 100
    // ── Cost alert thresholds (EUR cents) ────────────────────────────────────
    { key: 'alert_threshold_free_eur_cents', value: '200' }, // 2.00€ — flag heavy free users
    { key: 'alert_threshold_pro_eur_cents', value: '500' }, // 5.00€ — 50% of 10€ subscription
    { key: 'alert_threshold_premium_eur_cents', value: '1000' }, // 10.00€ — 50% of 20€ subscription
];
async function seedAdminDefaults() {
    const data = DEFAULTS.map(d => ({
        key: d.key,
        value: d.value,
        updatedBy: SYSTEM_ADMIN,
    }));
    await prisma_1.prisma.adminConfig.createMany({
        data,
        skipDuplicates: true, // never overwrite values the admin has already set
    });
}
//# sourceMappingURL=admin-defaults.js.map