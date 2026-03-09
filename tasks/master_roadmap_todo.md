# AstroLogAI — Master Roadmap & Todo

## What Has Been Built

### Core Infrastructure
- [x] Express + TypeScript backend with helmet, CORS, rate limiting
- [x] Next.js 14 frontend with Tailwind CSS
- [x] PostgreSQL + Prisma ORM (schema: User, BirthProfile, BirthChart, ChartHistory, ChatSession, ChatMessage, Partner, Subscription, UsageRecord, NotificationPreference)
- [x] Supabase Auth + JWT authentication middleware
- [x] Google OAuth integration
- [x] Redis caching layer (session context, rate limits, health checks)
- [x] Socket.io WebSocket server for real-time streaming chat
- [x] Health check endpoints: `/health`, `/health/db`, `/health/redis`, `/health/astrology`, `/health/env`
- [x] Background chart regeneration processor (on birth data change)
- [x] Monthly query reset cron job

### AI Agent (Core Product)
- [x] Autonomous agent engine via Vercel AI SDK `streamText` with tool calling
- [x] Anthropic Claude (primary) → OpenAI GPT-4o (fallback) provider selection
- [x] 10 astrological tools: natal chart, transits, synastry, progressions, solar return, relocation, composite, venus return, lunar return, solar arc directions
- [x] Tool access gated by subscription tier (FREE/PRO/PREMIUM)
- [x] Tier-aware system prompt injection
- [x] Tool call events streamed to frontend (`chat:tool_call`)
- [x] Stream cancellation support (AbortController)

### Astrology API Layer
- [x] AstrologyOrchestrator: astrology-api.io (primary) → Swiss Ephemeris (fallback)
- [x] Exponential backoff (3 retries, 1s → 30s max)
- [x] Circuit breaker pattern
- [x] Failure logging to Redis
- [x] Provider health check polling (60s interval, 5min cache)
- [x] Manual provider override via admin API

### Chat System (US-07, US-09, US-10)
- [x] WebSocket-based streaming chat (Socket.io rooms)
- [x] Chat sessions with per-session message history
- [x] Session context stored in Redis
- [x] Session summary for long conversations (basic implementation)
- [x] Conversation title auto-generated from first message
- [x] Typing indicator events
- [x] Message deduplication via client-generated IDs

### Subscription & Billing (US-34)
- [x] 3 tiers: FREE (10q/mo, 4/day), PRO (unlimited), PREMIUM (unlimited + all tools)
- [x] Stripe integration
- [x] Scheduled downgrades
- [x] Monthly usage reset

### Rate Limiting (US-36, US-37)
- [x] Monthly + daily + burst limits enforced
- [x] Redis burst counter (60s sliding window)
- [x] 429 responses with Retry-After header
- [x] Localized error messages (BG/EN)
- [x] 80% usage warning header
- [x] Rate limit headers on all responses (X-RateLimit-*)
- [x] Fail-open on DB error

### User Features
- [x] User registration + email verification
- [x] Birth data input with geocoding (location autocomplete)
- [x] Natal chart calculation + storage
- [x] Chart history archiving when birth data changes
- [x] Multi-birth-profile support (family members)
- [x] Partner management (add partner birth data for synastry)
- [x] Compatibility analysis: 5-category scoring (love, communication, trust, adventure, values) with Redis cache
- [x] Daily/weekly forecast generation
- [x] PDF export of chart data
- [x] Notification preferences (email/push/SMS toggles)
- [x] Language toggle (Bulgarian / English)
- [x] Language detection via Accept-Language header
- [x] Onboarding tutorial

### Frontend Components
- [x] Auth forms (login, registration, OAuth)
- [x] Chat interface with streaming display
- [x] Connection status indicator
- [x] Typing indicator
- [x] Usage counter
- [x] Global nav + navigation
- [x] Partner card + form
- [x] Language switcher
- [x] Provider status indicator
- [x] Onboarding tutorial component
- [x] Marketing chat preview

### Stitch Design References
- [x] Multiple design system variants in `/frontend/stitch_references/`
  (Void Prism, Deep Nebula, Ethereal Aura themes)

---

## Bug Fixes (High Priority — Do These First)

