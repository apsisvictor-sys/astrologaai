# Core Quality Sprint — Implementation Plan
# 2026-03-13

> **For the implementer:** Stop before each task and present the product vision/options to Victor for approval before writing any code. This is non-negotiable per the agreed process.

**Goal:** Fix broken/fake astrological data, complete the conversion funnel, and use the full API SDK to deliver the most accurate astrology product possible.

**Architecture note:** Never run `tsc` locally (OOM). Edit both `.ts` AND `.js` dist files manually. SDK: `@astro-api/astroapi-typescript` — always consult `memory/astrology-api-reference.md` before API work.

**Current codebase state (as of 2026-03-13):**
- `backend/src/services/astrology.ts` — natal chart is FIXED, uses lat/lon+timezone, no fallback
- `backend/src/services/geocoding.ts` — FIXED, uses `geo-tz` for proper IANA timezone lookup
- `backend/src/services/transits.ts` — BROKEN: still calls `orchestrator.getTransits()` (old path)
- `backend/src/services/forecast.ts` — BROKEN: `calculateMoonPhase()` is a math approximation
- `backend/src/services/agent-tools/index.ts` — BROKEN: all 8 tools call old orchestrator paths
- `backend/src/services/llm-helpers.ts` — Oracle system prompt builder, pre-injects chart + transits
- `backend/src/services/llm.ts` — tier-based tool gating: FREE=0, PRO=2, PREMIUM=8
- `@astro-api/astroapi-typescript` is installed in `backend/` (hoisted to workspace root node_modules)
- SDK client: `new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY })`

**What "orchestrator" is:** An old internal abstraction at `backend/src/services/orchestrator.ts` (or similar) that uses wrong API endpoint paths. Do NOT use it. Use the SDK directly.

**Process agreed with Victor:** Before implementing each task, present the product vision and options. Wait for approval. Then implement.

---

## Task 1: Fix Global Sky Positions (Transits)

**Priority:** CRITICAL — affects every user's Oracle pre-injection and /transits page

**Problem:**
`getActiveTransitsForUser()` in `backend/src/services/transits.ts` calls `orchestrator.getTransits(dateStr)` which uses the wrong API path. Falls back to an in-house Swiss Ephemeris approximation. The Oracle's real-time sky awareness is currently either wrong or approximate.

**Files to touch:**
- `backend/src/services/transits.ts`
- `backend/dist/services/transits.js`

**SDK solution:**
```typescript
// Replace orchestrator.getTransits() with:
client.data.getGlobalPositions({
  year, month, day, hour, minute, second: 0,
  options: {
    active_points: ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn',
                    'Uranus','Neptune','Pluto','True_Node'],
    zodiac_type: 'Tropic',
  }
})
// Cache key: transits:api:${YYYY-MM-DD}, TTL: 1 day
// One call per day, shared across ALL users
```

**Product discussion required before implementing:**
- What location should we use for `getGlobalPositions`? It's location-independent (good — single call for all users)
- What time of day should we cache for? (Noon UTC? Midnight? When Oracle is first used that day?)
- Should we proactively refresh at midnight, or lazy-load on first request of the day?

---

## Task 2: Fix Moon Phase (Real Lunar Data)

**Priority:** HIGH — affects daily/weekly forecasts for all users

**Problem:**
`calculateMoonPhase()` in `backend/src/services/forecast.ts` is a mathematical approximation using a fixed anchor date. Not astronomically accurate for void-of-course, exact illumination percentage, or precise phase transitions.

**Files to touch:**
- `backend/src/services/forecast.ts`
- `backend/dist/services/forecast.js`

**SDK solution:**
```typescript
// Replace calculateMoonPhase(date) with:
client.data.getLunarMetrics({
  datetime_location: { year, month, day, hour, minute, latitude, longitude, timezone },
  language: 'en',
})
// Response: { moon_phase, illumination, void_of_course, ... }
// Cache key: lunar:${YYYY-MM-DD}, TTL: 1 day (phase changes are gradual)
```

