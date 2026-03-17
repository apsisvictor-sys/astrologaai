# AstroLogAI — Master Roadmap & Source of Truth
> **Single source of truth.** Last updated: 2026-03-17 (birth_data removed, 12-area horoscope, b8f1f22).
> All bugs found during testing, all pending work, all future plans live here.
> When testing resumes (Section 7+), new bugs get added to this file.

---

## Pending Manual Actions (Victor must do these)

| Action | Why | Unblocks |
|--------|-----|---------|
| Create Google Cloud project → enable Maps JS API + Places API + Geocoding API + Time Zone API | Location autocomplete + timezone accuracy | ENH-02, BUG-04 stopgap |
| Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to Vercel env vars | Frontend Places autocomplete | ENH-02 |
| Add `GOOGLE_MAPS_API_KEY` to Railway env vars | Backend Time Zone API | ENH-02 |
| Get Google OAuth client ID + secret from same Google Cloud project → add to Railway | Google login | FEAT-01 |
| Create Facebook Developer App → get App ID + Secret → add to Railway | Facebook login replacing Magic Link | FEAT-02 |

---

## 🚀 Ready to Deploy (code done locally, one deploy batch)

| # | What | Files |
|---|------|-------|
| BUG-01 | ✅ Guest session localStorage cleared on login/register | `frontend/src/lib/auth-context.tsx` |
| BUG-02 | ✅ Swiss Ephemeris second provider removed | `astrology-orchestrator.ts`, `services/astrology/index.ts`, `routes/astrology.ts` |
| BUG-03 | ✅ Login error shows correctly (submitError state + min-h reserved space) | `frontend/src/components/login-form.tsx`, `frontend/src/lib/auth-context.tsx` |
| BUG-09 | ✅ Dashboard quick action labels fixed (Chat/Forecast/Partners) | `frontend/src/app/[locale]/(app)/dashboard/page.tsx` |
| BUG-10 | ✅ FREE tier DailyHoroscopeCard shows 2 free sections | `frontend/src/components/forecast/daily-horoscope-card.tsx` |
| BUG-11 | ✅ Chat in sidebar nav, dashboard CTA → /chat | `frontend/src/components/shell/sidebar-nav.tsx`, `dashboard/page.tsx` |
| BUG-15 | ✅ Oracle language default fixed (bg → en) | `middleware/languageDetection.ts` |
| BUG-16 | ✅ New Oracle system prompt written by Opus | `services/llm-helpers.ts` |
| UI | ✅ CosmicSpinner — unified orbital loading animation | `spinner.tsx` + login-form, registration-form, forecast-panel, chart-loading |

**Deploying now — 2026-03-17.**

---

## 🔴 Active Bugs (code fix needed)

### BUG-04 — Location search hits 429 and silently breaks
- **Priority:** SKIPPED — superseded by ENH-02 (Google Places replaces Nominatim entirely)
- **⚠️ PENDING MANUAL ACTION:** Victor must create Google Cloud project + get API keys before ENH-02 can be implemented

---

### BUG-06 — ASC/house discrepancy vs astro-seek for polar latitudes
- **Priority:** Medium — affects users born above Arctic Circle (~0.1% of users)
- **Root cause:** Placidus is mathematically undefined above 66.5°N. Different software implements different approximation algorithms. Also: our Nominatim coordinates differ from astro-seek's (BUG-08 is a contributor).
- **Actions:**
  1. After BUG-08 fix, test with exact coordinates 70.6667°N 23.6833°E → if ASC still differs, it's the polar algorithm in astrology-api.io
  2. If algorithm issue: contact astrology-api.io support with test case (15 Apr 1982, 06:00 UTC, 70.6667N 23.6833E, Placidus)
  3. Add gentle UI warning for births above 66°N: "For Arctic latitudes, Placidus houses may be approximate. Whole Sign houses are recommended."

---

### BUG-07 — geo-tz returns Europe/Berlin for Norwegian coordinates
- **Priority:** Low (Europe/Oslo and Europe/Berlin have identical UTC offsets since 1970s — no practical impact)
- **Fix:** `npm update geo-tz` in backend, OR add country_code post-processing override
- **Note:** Fully resolved by ENH-02 (Google Time Zone API replaces geo-tz entirely)

