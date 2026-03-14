# AstroLogAI — Master Roadmap & Todo

> **Single source of truth.** Last audited: 2026-03-14.
> Reflects actual codebase state — not aspirational.

---

## Core Infrastructure ✓

- [x] Express + TypeScript backend with helmet, CORS, rate limiting
- [x] Next.js 14 frontend with Tailwind CSS
- [x] PostgreSQL + Prisma ORM (schema: User, BirthProfile, BirthChart, ChartHistory, ChatSession, ChatMessage, Partner, Subscription, UsageRecord, NotificationPreference)
- [x] Supabase Auth + JWT authentication middleware
- [x] Google OAuth integration
- [x] Redis caching layer (session context, rate limits, health checks) — currently in-memory fallback only in production (see Task 10)
- [x] Socket.io WebSocket server for real-time streaming chat
- [x] Health check endpoints: `/health`, `/health/db`, `/health/redis`, `/health/astrology`, `/health/env`
- [x] Background chart regeneration processor (on birth data change)
- [x] Monthly query reset cron job

---

## AI Agent (Core Product) ✓

- [x] Autonomous agent engine via Vercel AI SDK `streamText` with tool calling
- [x] Anthropic Claude (primary) → OpenAI GPT-4o (fallback) provider selection
- [x] 10 astrological tools: natal chart, transits, synastry, progressions, solar return, relocation, composite, venus return, lunar return, solar arc directions
- [x] Tool access gated by subscription tier (FREE/PRO/PREMIUM)
- [x] Tier-aware system prompt injection
- [x] Tool call events streamed to frontend (`chat:tool_call`)
- [x] Stream cancellation support (AbortController)

---

## Astrology API Layer ✓

- [x] SDK: `@astro-api/astroapi-typescript` — all tools call SDK directly (orchestrator removed)
- [x] `createAstrologyTools` factory — all 8 tools → SDK endpoints
- [x] Global transits: `client.data.getGlobalPositions()` with 24h Redis cache
- [x] Personal daily horoscope: `client.horoscope.getPersonalDailyHoroscope()` with 24h cache
- [x] Transit house injection: `computeTransitHouses()` math in `transits.ts` — sky + house context for all users
- [x] Exponential backoff (3 retries, 1s → 30s max)
- [x] Circuit breaker pattern
- [x] Failure logging to Redis
- [x] Provider health check polling (60s interval, 5min cache)

---

## Chat System ✓

- [x] WebSocket-based streaming chat (Socket.io rooms)
- [x] Chat sessions with per-session message history
- [x] Session context stored in Redis
- [x] 100-message context window
- [x] Conversation title auto-generated from first message
- [x] Typing indicator events
- [x] Message deduplication via client-generated IDs
- [x] Guest chat → authenticated migration (SSE parse fix, timezone fix, migrateGuestSession helper, Google OAuth migration)

---

## Subscription & Billing ✓

- [x] 3 tiers: FREE (10q/mo, 4/day), PRO (unlimited), PREMIUM (unlimited + all tools)
- [x] Stripe integration
- [x] Scheduled downgrades
- [x] Monthly usage reset

---

## Rate Limiting ✓

- [x] Monthly + daily + burst limits enforced
- [x] Redis burst counter (60s sliding window)
- [x] 429 responses with Retry-After header
- [x] Localized error messages (BG/EN)
- [x] 80% usage warning header
- [x] Rate limit headers on all responses (X-RateLimit-*)
- [x] Fail-open on DB error

---

## User Features ✓

- [x] User registration + email verification
- [x] Birth data input with geocoding (location autocomplete)
- [x] Natal chart calculation + storage
- [x] Chart history archiving when birth data changes
- [x] Multi-birth-profile support (family members)
- [x] Partner management (add partner birth data for synastry) — PREMIUM-only, limit 10
- [x] Compatibility analysis: 5-category scoring (love, communication, trust, adventure, values) with Redis cache
- [x] Daily/weekly forecast generation — SDK-powered + LLM Oracle voice rewrite
- [x] Daily Horoscope Card — tier-gated life areas (FREE: love+career, PRO/PREMIUM: all 6)
- [x] PDF export of chart data — `professional-pdf-export.tsx` + `chart-download.tsx` (PNG/PDF)
- [x] Notification preferences (email/push/SMS toggles)
- [x] Language toggle (Bulgarian / English)
- [x] Language detection via Accept-Language header
- [x] Onboarding tutorial

