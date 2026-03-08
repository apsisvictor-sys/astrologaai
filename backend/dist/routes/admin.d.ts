/**
 * Admin API Routes
 * All endpoints require authenticated admin user (email in ADMIN_EMAILS env var).
 *
 * GET  /admin/overview           — user counts, tier breakdown, signups, MRR, conversion
 * GET  /admin/users              — paginated user list with filters
 * GET  /admin/users/:id          — user detail
 * PATCH /admin/users/:id/tier   — manually override user tier
 * PATCH /admin/users/:id/suspend — suspend / unsuspend account
 * GET  /admin/usage              — LLM token usage + latency stats from ChatMessage metadata
 * GET  /admin/revenue            — Stripe revenue data
 * GET  /admin/prompts            — list system prompts
 * GET  /admin/prompts/:name      — get prompt content + version history
 * PUT  /admin/prompts/:name      — save new version and activate
 * GET  /admin/config/models      — get model overrides per tier
 * PUT  /admin/config/models      — save model overrides per tier
 * GET  /admin/discounts          — list discount codes
 * POST /admin/discounts          — create discount code
 * PATCH /admin/discounts/:id     — activate / deactivate
 * GET  /admin/referrals          — list referral links with stats
 * POST /admin/referrals          — create referral link
 * PATCH /admin/referrals/:id     — activate / deactivate
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=admin.d.ts.map