---

### BUG-08 — Location search returns administrative boundary before town center
- **Priority:** Medium — affects coordinate accuracy for all city searches, impacts chart accuracy
- **Where:** `backend/src/services/geocoding.ts` — `searchLocations()` result ordering
- **Fix:** Sort results by type priority: `['city', 'town', 'village', 'suburb', 'hamlet']` before `administrative`
- **Note:** Fully resolved by ENH-02 (Google Places replaces Nominatim)

---

### BUG-09 — Quick action card labels are wrong on Dashboard
- **Priority:** Medium — misleading navigation labels
- **Where:** `frontend/src/app/[locale]/(app)/dashboard/page.tsx` — Quick Actions section
- **Fix:** Oracle → Chat → `/chat` | Transits → Forecast → `/forecast` | Synastry → Partners → `/partners`

---

### ~~BUG-10~~ — ✅ RESOLVED (2026-03-17, b8f1f22)
- DailyHoroscopeCard 3-tier gating: FREE=4, PRO=8, PREMIUM=12 life areas. All 12 API areas in AREA_ORDER.

---

### BUG-11 — Wrong CTA + no Chat button in navigation
- **Priority:** HIGH — Chat is the core product and is not reachable from main nav
- **Where:** `frontend/src/app/[locale]/(app)/dashboard/page.tsx` + `frontend/src/components/shell/sidebar.tsx`
- **Fix 1:** CTA button: change label "Unlock The Oracle" → "Chat with the Oracle", href → `/chat`
- **Fix 2:** Add Chat nav item to sidebar near top of nav list

---

### BUG-12 — Left sidebar not translating when language is switched
- **Priority:** DEFERRED — see DECISION-01 (English first)
- **Where:** `frontend/src/components/shell/sidebar.tsx` — nav labels not using i18n keys
- **Action:** Do not fix until full English version is complete and stable

---

### ~~BUG-13~~ — ✅ RESOLVED (2026-03-17)
- WebSocket and heartbeat removed entirely via ARCH-01. No longer applicable.

---

### ~~BUG-14~~ — ✅ RESOLVED (2026-03-17, f239670)
- `lastSentRef` saves message before clearing. Restored to input if `sendError` prop fires.

---

### BUG-18 — Pre-existing TypeScript errors in agent-tools (non-blocking)
- **Priority:** Low — non-blocking, dist emits correctly (`noEmitOnError: false`)
- **Where:** `backend/src/services/agent-tools/index.ts` — 20 errors, AI SDK `tool()` overload type mismatch + implicit `any` for `args`
- **Root cause:** AI SDK types are unstable/narrow for `tool()`. Code works correctly at runtime — only type-level issue.
- **Fix:** Update AI SDK types when they stabilize, or add explicit type annotations to each `tool()` call.

---

### ~~BUG-19~~ — ✅ RESOLVED (2026-03-17) — OracleWelcome shown incorrectly to users with birth data
- **Root cause:** `hasBirthData` check in `chat-window.tsx` treated any non-success API response (401 expired token, 500) as 0 profiles → showed birth data form instead of chat.
- **Fix:** Only set `hasBirthData = false` when `data.success === true && profiles.length === 0`. All errors fall safe to `true`.

---

### ~~BUG-17~~ — ✅ RESOLVED (2026-03-17, f239670)
- `buildSystemPrompt()` now reads 'master' prompt from `system_prompts` DB. Falls back to hardcoded constant.

---

## 🟡 Enhancements

### ENH-01 — Page transition animation
- **Priority:** Medium
- **Fix:** Install `nextjs-toploader`. In `app/[locale]/layout.tsx`:
  ```tsx
  import NextTopLoader from 'nextjs-toploader';
  <NextTopLoader color="#e41aff" showSpinner={false} />
  ```

---