### BUG-01: `analyzePlanetPair` aspect lookup is broken
**File:** `backend/src/services/compatibility.ts:708`
**Issue:** The `find()` condition is `(a.userPlanet === planet && a.partnerPlanet === planet)` — both sides check the same planet name, so it only matches when both people have the SAME planet in the same position. It never actually finds cross-chart aspects. This silently corrupts all compatibility planetary analysis scores.
**Fix:** Rewrite the condition to match a specific user planet against any partner planet aspect.
- [x] Fix `analyzePlanetPair` aspect lookup logic — now finds strongest aspect (tightest orb) involving the planet across the full synastry, not just same-planet-to-same-planet

### BUG-02: PRO tier system prompt claims tools that aren't enabled
**File:** `backend/src/services/llm.ts:123`
**Issue:** System prompt tells PRO users they have "Solar Return and Relocation" access, but the tool gating code only gives PRO `get_transits`. Users receive misleading promises → agent tells them they can't use tools it just said they have.
**Fix:** Update the PRO system prompt to accurately reflect what PRO gets (natal chart + transits only).
- [x] Correct PRO tier system prompt to match actual tool access — restructured tiers: FREE (natal only), PRO (natal + transits + solar return), PREMIUM (all 8 tools). All three system prompts rewritten to be accurate, descriptive, and provide proper upsell guidance in Bulgarian.

---

## Code Quality (Medium Priority)

### REFACTOR-01: Model configuration — env-var driven, per-tier, multi-provider
**File:** `backend/src/services/llm.ts`
**Issue:** Model hardcoded to `claude-3-5-sonnet-20240620` — outdated, inflexible, same model for all tiers.
**Fix (implemented):** Model per tier driven by environment variables with sensible defaults. Provider auto-detected from model ID prefix. Tier passed into `getProviderModel()` so each tier gets its own model.
- Default models: FREE → `claude-haiku-4-5-20251001`, PRO → `claude-sonnet-4-6`, PREMIUM → `claude-opus-4-6`
- Env vars: `MODEL_FREE`, `MODEL_PRO`, `MODEL_PREMIUM` — change without touching code
- [x] Upgrade models and make per-tier, env-var configurable

### REFACTOR-02: Fix `// @ts-ignore` in agent tool definitions
**File:** `backend/src/services/agent-tools/index.ts`
**Issue:** Every tool uses `// @ts-ignore` to suppress type errors between Vercel AI SDK tool types and the execute function return types.
**Fix:** Use `tool()` with proper generic type parameters or cast the return type correctly.
- [x] Remove `// @ts-ignore` from all 8 agent tools with proper typing — removed `: any` type annotations and `// @ts-ignore` comments; Vercel AI SDK `tool()` infers parameter types from Zod schemas natively

### REFACTOR-03: Hardcoded model name in saved chat metadata
**File:** `backend/src/socket/chat-handler.ts:388` and `:415`
**Issue:** Model name saved to DB is determined by checking env vars (`process.env.ANTHROPIC_API_KEY ? 'claude-3.5-agent' : 'gpt-4o-agent'`), not from the actual Vercel AI SDK response. If provider switches, metadata is wrong.
**Fix:** Capture the model name from the `streamText` result's `response.modelId` and pass it to the chat handler for storage.
- [x] Track actual model ID in chat metadata — exports `getModelIdForTier(tier)` from `llm.ts`, used in `chat-handler.ts` for both DB save and socket event

### REFACTOR-04: Add `processingTime` tracking
**File:** `backend/src/socket/chat-handler.ts:418`
**Issue:** `processingTime: 0` with a TODO comment — actual generation time is never recorded.
**Fix:** Record `Date.now()` before the stream starts and compute elapsed on completion.
- [x] Track actual processing time — `Date.now()` recorded before stream starts, elapsed computed on completion

### REFACTOR-05: Migrate `llm-legacy.ts` remaining content
- [x] Renamed to `llm-helpers.ts` — all prompt/chart helpers moved, `llm.ts` imports updated, `llm-legacy.ts` deleted

### REFACTOR-06: Improve session context window
- [x] Increased `MAX_CONTEXT_MESSAGES` to 100 — users get full conversation continuity up to 100 exchanges, well within any model's context window
- [x] Removed `SUMMARY_THRESHOLD` — auto-summary deprioritized (see FEATURE-04 note below; typical conversations never approach context limits so summarization adds complexity without benefit)

---

## Missing Features (Planned)