---

## Frontend Pages & Components ✓

- [x] Auth forms (login, registration, Google OAuth)
- [x] Chat interface with streaming display
- [x] Oracle Welcome screen — Oracle persona glyph (pulsing ring), personalized greeting, value props, inline birth form
- [x] SVG Natal Chart Wheel — `circular-chart-wheel.tsx` (777 lines): all 14 planets, zodiac ring, 12 houses, aspect lines, entrance animation, interactive hover tooltips (EN/BG)
- [x] Aspect Explorer — interactive aspect filtering and modal details
- [x] Chart panel — BigThreeCard, PlanetTable, ElementsCard, AspectsSummary
- [x] Connection status indicator + WebSocket reconnection service
- [x] Typing indicator
- [x] Usage counter
- [x] Global nav + navigation
- [x] Partner card + form
- [x] Language switcher
- [x] Provider status indicator
- [x] Marketing chat preview
- [x] Daily Forecast page — `/forecast/page.tsx` with DailyHoroscopeCard
- [x] Weekly Forecast page — `/forecast/weekly/page.tsx`

---

## Admin Dashboard ✓

- [x] Admin auth middleware
- [x] 19 backend endpoints under `/api/v1/admin/*`
- [x] Overview page — metric cards, signups sparkline, tier donut, date range filters
- [x] Users page — paginated + searchable, tier/status filters, user detail modal, inline tier/suspend actions
- [x] Usage & Cost page — token charts, latency p50/p95/p99, cost by tier
- [x] Revenue page — MRR chart, new subs vs churn, Stripe data
- [x] Prompt Editor — split panel: list + editor + version history + restore
- [x] Model Config — per-tier model string inputs, hot-reload save
- [x] Discount Codes — table + create modal + Stripe coupon link
- [x] Referral Links — table + create modal + commission tracking

---

## Holistic Chart Reasoning (DESIGN-01) ✓

- [x] Layer 1: Expanded `generateChartSummary` — all 14 bodies, chart ruler + placement, MC, angular planets, stelliums, all aspects sorted by orb, dominant element + modality
- [x] Layer 2: Rewrote `ASTROLOGER_SYSTEM_PROMPT` — semantic question classification (8 types), depth rule (min 3-4 elements), special points guidance (Nodes, Chiron, Lilith, retrograde, 12th house)
- [x] Layer 3: Per-tier synthesis instruction — accurate tool lists, upsell language in Bulgarian, multi-tool synthesis guidance for PRO/PREMIUM
- [x] SYNASTRY READING PROTOCOL — all aspects sorted by orb, grouped into 5 thematic buckets, agent instructed to cover full picture
- [x] Aspect interpretation library (partial) — covers 9 romantic planet pairs (sun/moon/venus/mars combos) in `synastry.service.ts`. Missing: Saturn, Jupiter, Pluto, Uranus, Neptune aspects and all outer planet interactions.

---

## Bug Fixes ✓

- [x] BUG-01: `analyzePlanetPair` aspect lookup — finds strongest aspect (tightest orb) involving the planet across full synastry
- [x] BUG-02: PRO tier system prompt now accurately reflects tool access (FREE: natal only, PRO: natal + transits + solar return, PREMIUM: all 8)

---

## Code Quality ✓

- [x] REFACTOR-01: Model per tier driven by env vars — `MODEL_FREE`, `MODEL_PRO`, `MODEL_PREMIUM` — defaults: haiku-4-5 / sonnet-4-6 / opus-4-6
- [x] REFACTOR-02: Removed all `// @ts-ignore` from agent tool definitions
- [x] REFACTOR-03: Actual model ID tracked in chat metadata via `getModelIdForTier()`
- [x] REFACTOR-04: `processingTime` now records actual ms elapsed per stream
- [x] REFACTOR-05: Migrated `llm-legacy.ts` → `llm-helpers.ts`, deleted legacy file
- [x] REFACTOR-06: `MAX_CONTEXT_MESSAGES` = 100, auto-summary deprioritized
- [x] Deleted old LLM orchestrator, stripped dead GLM/MiniMax code
- [x] Winston structured error logger with console + file transports
- [x] Resend email integration (transactional emails active)
- [x] LlmUsage + SystemPrompt + AdminConfig + DiscountCode + ReferralLink DB tables migrated