**Product discussion required before implementing:**
- For moon phase, which location's coordinates should we use? (It's slightly location-dependent for void-of-course)
- Should we cache per-user or globally? (Moon phase is essentially global — small location differences don't matter for most purposes)
- Do we want void-of-course data surfaced to the user? If so, where (Oracle only, or UI indicator)?

---

## Task 3: Fix PRO/PREMIUM Agent Tools (SDK Migration)

**Priority:** CRITICAL — paying users get broken features

**Problem:**
All 8 tools in `backend/src/services/agent-tools/index.ts` call `orchestrator` with old endpoint paths:
- `calculateNatalChartTool` → orchestrator
- `analyzeTransitsTool` → orchestrator.getTransits()
- `calculateSynastryTool` → orchestrator
- `calculateProgressionsTool` → orchestrator
- `calculateSolarReturnTool` → orchestrator
- `calculateRelocationTool` → orchestrator
- `calculateCompositeTool` → orchestrator
- `calculateVenusReturnTool`, `calculateLunarReturnTool`, `calculateSolarArcTool` → orchestrator

**Files to touch:**
- `backend/src/services/agent-tools/index.ts`
- `backend/dist/services/agent-tools/index.js`

**SDK solutions per tool:**
```typescript
// Solar Return → client.charts.getSolarReturnChart()
// Lunar Return → client.charts.getLunarReturnChart()
// Synastry    → client.charts.getSynastryChart()
// Progressions → client.charts.getProgressions()
// Transit Chart → client.charts.getTransitChart()
// Synastry Report → client.analysis.getSynastryReport()
// Composite   → client.charts.getCompositeChart()
// Solar Arc   → client.charts.getDirections()
```

**Product discussion required before implementing:**
- For solar/lunar return: should the return location be the user's birth location or their current location? (Astrologically, current location is more relevant for timing of events)
- For synastry: the tool currently compares two people's natal charts. But we also have a `partner-form.tsx` for storing partner data. Should the Oracle automatically pull stored partners or always require the second person's data in-conversation?
- What should the Oracle show for progressions? Secondary progressions are psychological/inner — how do we want to present this in the chat UX?
- Relocation (astrocartography): this is a premium feature that needs a map visualization to be truly useful. Do we want a visual or just text interpretation from the Oracle?

---

## Task 4: Complete Guest Flow Migration

**Priority:** HIGH — primary conversion funnel

**Problem:**
Task 6+7 from the unified chat engine plan is marked `in_progress`. When a guest chats with Oracle and then registers/logs in, their conversation history and birth data should migrate seamlessly to their new account.

**Files involved:**
- `backend/src/routes/guestChat.ts` (import endpoint)
- `frontend/src/components/registration-form.tsx`
- `frontend/src/components/home/visitor-chat.tsx`
- `backend/src/controllers/guestChatController.ts`

**Product discussion required before implementing:**
- What exactly happens at the moment of registration? (Silent background import, or explicit "import my conversation" CTA?)
- If import fails (e.g., session expired), what does the user see?
- Should the birth data from the guest session auto-create their birth profile? Or ask them to confirm?
- What happens to the chat history? Do old messages appear in the authenticated chat UI?

---

## Task 5: Personal Daily Horoscope (New Feature)

**Priority:** HIGH — major product upgrade, replaces LLM-generated forecast

**Problem:**
Daily forecasts currently work by injecting birth data + transits into an LLM prompt and asking it to generate a forecast. The SDK has `client.horoscope.getPersonalDailyHoroscope()` which returns a structured, astrologically-calculated personal forecast: overall theme, rating (1-10), life areas (love/career/health/finances/spirituality), planetary influences, lucky elements, and tips.

This is faster (pre-calculated), cheaper (no LLM tokens), and more astrologically precise.

**Files to touch:**
- `backend/src/services/forecast.ts`
- `backend/dist/services/forecast.js`
- `backend/src/routes/forecasts.ts`
- `frontend/src/app/[locale]/(app)/forecast/` (page files)

**SDK solution:**
```typescript
client.horoscope.getPersonalDailyHoroscope({
  subject: { birth_data: { ...natalData } },
  date: 'YYYY-MM-DD',
  language: 'en',  // translate to BG ourselves
})
// Response: { date, overall_theme, overall_rating, life_areas[], planetary_influences[], lucky_elements, moon, tips[] }
// Cache: per user per day
```

**Product discussion required before implementing:**
- Do we replace the LLM-generated forecast entirely, or combine API data with LLM interpretation?
- The API returns a 1-10 daily rating — do we show this number to the user? (Could be controversial — "you're having a 3/10 day")
- The life_areas array has love/career/health/finances/spirituality — which should we show to FREE vs PRO users?
- Should this appear as a dedicated "Daily Forecast" page, or embedded in the chat as Oracle's morning greeting?
- Weekly forecast: SDK also has `getSignWeeklyHoroscope()` for sun-sign-based weekly. Do we use that or keep LLM-based?

---

## Task 6: Personal Transit Chart for Oracle (PRO Differentiator)

**Priority:** MEDIUM-HIGH — major accuracy upgrade for PRO users

**Problem:**
The Oracle currently pre-injects global sky positions (where planets are today). But `client.charts.getTransitChart()` computes the EXACT aspects between today's planets and THIS user's natal chart — including which natal houses are being activated. This is dramatically more meaningful astrologically.

Currently: "Mars is in Aries at 15°"
With personal transit chart: "Mars in Aries is conjunct your natal Sun in the 5th house — themes of creative energy and self-expression are activated"

**Files to touch:**
- `backend/src/services/transits.ts`
- `backend/dist/services/transits.js`
- `backend/src/services/llm-helpers.ts` (system prompt injection)

**SDK solution:**
```typescript
client.charts.getTransitChart({
  natal_subject: { birth_data: { ...natalData } },
  transit_datetime: { year, month, day, hour, minute, latitude, longitude, timezone },
  options: { house_system: 'P', zodiac_type: 'Tropic', active_points: [...] }
})
```

**Product discussion required before implementing:**
- Personal transit chart = 1 API call per user per day. At scale this is expensive. Should this be PRO-only, or available to FREE users too?
- The Oracle currently gets global positions pre-injected for FREE tier. If we upgrade FREE to personal transits, what becomes the PRO differentiator?
- Alternative: keep global positions for FREE Oracle injection, but let PRO users explicitly ask the Oracle to "analyze my transits today" which triggers the personal transit tool call

---

## Task 7: Partner Management UI for Synastry (PREMIUM)

**Priority:** MEDIUM — PREMIUM feature needs a clear entry point

**Problem:**
The `get_synastry` tool is available to PREMIUM Oracle users, the `partner-form.tsx` component exists, and the backend has partner routes — but there's no cohesive flow for PREMIUM users to:
1. Add a partner's birth data
2. Ask the Oracle to compare their charts
3. See a synastry overview

**Files to touch:**
- `frontend/src/app/[locale]/(app)/partners/` (new pages or enhance existing)
- `frontend/src/components/partners/partner-form.tsx`
- `backend/src/routes/partners.ts`

**Product discussion required before implementing:**
- Where should the synastry entry point live? (Dedicated "Compatibility" section in sidebar? Inside the Oracle chat as a suggestion? Both?)
- Should the Oracle proactively suggest synastry analysis when a user mentions a relationship, or only when explicitly asked?
- What's the visual output? Just Oracle text interpretation, or also a visual bi-wheel chart?
- How many partners can a user save? (Currently partner model exists — is there a limit?)

---

## Task 8: Oracle Welcome Screen & No-Birth-Data UX

**Priority:** MEDIUM — first impression moment, directly affects conversion

**Problem:**
When an authenticated user has no birth data, they see `OracleWelcome`. This is the single most important conversion moment in the app — it determines whether a new user understands the value proposition and adds their birth data. The quality of this screen determines the birth-data completion rate which determines everything else.

**Files to touch:**
- `frontend/src/components/chat/oracle-welcome.tsx`
- `frontend/src/app/[locale]/(app)/dashboard/page.tsx` (no-birth-data phase)

**Product discussion required before implementing:**
- What should the Oracle Welcome say? Should it feel like the Oracle is speaking, or a standard onboarding screen?
- Should it show example chart data / a teaser of what the user will see?
- What's the CTA: "Add birth data" button, or an inline mini-form?
- Should there be social proof on this screen? ("Join 10,000 users who have discovered their cosmic blueprint")
- The dashboard also has a `no-birth-data` phase with an "Add Birth Data" button — are these two screens the same flow or different contexts?

---

## Task 9: Wire LlmUsage Table

**Priority:** MEDIUM — operational visibility, cost control

**Problem:**
The `LlmUsage` table exists in the schema but is not populated on every chat message. Without this, there's no visibility into per-user costs, tier profitability, or unusual usage patterns. Also, usage limits can't be enforced accurately.

**Files to touch:**
- `backend/src/controllers/chatController.ts` (or wherever chat SSE is handled)
- `backend/src/routes/chat.ts`

**What to wire:**
- After each LLM stream completes, upsert into `LlmUsage` with: date, tier, model, input/output tokens, latency
- Also write per-message token data to `ChatMessage.metadata` (already partially done per admin dashboard notes)

**Product discussion required before implementing:**
- Should we enforce daily query limits based on LlmUsage or just use the existing counter?
- Do we want per-user cost alerts in the admin dashboard? (e.g., flag any user spending >$X/month)

---

## Task 10: Re-enable Redis for Production

**Priority:** MEDIUM — production readiness, cache consistency

**Problem:**
Redis is disabled, using in-memory fallback only. This means:
- Each Railway dyno has its own isolated cache
- Transit cache, location search cache, and chart cache are per-instance
- Nominatim rate limit (1 req/sec) will cause failures under concurrent load
- Global positions cache (1 call/day) will be duplicated across dynos

**Files to touch:**
- `backend/src/utils/redis.ts`
- Railway environment variables (Upstash credentials)

**Product discussion required before implementing:**
- Is Upstash the right choice, or should we use Railway's Redis add-on?
- What's the acceptable TTL hierarchy? (Chart: permanent in DB, no Redis needed. Transits: 1 day. Location search: 24h. Moon phase: 1 day.)
- Do we need Redis at all for caching, or should we lean more on the DB for persistence?

---

---

## Implementation Log

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Task 1 — Global transits | done | 2026-03-13 | SDK getGlobalPositions(), cache transits:global:${date}, 24h TTL, throws on failure |
| Task 2 — Moon phase | dropped | 2026-03-13 | Dropped — moon position from Task 1 SDK data is sufficient. Phase derived from Sun-Moon angle (free math). getLunarMetrics not worth extra API call. |
| Task 3 — Agent tools | done | 2026-03-13 | createAstrologyTools factory, all 8 tools → SDK, synastry/composite via stored partnerId |
| Task 4 — Guest migration | done | 2026-03-13 | SSE parse fix, timezone fix, migrateGuestSession helper, Google OAuth migration, dynamic title, failure notice |
| Task 5 — Personal horoscope | done | 2026-03-13 | SDK getPersonalDailyHoroscope + LLM Oracle voice rewrite + 24h cache. DailyHoroscopeCard UI. FREE sees love/career, PRO sees all 6. Dashboard card + /forecast page |
| Task 6 — Personal transit chart | done | 2026-03-13 | Skipped getTransitChart. Instead: computeTransitHouses() math in transits.ts (sign+degree→longitude→house). All users get sky+house injection. PRO/PREMIUM get planetaryInfluences from horoscope cache. Zero extra API calls. |
| Task 7 — Partner/synastry UI | done | 2026-03-13 | PREMIUM-only (limit 10). Tier gates updated (backend + panel + sidebar). All 3 pages already existed. Synastry + report pages fully functional. |
| Task 8 — Oracle welcome UX | done | 2026-03-13 | Oracle persona glyph (pulsing ring), personalized greeting, 3 value props, inline BirthDataWidget |
| Task 9 — LlmUsage wiring | done | 2026-03-14 | Daily aggregate upsert (fire-and-forget) in chat-handler. cost-calculator.ts service. Admin prices seeded via admin-defaults.ts on startup. Users page: High Cost badge + filter. |
| Task 10 — Redis re-enable | done | 2026-03-14 | Real Redis client re-enabled in redis.ts + dist. Connects via REDIS_URL (Upstash). Graceful memory fallback on error. PENDING: verify REDIS_URL is set in Railway dashboard. |
| Task 11 — Cache cleanup + Anthropic caching | done | 2026-03-14 | Removed wasteful Redis caches (session context, natal chart, compatibility, synastry). Implemented 2-layer Anthropic prompt caching in llm.ts: Layer 1 = static persona (all users), Layer 2 = user chart+transits+tier (per-session). |

---

## Deferred (Pending Product Decisions)

These are not in scope for this sprint but tracked here:

- **Facebook OAuth (replace Magic Link)** — DECISION LOCKED by Victor (2026-03-13): Remove Magic Link from login/register forms. Add Facebook OAuth instead. Uses Supabase Facebook provider. Add FB app credentials to Railway env vars.
- **Chart history UI** — backend archives on every edit. Build minimal "chart timeline" page or remove archiving logic. Decision: TBD.
- **Email onboarding sequences** — needs Resend DKIM to propagate first. Then: welcome email, chart-computed notification, weekly forecast digest.
- **Astrocartography map** — relocation tool currently returns text only. A proper implementation needs a map visualization (Leaflet or Mapbox with astro lines). Premium visual feature.
- **Discount codes → Stripe checkout** — backend exists, pending product decision on pricing strategy.
- **Referral attribution UI** — backend fully wired. Pending: affiliate dashboard for referrers.