### FEATURE-01: SVG Natal Chart Wheel Visualization
**Status:** Noted in SPRINT3.md as missing — current display is card-based
**What's needed:** Interactive SVG wheel showing planets in their houses with aspect lines
**Scope:** Frontend component only, data already available from `BirthChart.chartData`
- [ ] Build SVG natal chart wheel component
- [ ] Add planet glyphs and aspect lines
- [ ] Add interactive tooltips per planet/house (US-13)

### FEATURE-02: Daily & Weekly Forecast Pages (US-15, US-16)
**Status:** `forecast.ts` service exists but frontend pages are incomplete
**What's needed:** Frontend pages pulling from `/api/v1/forecasts`, displaying personalized daily/weekly cosmic weather
- [ ] Complete daily forecast frontend page
- [ ] Complete weekly forecast frontend page
- [ ] Add forecast notifications (hook into NotificationPreference)

### FEATURE-03: Chart Component Education (US-13)
**Status:** Partially planned
**What's needed:** When user clicks a planet/house in the chart, show an explanation panel with astrological meaning in their language
- [ ] Build interactive planet/house detail panel
- [ ] Write BG/EN interpretation copy for all major placements

### DESIGN-01: Holistic Chart Reasoning — The Personal Astrologer Intelligence Layer
**Priority: High. This is the core product differentiator.**

**The problem:**
Most users ask life questions, not astrological ones:
- "What can you tell me about myself?"
- "What can I expect this year?"
- "Why does this keep happening to me?"
- "Why do I feel this way right now?"
- "Am I on the right path?"

They do not ask: "What does my Venus in Leo in the 5th house mean?" — that's an astrologer's question, not a user's question.

The current agent receives a partial chart summary and answers using a single tool call. For life questions, this produces shallow, one-dimensional answers. A real astrologer holds the ENTIRE chart and synthesizes multiple elements into a coherent, meaningful response.

**What needs to be built — 3 layers:**

**Layer 1: Full chart context in the system prompt** (`llm-legacy.ts` → `generateChartSummary`)
Current summary only covers Sun/Moon/Rising + 5 planets + 5 aspects. Must expand to:
- All planets with sign, house, degree, retrograde status
- ALL major aspects (conjunction, opposition, trine, square, sextile) sorted by orb
- Elemental and modal balance (dominant element/mode)
- Chart ruler + its placement (e.g., Scorpio Rising → ruler is Pluto in 3rd house in Capricorn)
- Angular planets (1st/4th/7th/10th house placements — most powerful)
- Any chart patterns (stellium, T-square, grand trine, yod)
- Dominant themes extracted from the above

This gives the agent a complete, holistic picture before it even calls a tool.

**Layer 2: Semantic question decomposition + routing** (`llm.ts` system prompt)
The agent must be instructed to classify the user's question internally before responding:
- **Identity/personality** ("who am I?", "tell me about myself") → holistic natal reading: Sun (core identity), Moon (emotional nature), Rising (outer expression), chart ruler, dominant element, strongest aspects, angular planets
- **Timing/current events** ("what's happening to me now?", "why is this period so intense?") → transits (+ progressions if PREMIUM) × natal chart — what's being activated and why
- **Year ahead** ("what can I expect this year?") → Solar Return (if PRO/PREMIUM) + major transits for the year
- **Relationships** ("why do I attract X?", "what about love?") → Venus/Moon/7th house from natal + synastry if partner exists
- **Career/purpose** ("what am I here to do?") → 10th house, Midheaven sign/ruler, Saturn, Sun, North Node
- **Emotional patterns** ("why do I feel this way?") → Moon, 4th house, water placements, Moon aspects

The agent should **always address at least 3-4 chart elements** in response to any life question, not just one.

**Layer 3: Multi-tool synthesis instruction**
For PRO/PREMIUM users, the agent should chain tools intelligently:
- "What can I expect this year?" → call `get_natal_chart` (if not in context) + `get_solar_return` + `get_transits` → synthesize all three into a narrative
- "Why is this happening to me right now?" → call `get_transits` + `get_progressions` (PREMIUM) → explain which natal points are being activated and what the psychological meaning is
- "What does my future hold for relationships?" → `get_synastry` (if partner exists) + `get_venus_return` (PREMIUM) → timing meets compatibility