### ENH-02 — Replace Nominatim with Google Places API *(blocked on Google Maps API key)*
- **Priority:** HIGH — directly impacts onboarding conversion
- **Resolves:** BUG-04, BUG-07, BUG-08, BUG-06 (coordinate precision contributor)
- **Steps:**
  1. Victor creates Google Cloud project → enables Maps JS API + Places API + Geocoding API + Time Zone API
  2. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to Vercel + `GOOGLE_MAPS_API_KEY` to Railway
  3. `npm install @googlemaps/js-api-loader` in frontend
  4. Create `frontend/src/components/ui/google-places-input.tsx` — AutocompleteService + Geocoder
  5. Replace location input in `birth-data-form.tsx` + `partner-form.tsx`
  6. Backend `geocoding.ts`: replace `geo-tz` with Google Time Zone API call
  7. Remove `routes/locations.ts` + Nominatim search from `geocoding.ts`

---

### ENH-03 — House numeral display for narrow houses
- **Priority:** Medium — visual quality issue for polar charts
- **Where:** `frontend/src/components/astrology/natal-chart-canvas.tsx`
- **Fix:** Place numeral at angular midpoint of each house at fixed inner radius (~52%). Skip if house < 3°, reduce font if < 20°.

---

### ENH-04 — Wire LlmUsage table (Task 9 from old roadmap)
- **Priority:** Medium — admin usage/cost page currently shows no data
- **Where:** `backend/src/controllers/chatController.ts` — after each LLM stream completes
- **Fix:** After stream, write to `LlmUsage` table: date, tier, model, inputTokens, outputTokens, latencyMs

---