---

## Outstanding Work

### HIGH — Sprint Tasks (next up)

- [ ] **Task 9 — Wire LlmUsage table** — populate `LlmUsage` after each LLM stream (date, tier, model, input/output tokens, latency). Currently table exists but is empty.
- [ ] **Task 10 — Re-enable Redis in production** — currently using in-memory fallback only. Wire Upstash credentials in Railway. Risk: multi-dyno cache isolation, Nominatim rate limit under load.

### MEDIUM — Planned Features

- [ ] **Facebook OAuth** — DECISION LOCKED 2026-03-13: Remove Magic Link from login/register forms, add Facebook OAuth via Supabase Facebook provider. Add FB app credentials to Railway env vars.
- [ ] **Forecast notifications** — hook daily horoscope into NotificationPreference (email channel via Resend). Schema already has `emailEnabled` flag.
- [ ] **ENH-09: Aspect Grid Matrix** — planet-vs-planet grid with aspect symbols (☌△□⚹☍) in matching colors. Data available from `rawChart.aspects`. Add `AspectGrid` component in `src/components/chart/`, as collapsible panel in `chart-panel.tsx`.

### LOW — Future / Backlog

- [ ] **ENH-02: DB schema cleanup** — `BirthData` and `Message` legacy models still in schema with deprecation notes. Write migration to move remaining records → new tables, drop old ones.
- [ ] **ENH-03: Compatibility cache invalidation** — when birth data changes, invalidate stale compatibility cache entries.
- [ ] **ENH-04: Stripe webhook hardening** — verify signature validation + add idempotency checks.
- [ ] **ENH-05: Rate limit fail-open audit** — add Redis-based fallback counter so limits still apply when Postgres is down.
- [ ] **ENH-06: WebSocket reconnection UX** — `reconnection.ts` exists, but spinner/toast/queuing UX not polished.
- [ ] **ENH-08: Multi-language expansion** — RO, RS, GR markets. i18n infrastructure (next-intl) already in place.
- [ ] **DESIGN-01 Future: Chart intake** — on first session, generate + store synthesis of user's top 5-7 life themes from natal chart, so Oracle always has a narrative foundation without re-calling the tool.
- [ ] **ENH-07: Aspect interpretation library (complete)** — current library only covers 9 romantic planet pairs. Needs Saturn, Jupiter, Pluto, Uranus, Neptune aspects for full coverage.
- [ ] **ENH-00: Professional PDF Export (server-side)** — client-side PDF exists. Server-side: pdfkit + `@resvg/resvg-js` for SVG→PNG, bilingual A4 layout with cover page. Currently backend returns graceful error when called.
- [ ] **Chart history UI** — backend archives on every birth data edit. Minimal "chart timeline" page or remove archiving. Decision: TBD.
- [ ] **Email onboarding sequences** — welcome email, chart-computed notification, weekly forecast digest. Needs Resend DKIM to propagate first.
- [ ] **Astrocartography map** — relocation tool returns text only. Needs Leaflet/Mapbox with astro lines for full experience.
- [ ] **Discount codes → Stripe checkout** — backend exists, pending pricing strategy decision.
- [ ] **Referral attribution UI** — backend fully wired. Pending: affiliate dashboard for referrers.

---

## Deferred / Won't Do (This Phase)

- **FEATURE-04: Real Session Summarization** — deprioritized. 100-message context window is sufficient. Revisit if users hit the cap regularly.
- **FEATURE-06: Push Notifications** — schema has `pushEnabled`, no delivery implemented. Not in active roadmap.
- **ENH-07: Aspect interpretation library** — DONE via `synastry.service.ts` (100+ interpretations).