**Key principle (noted from product discussion):**
Depth and comprehensiveness in the agent's answers are NOT primarily a function of how many tools are called. The natal chart tool alone returns an enormous dataset — 10+ planets with signs/houses/degrees, all major aspects, elemental and modal balance, chart patterns, angular placements. This covers 70-80% of what astrology for a user is about. Even a FREE tier user should experience genuinely rich, multi-dimensional answers. Tools add *temporal* and *relational* dimensions (what's happening now, what this year brings, how I relate to another person) — but the core of who someone is lives entirely in the natal chart. The agent must be instructed to mine this data deeply on every tier, not just on PREMIUM.

**Implementation order:**
- [x] Layer 1: Expanded `generateChartSummary` — all 14 bodies, chart ruler + placement, MC, angular planets, stelliums by sign and house, all aspects sorted by orb, dominant element + modality
- [x] Layer 2: Rewrote `ASTROLOGER_SYSTEM_PROMPT` — semantic question classification (8 types), depth rule (min 3-4 elements per answer), chart survey protocol, aspect interpretation by orb, special points guidance (Nodes, Chiron, Lilith, retrograde, 12th house)
- [x] Layer 3: Per-tier synthesis instruction injected in `llm.ts` — accurate tool lists per tier, upsell language in Bulgarian, multi-tool synthesis guidance for PRO/PREMIUM
- [x] Added 2 new tools: `get_lunar_return` (PRO+) and `get_solar_arc` (PREMIUM) — full stack: interface types, provider implementation, orchestrator proxy, agent tool, tier gating, subscription config
- [x] Fixed double-history bug — conversation history sent as structured messages array only, not also embedded in system prompt
- [ ] Future: "Chart intake" — on first session, agent generates and stores a synthesis of the user's top 5-7 life themes from their full natal chart, so it always has a rich narrative foundation without recalling the tool every message

---

### FEATURE-03b: Comprehensive Synastry Data for the AI Agent
**Context:** The compatibility report card correctly uses the single tightest-orb aspect per planet for scoring (fixed in BUG-01). But when the user asks the chatbot about compatibility, the agent should discuss ALL significant aspects — not just the top one.
**Current state:** `get_synastry` tool in `agent-tools/index.ts` returns only `keyAspects: synastry.aspects.slice(0, 10)` — 10 aspects, unordered, with minimal interpretation data.
**What's needed:**
- **Stage 1 — Richer tool return** (`agent-tools/index.ts`): Return all significant aspects sorted by orb, grouped thematically (romantic/emotional, intellectual/communicative, tension/challenge, transformative), with the `nature` and existing `interpretation` text included per aspect. Remove the hard slice(0,10) cap.
- **Stage 2 — System prompt guidance** (`llm-legacy.ts` / `llm.ts`): Add explicit instruction to the astrologer persona: when discussing synastry, work through aspects in order of strength (orb), cover the full picture — not just the strongest — and organize by theme.
- **Stage 3 — Interpretation library** (ENH-07): Pre-written astrologically grounded text per planet-combination × aspect type (Venus trine Moon, Sun square Saturn, etc.) for the agent to draw from.
**Order:** Do Stage 1 + 2 soon (after Bug 2). Stage 3 is a larger project.
- [x] Stage 1: Expand `get_synastry` tool return — all aspects sorted by orb, grouped into 5 thematic buckets (romantic_emotional, communicative, transformative, tension, core_energy), nature field included, slice(0,10) cap removed
- [x] Stage 2: Added SYNASTRY READING PROTOCOL to system prompt — instructs agent to cover all 5 thematic groups in orb order, synthesize at the end, be honest about challenges
- [ ] Stage 3: Build aspect interpretation library (ENH-07)

### FEATURE-04: Real Session Summarization
**Status:** Deprioritized — 100-message context window makes this unnecessary for typical conversations. Revisit only if users regularly hit the 100-message cap or context costs become a concern at scale.

### FEATURE-05: Admin Dashboard
**Status:** Admin auth middleware exists but no dashboard UI
**What's needed:** Internal page for monitoring provider health, usage stats, user management
- [ ] Build admin dashboard (provider status, usage graphs, user list)