### ENH-05 — Re-enable Redis in production (Task 10 from old roadmap)
- **Priority:** Medium — currently using in-memory fallback only
- **Fix:** Confirm `REDIS_URL` is set correctly on Railway (rediss:// format for Upstash). Wire Upstash credentials.

---

## 🟠 Features (blocked on external setup)

### FEAT-01 — Google OAuth *(blocked on Victor creating Google Cloud project)*
- Google Cloud OAuth credentials needed → add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to Railway
- Same Google Cloud project as ENH-02 (Maps API key)

### FEAT-02 — Replace Magic Link with Facebook OAuth *(blocked on Victor creating Facebook Dev App)*
- **Steps:**
  1. Victor creates Facebook Developer App → App ID + App Secret
  2. Add `FACEBOOK_CLIENT_ID` + `FACEBOOK_CLIENT_SECRET` to Railway
  3. Backend: add `/api/v1/auth/facebook` OAuth route (mirror Google handler)
  4. Frontend: replace Magic Link button in `login-form.tsx` + `register-form.tsx` with Facebook button (`#1877F2`, FB logo SVG)
  5. Remove `signInWithMagicLink` + magic link inline form from both components

### FEAT-03 — Forecast email notifications
- Hook daily horoscope into `NotificationPreference.emailEnabled` via Resend
- Schema and Resend integration already in place

### FEAT-04 — Aspect Grid Matrix (ENH-09 from old roadmap)
- Planet-vs-planet grid with aspect symbols (☌△□⚹☍) in matching colors
- Data available from `rawChart.aspects`
- Add `AspectGrid` component in `src/components/chart/`, collapsible panel in `chart-panel.tsx`

---

## 🔵 Architecture

### ARCH-01 — Migrate chat from WebSocket to HTTP POST + SSE streaming
- **Status:** ✅ COMPLETE — implemented 2026-03-17, commit `0106139`, pushed to GitHub
- **What was done:** Deleted `socket-client.ts`, `socket/`, `use-websocket.ts`. Rewrote `chat-context-ws.tsx` (SSE-only, AbortController cancel, fixed named-event parser). Inlined `ConnectionState` type in `connection-status.tsx`. Removed `socket.io` + `socket.io-client` packages. Backend uses `app.listen` directly.
- **Resolved:** BUG-13 permanently (WebSocket gone). BUG-14 partially (WebSocket failure mode gone; input-clearing still needs fixing).

---

## ⏸ Deferred (awaiting product decision or setup)

| Item | Blocker | Notes |
|------|---------|-------|
| Chart history UI | Product decision | Backend archives charts on every edit. Build "chart timeline" UI, or remove archiving? |
| Email onboarding sequences | Resend DKIM DNS propagation | Welcome email, chart-computed trigger, weekly digest — schema + Resend in place, sequences not built |
| Discount codes → Stripe checkout | Product decision | Backend + admin UI exist. Pricing strategy (% vs fixed, which tiers) TBD before wiring to checkout |
| Referral affiliate dashboard | Product decision | Affiliate-facing view of their conversions + commissions — separate from admin view |
| Cloudflare Turnstile on guest chat | Traffic trigger | Add bot protection when daily guest sessions exceed ~100 or abuse detected |
| Yearly Stripe price IDs | Victor creates in Stripe | `STRIPE_PRO_PRICE_ID_YEARLY` + `STRIPE_PREMIUM_PRICE_ID_YEARLY` — only needed when yearly billing is offered |

---

## 🟣 Future Features (post-launch)

### FUTURE-01 — Real-time Transit Prediction Engine
*(See `docs/oracle-engagement-strategy.md` for full spec)*
- Pre-calculate exact transit dates for each user for next 6 months
- Store in `user_transit_forecasts` table
- Nightly cron extends the calendar
- Oracle 4-stage engagement arc per transit: T-4 weeks → T-2 weeks → T-0 → T+1 week
- Inject next 3 upcoming transits into Oracle context automatically
- Push notifications: "Your Saturn return begins in 6 weeks"

### FUTURE-02 — Long-term Personal Memory (PGVector + RAG)
*(See `docs/oracle-engagement-strategy.md` for full spec)*
- After-session Haiku job extracts structured memories → `user_memories` + `user_relationships` tables
- pgvector embeddings of memories + session summaries
- Before each Oracle response: embed user message → similarity search → inject top-5 relevant memories
- Enables: "This reminds me of what you told me about your father in January"
- The competitive moat — no other astrology app has this

### FUTURE-03 — Astrocartography Map
- Relocation tool returns text only. Needs Leaflet/Mapbox with astro lines for full experience.

### FUTURE-04 — Multi-language Expansion
- After BG translation is complete: evaluate RO, RS, GR markets
- next-intl i18n infrastructure already in place

### FUTURE-05 — ~~Wire Admin Prompts UI to Live Oracle (BUG-17 Option A)~~ ✅ DONE (f239670)

### FUTURE-06 — Dynamic Chat Suggested Prompts
- **Where:** `frontend/src/components/chat/empty-state.tsx`
- **What:** Currently shows 3 static hardcoded prompts. Replace with context-aware suggestions that change based on: user's chart (sun/moon/rising signs), their recent chat history topics, current transits, and time of day.
- **How:** Backend endpoint `GET /api/v1/chat/suggested-prompts` — reads user's birth profile + last 3 chat session titles + current day's transit → Claude Haiku generates 3 personalized prompt ideas (cached per user per day in Redis).
- **UX:** Prompts rotate on each new conversation. First-time users see generic prompts. Returning users see chart-tailored prompts like "Your Venus in Scorpio intensifies today — how does this affect relationships?"

---

## ✅ Decisions

| Decision | What |
|----------|------|
| DECISION-01 | **English first.** Complete and deploy full app in English before touching Bulgarian translation. BUG-12 and all i18n issues deferred until English version is stable. |
| DECISION-02 | **WebSocket → SSE migration** ✅ COMPLETE (2026-03-17). Chat runs on HTTP POST + SSE only. Socket.io removed from both backend and frontend. |
| DECISION-03 | **One Oracle system prompt** lives in `services/llm-helpers.ts` as a hardcoded constant. Admin prompts UI is currently disconnected (BUG-17). Until BUG-17 is fixed, all prompt changes require a code deploy. |

---

## 🧪 Testing Progress

| Section | Status | Notes |
|---------|--------|-------|
| 1. Health checks (backend) | ✅ Done | All 4 curl commands passed |
| 2. Environment check | ✅ Done | |
| 3A. Registration | ✅ Done | |
| 3B. Login / Password reset | ✅ Done | BUG-03 found |
| 3C. Google OAuth | ⏭ Skipped | Needs Google Cloud credentials |
| 3D. Magic Link / Facebook | ⏭ Skipped | Magic Link to be replaced with Facebook OAuth (FEAT-02) |
| 4. Onboarding / Birth data | ✅ Partial | BUG-04 (location 429), BUG-06/07/08 (chart accuracy) found |
| 5. Dashboard | ✅ Partial | BUG-09/10/11/12 found |
| 6. Chat / Oracle | 🛑 Stopped | BUG-13/14/15/16 found. BUG-15+16 now fixed (pending deploy). |
| **7–16** | ⏳ **Not started — resume here next session** | |

---

## ✅ Completed & Deployed (historical)

### Infrastructure & Core
- Express + TypeScript backend, Next.js frontend, PostgreSQL + Prisma, Supabase Auth + JWT
- Redis caching layer (Upstash, rediss:// format), HTTP POST + SSE streaming chat (WebSocket removed 2026-03-17)
- Health endpoints: `/health`, `/health/db`, `/health/redis`, `/health/astrology`, `/health/env`
- Background chart regeneration processor, monthly query reset cron

### AI Agent
- Vercel AI SDK `streamText` autonomous agent with tool calling
- Anthropic Claude primary / OpenAI GPT-4o fallback
- 10 astrological tools gated by subscription tier (FREE/PRO/PREMIUM)
- Tier-aware system prompt injection, tool call events streamed to frontend
- Stream cancellation (AbortController)
- Model per tier driven by env vars: `MODEL_FREE` / `MODEL_PRO` / `MODEL_PREMIUM`

### Astrology API
- Astrology-API.io as sole provider (Swiss Ephemeris secondary removed — BUG-02)
- Circuit breaker, exponential backoff (3 retries), failure logging
- Global transits: 24h Redis cache. Personal daily horoscope: 24h cache.
- Transit house injection: `computeTransitHouses()` in `transits.ts`

### Subscription & Billing
- 3 tiers: FREE (10q/mo), PRO (unlimited), PREMIUM (unlimited + all tools)
- Stripe integration, scheduled downgrades, monthly usage reset

### User Features
- Registration + email verification, birth data input with geocoding
- Natal chart calculation + storage, chart history archiving
- Multi-birth-profile support, partner management (PREMIUM, limit 10)
- Compatibility analysis (5 categories, Redis cached)
- Daily/weekly forecast generation (nightly cron pre-generates for PRO/PREMIUM)
- FREE tier LLM gating: zero API calls for free users on paywall pages
- Daily Horoscope Card (tier-gated), PDF export, notification preferences
- Language toggle (BG/EN), language detection

### Frontend (11-step build)
- Auth forms (login, registration), Google OAuth callback
- Chat interface with streaming display, Oracle Welcome screen
- SVG Natal Chart Wheel (`circular-chart-wheel.tsx`): 14 planets, zodiac ring, 12 houses, aspect lines, animations, hover tooltips
- Aspect Explorer, Chart panel (BigThreeCard, PlanetTable, ElementsCard, AspectsSummary)
- Forecast pages (`/forecast`, `/forecast/weekly`), Partners panel, Settings (6 pages)
- Admin Dashboard: 9 pages at `/admin/*` (overview, users, usage, revenue, prompts, config, discounts, referrals)
- Void Prism design system: `#e41aff` primary, `#0D0010` bg, glass panels, Inter font

### DB Consolidation (2026-03-17, commit b8f1f22)
- Legacy `birth_data` table removed — all 8 backend files migrated to `birth_profiles`
- `BirthData` model removed from schema.prisma; `birth_data_id` column dropped from `birth_charts`
- Root cause of "Daily horoscope unavailable" for all users fixed
- Daily horoscope card: 3-tier gating with all 12 API areas (FREE=4, PRO=8, PREMIUM=12)

### Infrastructure Hardening (March 2026)
- Redis Proxy bind bug fixed (private class field Proxy issue)
- Chart_regeneration_queue polling loop removed (17k Redis calls/day → ~0)
- LLM token waste fixed (removed unused tool schemas from `chatCompletion()`)
- FREE tier LLM leak fixed (DailyHoroscopeCard + ForecastPanel gated)
- Railway npm ci fixed (package-lock.json regenerated)
- Domain confirmed live: astrologa.bg

---

## 📚 Reference Documents (still active)
- `docs/oracle-engagement-strategy.md` — Oracle engagement framework, transit engine spec, memory architecture spec
- `docs/TESTING_CHECKLIST.md` — Complete production testing checklist (sections 7–16 still to run)
- `docs/CACHING_STRATEGY.md` — Redis caching architecture
- `docs/ERROR_HANDLING_STANDARDS.md` — Error response format standards
