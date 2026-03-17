# AstrologaAI — Master Roadmap
# Last updated: 2026-03-13

> Tracks all sprint plans, their status, and the overall product direction.
> Full plan details: `docs/plans/`

---

## Current Sprint: Core Quality (2026-03-13)
**Plan:** `docs/plans/2026-03-13-core-quality-sprint.md`
**Goal:** Fix broken astrological data, complete conversion funnel, migrate to full SDK

### Critical (Broken for users today)
- [ ] **Task 1** — Fix global sky positions: replace `orchestrator.getTransits()` with `client.data.getGlobalPositions()` in `transits.ts`
- [ ] **Task 2** — Fix moon phase: replace `calculateMoonPhase()` approximation with `client.data.getLunarMetrics()` in `forecast.ts`
- [ ] **Task 3** — Fix PRO/PREMIUM agent tools: migrate all 8 tools in `agent-tools/index.ts` from broken orchestrator to correct SDK endpoints

### High (Revenue & Conversion)
- [ ] **Task 4** — Complete guest flow migration (Task 6+7 from unified-chat plan, still in_progress)
- [ ] **Task 5** — Personal daily horoscope: use `client.horoscope.getPersonalDailyHoroscope()` instead of LLM-generated forecasts
- [ ] **Task 6** — Personal transit chart: use `client.charts.getTransitChart()` for PRO Oracle injection

### Medium (Product Completeness)
- [ ] **Task 7** — Partner management UI and synastry entry point for PREMIUM users
- [ ] **Task 8** — Oracle welcome screen & no-birth-data UX audit and redesign
- [ ] **Task 9** — Wire `LlmUsage` table on every chat completion
- [ ] **Task 10** — Re-enable Redis (Upstash) for production cache consistency

---

## Completed Sprints

### Step 11: Admin Dashboard ✓ (2026-03-08)
**Plan:** `frontend/tasks/todo.md`
Full admin app: overview, users, usage/cost, revenue, prompt editor, model config, discount codes, referral links.

### Dashboard Chart Redesign ✓ (2026-03-11)
**Plan:** `docs/plans/2026-03-11-dashboard-chart-redesign.md`
CircularChartWheel (Void Prism colors, real data), PlanetDataPanel, adapt-chart-for-wheel adapter.

### Referral Attribution ✓ (2026-03-10)
**Plan:** `docs/plans/2026-03-10-referral-attribution.md`
Referral slugs, click tracking, registration capture, Stripe discount codes, ReferralConversion on payment.

### Product Audit Fixes ✓ (2026-03-10)
**Plan:** `docs/plans/2026-03-10-product-audit-fixes.md`
User suspension, notification settings cleanup, Active Transits page (real API + Oracle injection).

### Unified Chat Engine ✓ (2026-03-10)
**Plan:** `docs/plans/2026-03-10-unified-chat-engine.md`
Single buildSystemPrompt + streamChatCompletion for all users. Guest session + migration. Token auto-refresh.

### Active Transits Sprint 1 ✓ (2026-03-10)
**Plan:** `docs/plans/2026-03-10-active-transits-sprint1.md`

### Frontend Redesign ✓ (2026-03-07)
**Plan:** `docs/plans/2026-03-07-frontend-redesign-plan.md`

---

## Deferred (Pending Decisions)

| Item | Blocker | Notes |
|------|---------|-------|
| Chart history UI | Product decision | Backend archives charts on every edit. Build "chart timeline" or remove? |
| Email onboarding sequences | Resend DKIM DNS propagation | Welcome, chart-computed, weekly digest |
| Astrocartography map visual | Engineering effort | Needs Leaflet/Mapbox + astro line rendering. PREMIUM feature. |
| Discount codes → Stripe checkout | Product decision | Backend exists, pricing strategy TBD |
| Referral affiliate dashboard | Product decision | Affiliate-facing view of their conversions/commissions |
| Cloudflare Turnstile on guest chat | Traffic trigger | Add when daily guest sessions exceed ~100 or abuse detected |

---

## API Budget Reference (astrology-api.io)
- 50 req/min max, 5 concurrent/sec optimal
- Natal charts: 1 call per birth profile — stored in DB forever
- Global positions: 1 call/day — shared all users
- Personal transit chart: 1 call/user/day (PRO+)
- Personal daily horoscope: 1 call/user/day
- Moon phase: 1 call/day (or 1/user/day) — cached
- Full SDK reference: `memory/astrology-api-reference.md`