### FEATURE-06: Push Notifications
**Status:** Schema has `pushEnabled` in NotificationPreference, no delivery implemented
**What's needed:** Web push or mobile push for daily horoscope, transit alerts
- [ ] Implement web push notification delivery
- [ ] Wire daily forecast cron to notification delivery

### FEATURE-07: Email Delivery
**Status:** Email notifications are in the schema but no sending is implemented
**What's needed:** Transactional email service (Resend/SendGrid) for horoscopes, alerts, and auth emails
- [ ] Integrate transactional email provider
- [ ] Daily horoscope email template (BG/EN)
- [ ] Email verification flow (currently Supabase only)

---

## Enhancements (Lower Priority / Future)

### ENH-01: Structured error logging / observability
Replace scattered `console.error` calls with a structured logger (e.g., Pino) with request IDs for proper tracing in production.

### ENH-02: DB schema cleanup — remove legacy models
`BirthData` and `Message` models are deprecated but kept for backward compat. Write a migration that moves any remaining legacy records to `BirthProfile`/`ChatMessage` and removes the old tables.

### ENH-03: Compatibility cache invalidation on birth data change
When a user's birth data is updated (triggering chart regeneration), their compatibility cache entries should also be invalidated. Currently stale compatibility scores may be served.

### ENH-04: Stripe webhook hardening
Verify Stripe webhook signature validation is implemented. Add idempotency checks so duplicate webhook events don't double-process tier changes.

### ENH-05: Rate limit fail-open audit
The query limit middleware explicitly fails open (allows requests) on DB error. Add a Redis-based fallback count so limits still apply even when Postgres is down.

### ENH-06: Frontend WebSocket reconnection UX
The reconnection service exists (`reconnection.ts`) but the frontend UX during reconnect (spinner, message queuing, toast notifications) should be polished.

### ENH-00: Professional PDF Export — Beautiful Client-Facing Natal Chart Report
**Status:** Backend `canvas` + `pdfkit` deps removed (were crashing Railway builds; feature was never implemented, only a stub existed).
**Current state:** Users can download chart as PNG or basic screenshot-PDF via `ChartDownload` component (client-side, `html2canvas` + `jsPDF`). The `ProfessionalPDFExport` button calls the backend which returns a graceful error.
**What's needed:**
- Beautifully formatted A4 PDF with the Void Prism design aesthetic
- SVG chart wheel rendered server-side (use `sharp` or `@resvg/resvg-js` — no native compilation needed)
- Planet positions table, house cusps, aspects summary — all bilingual (BG/EN)
- Cover page with the user's name, birth data, and logo
- Consider: pdfkit for layout, `@resvg/resvg-js` to convert the existing SVG chart to PNG for embedding
**Priority:** Medium — clients will love a polished downloadable report

### ENH-07: Aspect interpretation library
The compatibility service uses hard-coded interpretation templates. Build a richer interpretation database with more nuanced descriptions per aspect type × planet combination.

### ENH-09: Natal Chart — Aspect Grid Matrix
A planet-vs-planet grid table panel shown alongside the chart wheel. Each cell shows the aspect symbol (☌△□⚹☍) in the appropriate color, or "—" for no significant aspect. Matches the `void_prism_component_suite_v3` reference design.
- Add `AspectGrid` component in `src/components/chart/`
- Add it as a collapsible panel in `chart-panel.tsx` below the AspectsSummary list
- The data is already available from `rawChart.aspects` (no backend change needed)

### ENH-08: Multi-language expansion
Currently BG + EN. Adding more languages (RO, RS, GR) would expand the Balkan market. The i18n infrastructure (next-intl) is already in place.

---

## Completed Cleanup (Done This Session)

- [x] Deleted old LLM orchestrator (`llm-orchestrator.ts`, `openai-provider.ts`, `glm-provider.ts`, `llm-provider.interface.ts`, `llm/index.ts`)
- [x] Deleted old orchestrator test file
- [x] Stripped dead GLM/MiniMax streaming code from `llm-legacy.ts`
- [x] Simplified `routes/llm.ts` to use agent stubs (removed 300+ lines of orchestrator-based logic)
- [x] Fixed `services/llm.ts` ChatMessage import (removed reference to deleted interface file)
- [x] Updated `forecast.ts` to import `chatCompletion` from `services/llm` (agent-based, Claude/GPT-4o)
- [x] Deleted 19 outdated docs: completion summaries, changelogs, sprint docs, verification reports
