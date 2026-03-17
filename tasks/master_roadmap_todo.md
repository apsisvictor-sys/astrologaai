# AstroLogAI — Master Roadmap & Source of Truth
> **Single source of truth.** Last updated: 2026-03-17 (Section 6 chat + admin testing — BUG-21/22/23/24/25/26/27 + ENH-06/07/08/09 logged).
> All bugs found during testing, all pending work, all future plans live here.
> When testing resumes (Section 7+), new bugs get added to this file.

---

## Pending Manual Actions (Victor must do these)

| Action | Why | Unblocks |
|--------|-----|---------|
| Create Facebook Developer App → get App ID + Secret → add to Railway | Facebook login replacing Magic Link | FEAT-02 |

### ✅ Completed Manual Actions
| Action | Done |
|--------|------|
| Google Cloud project created, 4 APIs enabled (Maps JS, Places, Geocoding, Time Zone) | 2026-03-17 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` added to Vercel (all envs) | 2026-03-17 |
| `GOOGLE_MAPS_API_KEY` added to Railway | 2026-03-17 |
| Google OAuth client ID + secret already in Railway (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) | pre-existing |

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

### BUG-24 — Admin users table shows wrong query count (2) vs usage tab (11)
- **Priority:** MEDIUM — admin has wrong data visibility; makes user management unreliable
- **Where:** `backend/src/routes/admin.ts` — `/admin/users` endpoint query count vs `/admin/usage` endpoint
- **Symptom:** Users table shows 2 queries for admin account; Usage & Cost tab shows 11 requests for same account.
- **Likely cause:** The two endpoints count from different sources. Users table likely reads from `subscription.queriesUsedThisMonth` (monthly counter, resets), while usage tab may read from `LlmUsage` table (cumulative all-time). They measure different things and it's not communicated clearly.
- **Fix:** Clarify and align the two counters. Users table should show current month queries. Usage tab shows total/historical. Add column headers that make the distinction clear. Verify both counts are accurate.

---

### BUG-25 — Admin Prompts Editor crashes: `t.map is not a function`
- **Priority:** HIGH — entire prompts management is broken; admin cannot edit Oracle prompts
- **Root cause (confirmed):** Backend at `GET /admin/prompts` returns `{ success: true, data: { prompts: [...] } }`. The `adminGet` helper unwraps to `data.data` → returns `{ prompts: [...] }` (an object). Frontend expects an array and calls `.map()` directly → crash.
- **Where:**
  - Backend: `backend/src/routes/admin.ts` line 615 — `res.json({ success: true, data: { prompts } })`
  - Frontend: `frontend/src/app/[locale]/(admin)/admin/prompts/page.tsx` line 45-46 — `const data = await adminGet<PromptSummary[]>('/prompts'); setPrompts(data);`
- **Fix (simple):** Either change backend to `res.json({ success: true, data: prompts })` (return array directly), OR change frontend to `setPrompts((data as any).prompts ?? [])`.

---

### BUG-26 — Stale tier in auth context: locked features stay locked after upgrade/downgrade
- **Priority:** CRITICAL — symptom of a deeper architecture problem. See **ARCH-02** for the proper fix.
- **Symptoms:** Forecast locked for PRO users. Tier badge stuck on "Seeker (Free)". Cancelled user keeps PRO access. Admin tier change has no effect until logout.
- **Workaround (now):** Log out → log back in.
- **Real fix:** ARCH-02 — server-authoritative tier, short JWT expiry, remove tier from localStorage cache.

---

### BUG-27 — Pricing page shows same CTAs to logged-in users as to new visitors (no current plan shown)
- **Priority:** HIGH — logged-in PRO users see "Upgrade to Pro" on their current plan; logged-in users have no upgrade/downgrade options, just re-purchase options
- **Where:** `frontend/src/app/[locale]/pricing/page.tsx` lines 163–177
- **Root cause (confirmed):** Page fetches current tier from `GET /subscription/plans` endpoint, looking for `result.data.currentSubscription?.tier`. But `/subscription/plans` is a public endpoint that returns plan definitions only — it does not return the current user's subscription. So `currentTier` is always `null`, all plan CTAs appear as if user is unauthenticated.
- **Fix:** Fetch current tier from `GET /subscription/status` instead (authenticated endpoint that returns `{ tier, ... }`). With `currentTier` correctly set:
  - Current plan → "Current Plan" (disabled button)
  - Higher tier → "Upgrade to X"
  - Lower tier → "Downgrade to X" (with warning)

---

### BUG-21 — Chat bubble disappears after Oracle reply + text returns to input field
- **Priority:** HIGH — core UX defect, makes every conversation feel broken
- **Where:** `frontend/src/components/chat/` — likely `chat-window.tsx` or `chat-input.tsx`
- **Symptom:** User sends a message → bubble appears → Oracle streams reply → after stream completes, user's bubble vanishes and the typed text reappears in the input field.
- **Likely cause:** Optimistic message state is being cleared/reset on stream completion event, and input state is not properly cleared after send (stale ref or state reset order issue).
- **Fix:** On send, clear input immediately and keep it cleared. User bubble should be added to message list permanently on send — never removed. Audit stream `complete` event handler to ensure it only re-enables input, never touches message history.

---

### BUG-22 — Dashboard query counter not updating after queries are used
- **Priority:** HIGH — users have no visibility into their usage; hitting a hard limit with no warning is a terrible UX and churn driver
- **Where:** `frontend/src/app/[locale]/(app)/dashboard/page.tsx` — usage counter component
- **Symptom:** User sends messages, hits rate limit, but dashboard still shows "10 queries remaining" in green.
- **Likely cause:** Dashboard fetches subscription status once on mount and does not re-fetch after chat activity. No live sync between `/chat` and `/dashboard` usage state.
- **Fix:** On every chat send (or on `/dashboard` mount), re-fetch `GET /api/v1/subscription/status` to get fresh `queriesUsed` count. Or lift usage state to auth context so it updates globally after each query.

---

### BUG-23 — Oracle initial greeting is hardcoded Bulgarian, not language-aware
- **Priority:** HIGH — users in English mode see Bulgarian text on first open; breaks trust immediately
- **Where:** `backend/src/controllers/chatController.ts` lines 748 and 845
- **Symptom:** First message from Oracle is `"Здравей! Аз съм AstroLogAI, твоят личен астролог. Какво те интересува днес?"` regardless of user's language setting.
- **Fix:** Replace hardcoded string with a language-aware greeting. Check user's language preference (from JWT/profile) and serve EN or BG version. Better yet: make the Oracle generate the opening message dynamically using the system prompt (avoids hardcoding altogether) — consistent with its character.

---

### ~~BUG-20~~ — ✅ RESOLVED (2026-03-17, 059b70d) — "Internal error" shown after every chat response
- **Root cause:** `res.setHeader()` called at lines 498-499 of `chatController.ts` after `res.write()` had already sent SSE chunks. Node.js throws `ERR_HTTP_HEADERS_SENT`. Outer catch fires, sends `event: error` SSE. `complete` event never reached.
- **Fix:** Removed the two `res.setHeader()` calls (latency/provider already in `complete` event body).

---

### ~~BUG-04~~ — ✅ RESOLVED by ENH-02 (2026-03-17, 3b3ad91) — Location search 429 errors
- Nominatim replaced by Google Places API. No more rate limit issues.

---

### BUG-06 — ASC/house discrepancy vs astro-seek for polar latitudes
- **Priority:** Medium — affects users born above Arctic Circle (~0.1% of users)
- **Root cause:** Placidus is mathematically undefined above 66.5°N. Different software implements different approximation algorithms. Also: our Nominatim coordinates differ from astro-seek's (BUG-08 is a contributor).
- **Actions:**
  1. After BUG-08 fix, test with exact coordinates 70.6667°N 23.6833°E → if ASC still differs, it's the polar algorithm in astrology-api.io
  2. If algorithm issue: contact astrology-api.io support with test case (15 Apr 1982, 06:00 UTC, 70.6667N 23.6833E, Placidus)
  3. Add gentle UI warning for births above 66°N: "For Arctic latitudes, Placidus houses may be approximate. Whole Sign houses are recommended."

---

### ~~BUG-07~~ — ✅ RESOLVED by ENH-02 (2026-03-17, 3b3ad91) — geo-tz wrong timezone
- Google Time Zone API replaces geo-tz entirely.

---

### ~~BUG-08~~ — ✅ RESOLVED by ENH-02 (2026-03-17, 3b3ad91) — Admin boundary before town center
- Google Places Autocomplete with `types=(cities)` returns correct city-level results.

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

### BUG-32 — Chat history sidebar not scrollable (mouse wheel + scrollbar missing)
- **Priority:** HIGH — users with many conversations can't access older sessions; list is clipped with no scroll
- **Where:** `frontend/src/components/shell/sidebar.tsx` line 69 + `frontend/src/components/shell/chat-history-list.tsx` line 117
- **Root cause (confirmed):** Classic flexbox scroll trap — 3 issues combined:
  1. `sidebar.tsx` line 69: `<div className="flex-1 overflow-hidden px-3 py-2">` is NOT a flex container, so the child's `flex-1` has no effect
  2. `ChatHistoryList` root div uses `flex-1 overflow-y-auto` but has no defined height → expands to content size, never triggers scroll
  3. Missing `min-h-0` on the parent — in flex columns, children default to `min-height: auto`, preventing shrinking and causing clip instead of scroll
- **Fix:**
  - `sidebar.tsx` line 69: add `flex flex-col min-h-0` → `<div className="flex-1 flex flex-col min-h-0 overflow-hidden px-3 py-2">`
  - `chat-history-list.tsx` line 117: `flex-1` now works with flex parent, `overflow-y-auto` gets a bounded height → scrollbar appears
  - Tailwind `scrollbar-thin` utility or custom CSS for the thin styled scrollbar track

---

### ENH-13 — Chat search: wire frontend input to existing backend full-text search
- **Priority:** HIGH — backend already implements PostgreSQL full-text search across message content AND titles (`to_tsvector` + `plainto_tsquery`). Zero backend work needed. Frontend only.
- **Where:** `frontend/src/components/shell/chat-history-list.tsx` — add search input above the history list
- **What:** Input at top of chat history panel. Debounced (300ms). On type: call `GET /api/v1/chat/sessions?search=<term>`. Show matching sessions grouped as "Search Results" replacing the normal grouped list. Clear button to reset. Empty state: "No conversations match [term]".
- **Note:** Search covers both session titles AND full message content — this is already how the backend works.

---

### BUG-30 — Chat history shows "No conversations yet" on all pages except /chat
- **Priority:** HIGH — sidebar chat history is the primary navigation for returning to past Oracle conversations; it being invisible on every page except /chat means users can't access their history from anywhere else in the app
- **Where:** `frontend/src/components/shell/chat-history-list.tsx` — `useEffect` at line 93
- **Root cause (confirmed):** The fetch effect has `[pathname]` as its dependency. On `/dashboard`, if the access token isn't in localStorage yet when the component first mounts (auth context still initializing), the `if (!token) return` guard exits silently. Since pathname doesn't change after mount, the effect never retries — sessions stay empty forever on that page load.
  On `/chat` it works because the chat context triggers additional re-renders that happen to cause a re-fetch.
- **Fix:** Add `isAuthenticated` from `useAuth` as a dependency to the fetch effect:
  ```ts
  const { isAuthenticated } = useAuth();
  useEffect(() => { ... }, [pathname, isAuthenticated]);
  ```
  When auth context finishes initializing and `isAuthenticated` flips to `true`, the effect re-runs, token is available, fetch succeeds. One-line fix.
- **Also:** The `.catch(() => {})` silently swallows all fetch errors — should at minimum log them for debugging.

---

### BUG-29 — No Dashboard link in sidebar; users must manually type /dashboard URL
- **Priority:** HIGH — Dashboard is the app's home/hub but is completely unreachable from the sidebar nav. Users are stuck manually correcting the URL to get back to it.
- **Where:** `frontend/src/components/shell/sidebar-nav.tsx` — `NAV_ITEMS` array
- **Fix:** Add Dashboard as the **first nav item** (top of list, above Chat). It is the conceptual home of the app.
  ```
  { href: '/dashboard', icon: '⌂', label: 'Dashboard', minTier: null }
  ```
- **Nav order after fix:**
  1. Dashboard `/dashboard` — hub: chart wheel, daily card, usage counter, quick actions
  2. Chat `/chat`
  3. My Chart `/chart`
  4. Forecast `/forecast` (PRO)
  5. Partners `/partners` (PREMIUM)
  6. Settings `/settings` (bottom, separated)
- **Industry standard:** Notion (Home), Linear (workspace root), Slack (channel list) — the overview is always first and serves as the user's anchor. Dashboard ≠ My Chart: dashboard is the daily hub, chart is the deep-dive analysis page.

---

### BUG-28 — Public nav shows "Sign In / Begin" to logged-in users; no auth awareness
- **Priority:** HIGH — logged-in users returning to astrologa.bg see the same nav as a stranger. No way to get back to the app from the homepage without knowing the `/dashboard` URL. Confusing and unprofessional.
- **Where:** `frontend/src/components/home/public-nav.tsx` — currently a fully static component with no auth check
- **Root cause:** `PublicNav` does not import `useAuth` or check authentication state at all. Always renders the same static nav.
- **Fix:**
  1. Add `useAuth` hook. Check `isAuthenticated`.
  2. **Logged-out nav:**
     - Left: Logo (links to `/`)
     - Center: Home | Features | Pricing (absolute center)
     - Right: `Sign In` (ghost) + `Start Free` (outline pill, primary color)
  3. **Logged-in nav:**
     - Left: Logo (links to `/`)
     - Center: Home | Features | Pricing
     - Right: `✦ Dashboard` — solid gradient button (`from-[#e41aff] to-violet-500`, white text, subtle glow on hover). No "Sign In" or "Begin" — irrelevant to authenticated users.
  4. **Logo click (industry standard):**
     - Logged-out → `/` (homepage). User is a prospect; homepage is their entry point.
     - Logged-in → `/dashboard`. User is a customer; marketing homepage has nothing for them. Notion, Linear, Figma, Slack all do this.
  5. **Mobile:** Logged-in → "Dashboard" button only. Logged-out → "Sign In" only (current behavior).
- **Copy note:** Consider renaming "Begin" → "Start Free" for logged-out users — clearer value prop, lower perceived friction.

---

### ENH-11 — "New for you" badge on newly unlocked features after upgrade
- **Priority:** MEDIUM — helps users discover what they just paid for; reduces "I upgraded but nothing changed" confusion; drives feature adoption
- **Where:** Sidebar nav items, feature section headers (Forecast, Weekly Forecast, Partners)
- **What:** After a user upgrades from FREE → PRO (or PRO → PREMIUM), show a pulsing "New" badge on newly unlocked nav items and feature headers. Badge persists for 7 days from upgrade date, then disappears automatically.
- **Implementation:**
  - Store `upgradedAt` timestamp on user profile (already exists or add it)
  - On render: if `now - upgradedAt < 7 days` AND user is PRO, show "New" badge on PRO-gated items
  - Same logic for PREMIUM
  - Small pulsing dot or pill badge: accent color (`#e41aff`), label "New"
- **Also:** On first visit to a newly-unlocked page after upgrade, show a brief welcome banner: *"Welcome to Pro — this page is now fully unlocked for you."*

---

### BUG-33 — Location autocomplete: no suggestions for small cities until full name typed
- **Priority:** HIGH — onboarding is broken for users born in small towns/villages. No dropdown appears for partial queries like "sozop" — only when full "sozopol" is typed. Affects any city with population under ~50,000.
- **Where:** `backend/src/services/geocoding.ts` line 175
- **Root cause (confirmed):** `types: '(cities)'` maps to Google's `locality` + `administrative_area_level_3` index. For small/less common places, Google's city index only matches near-complete names. Major cities work with 2-3 chars; small towns need the full name.
- **Fix:** Change `types: '(cities)'` → `types: 'geocode'` (one line). `geocode` matches any geocodable place, giving full coverage for small towns and villages. Our geocoding step already extracts `locality` from `address_components` on selection — data quality is unchanged.
- **Alternative:** `types: '(regions)'` — middle ground, adds `sublocality` + `administrative_area_level_1/2` coverage but stays more constrained than `geocode`.
- **Also add** `offset` parameter equal to `query.length` — tells Google the cursor position, improves partial matching across all city sizes.

---

### ENH-14 — Location autocomplete: faster suggestions + lazy coordinate resolution
- **Priority:** HIGH — users are experiencing a 2-3 second delay before city suggestions appear, making autocomplete feel broken. Root cause is sequential API calls, not debounce.
- **Where:** `backend/src/services/geocoding.ts` + `frontend/src/components/birth-data/birth-data-form.tsx`

#### Root cause (confirmed)
For every search on a cold cache, the backend makes up to **11 sequential API calls**:
1. Google Places Autocomplete → 5 predictions (~200ms)
2. `getPlaceDetails()` for each prediction — sequential, not parallel (~200ms × 5 = 1s)
3. `getTimezoneFromCoordinates()` for each — sequential (~200ms × 5 = 1s)
Total: ~2-3 seconds. By the time it returns, user has typed the full word. Only the final debounce fires because intermediate calls are cancelled.

#### Fix (3 parts)
1. **Two-phase response (biggest win):** Separate autocomplete (instant) from coordinate resolution (on selection):
   - `GET /locations/search?q=sofi` → returns only prediction descriptions from Google (fast: 1 API call, ~200ms). Shows dropdown immediately.
   - `POST /locations/resolve` with `placeId` → called only when user **selects** a city. Fetches lat/lng + timezone for that one city. User never waits for all 5 to resolve upfront.

2. **Parallelize (interim improvement):** While above is implemented, replace sequential `for` loop in `geocoding.ts` with `Promise.all()` for `getPlaceDetails()` and `getTimezoneFromCoordinates()`. Reduces cold cache from ~2s to ~400ms.

3. **Session tokens:** Add `sessiontoken` (UUID) to Google Places Autocomplete API calls. Groups autocomplete + place details into one billing session. Reduces cost and improves prediction quality.

#### Language note
`language: 'en'` is correct and intentional. Google accepts input in any language (typing "София" correctly matches "Sofia, Bulgaria"). English output ensures consistency for coordinate/timezone lookups. No change needed.

---

### ENH-06 — Query counter visible inside /chat page
- **Priority:** HIGH — users need to see how many queries they have left *while chatting*, not just on dashboard
- **Where:** `frontend/src/components/chat/` — chat header or input bar area
- **What:** Display remaining query count inline in the chat UI (e.g. "7 queries remaining this month" near the input bar or in the header). Should update live after each message sent. When 0, show upgrade CTA instead.
- **UX note:** Keep it subtle — small text, muted color. Only becomes prominent when low (≤3) or zero.

---

### ENH-07 — Rate limit error CTA → pricing/upgrade page (conversion trigger)
- **Priority:** HIGH — hitting the limit is the highest-intent moment in the funnel; wasting it on a dead-end error is a missed conversion
- **Where:** `frontend/src/components/chat/` — error display in chat + wherever 429 is surfaced
- **What:** When rate limit is hit (monthly or daily), show a message like: *"You've used all 10 free queries this month. Upgrade to Pro for unlimited Oracle access."* with a button → `/pricing` or directly to checkout for PRO. Style it as an upgrade prompt, not just an error.
- **Variants:**
  - Monthly limit: "Upgrade to Pro — unlimited queries from €10/month"
  - Daily limit (if applicable): "Come back tomorrow, or upgrade to remove daily limits"

---

### ENH-08 — Query policy transparency for users
- **Priority:** MEDIUM — users are confused about how queries refresh; lack of clarity erodes trust and increases support load
- **Where:** Multiple touchpoints: `/chat` query counter tooltip, `/settings/subscription`, rate limit error message
- **What:** Clearly communicate:
  1. FREE = 10 queries per month, resets on billing anniversary
  2. If a "free bonus query" mechanic exists (e.g. earn a free query after X days), explain exactly how it works and when the next one is available
  3. Show exact reset date: "Resets on April 1st"
- **Action needed:** Clarify with Victor: what exactly is the "free query every X days" logic? Is it implemented? Where? Document the rule so it can be surfaced accurately in the UI.

---

### ENH-09 — Oracle opening message: engaging, dynamic, language-aware
- **Priority:** HIGH — first impression of the Oracle sets the emotional tone for the entire product; currently it's a generic, broken (Bulgarian) opener
- **Where:** `backend/src/controllers/chatController.ts` lines 748 + 845
- **What:** Replace the hardcoded static greeting with either:
  - **Option A (recommended):** Let the Oracle generate the opening message dynamically — a short, personalised, in-character opener based on the user's chart data if available. This matches the Oracle's depth and avoids any hardcoded text. Can be pre-generated and cached per session.
  - **Option B (quick fix):** Two static strings (EN/BG), selected based on user language preference. More engaging copy — e.g.: *"The stars have been waiting. I have your chart. What would you like to explore?"*
- **Language aware:** Must read user's language setting from JWT/profile, not default to BG.

---

### ENH-01 — Page transition animation
- **Priority:** Medium
- **Fix:** Install `nextjs-toploader`. In `app/[locale]/layout.tsx`:
  ```tsx
  import NextTopLoader from 'nextjs-toploader';
  <NextTopLoader color="#e41aff" showSpinner={false} />
  ```

---

### ENH-02 — Replace Nominatim with Google Places API ✅ CODE COMPLETE (2026-03-17)
- **Resolves:** BUG-04, BUG-07, BUG-08, BUG-06 (coordinate precision contributor)
- **What was done:** Rewrote `backend/src/services/geocoding.ts` — removed Nominatim + geo-tz, replaced with Google Places Autocomplete + Geocoding API + Time Zone API. Aggressive Redis caching (search 24h, place 7d, timezone 30d). Max 5 results. Graceful no-op if key missing.
- **⚠️ PENDING:** Victor must add `GOOGLE_MAPS_API_KEY` to Railway env vars to activate. Frontend (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) not needed — location search runs backend-only.
- **Cost:** Stays within free tier — popular city queries cached after first hit, timezone cached 30 days.

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

### ARCH-03 — localStorage audit: remove everything that should be server-sourced
- **Priority:** HIGH — full audit completed 2026-03-17. See below for verdict on all 13 keys.

#### ✅ KEEP (legitimate use)
- `astrologaai_access_token` — JWT token. Standard.
- `astrologaai_refresh_token` — Standard. *(Future hardening: HttpOnly cookies are more XSS-resistant)*
- `astrologaai_guest_birth_data/messages/session/oracle_count/user_count` — Pre-registration flow (exactly right)
- `referral_slug` — Captured from `?ref=` URL param, cleared after registration. Correct.

#### 🔴 REMOVE — replace with server source
1. **`astrologaai_user`** (highest priority — root cause of all stale tier bugs)
   - Entire user object including `tier` cached indefinitely in localStorage
   - Fix: store tokens only. On mount, call `GET /api/v1/user/profile` for live state. `refreshUser()` already exists — make it the sole source of user state, replace the localStorage user blob.
   - This is ARCH-02's prerequisite.

2. **`astrologaai_pinned_chats`** — pinned chat IDs stored client-side only
   - Invisible across devices/browsers. Pinning a session on laptop ≠ pinned on phone.
   - Fix: add `is_pinned boolean DEFAULT false` to `ChatSession` DB table. `PATCH /api/v1/chat/sessions/:id/pin`. One column, one endpoint.

3. **`locale`** — read directly from localStorage in `forecast-panel.tsx` + `forecast/weekly/page.tsx`, bypassing auth context
   - Language preference is already in the DB on user profile. These components should read from auth context, not localStorage.
   - Creates inconsistency: forecast could display in different language than the rest of the app.
   - Fix: remove localStorage locale reads from those two components, use `user.language` from auth context.

#### 🟡 ACCEPTABLE (tech debt, low priority)
- `astrologaai_chat_session` — active session ID. Works but can conflict across tabs. Better via URL state.
- `astrologaai_pending_notice` — one-shot cross-page flash message. Cleared immediately after display. Acceptable for now.

---

### ARCH-02 — Server-authoritative subscription tier (remove client-side tier caching) 🔴 CRITICAL SECURITY FIX
- **Priority:** CRITICAL — current implementation stores `user.tier` in localStorage indefinitely. A cancelled subscriber retains PRO access forever if they don't log out. A free user who edits localStorage gets PRO features. This is a revenue leak and a security vulnerability.
- **Industry standard:** Client is never the authority on entitlements. Server always is.

#### What needs to change:

**1. Shorten access token expiry to 15–30 minutes**
- Currently unknown — check `JWT_EXPIRES_IN` env var on Railway
- When the access token expires and the refresh token is used, the backend issues a **new token with the tier read fresh from DB**
- This alone means any tier change propagates within 15-30 min with zero user action
- **Where:** `backend/src/controllers/authController.ts` — token generation, and Railway `JWT_EXPIRES_IN` env var

**2. Backend never trusts JWT tier for billing-critical operations**
- All API endpoints that gate on tier (chat queries, forecast, partners) must read `user.tier` from DB, not from JWT payload
- JWT is for identity authentication only. DB is the source of truth for entitlements.
- Audit: `chatController.ts`, `forecastController.ts`, `partnersController.ts` — check if they read tier from `req.user.tier` (JWT) or from a fresh DB query
- **Where:** All controllers that gate features by tier

**3. Remove `tier` from the cached localStorage user object**
- `localStorage` stores `astrologaai_access_token` (JWT), `astrologaai_refresh_token`, and a `user` JSON blob
- The `user` blob contains `tier` — this is the stale cache causing all BUG-26 symptoms
- On app mount: decode tier from the JWT payload (already trusted and signed) OR call `GET /subscription/status` once for the authoritative value. Do NOT read tier from the static user blob.
- **Where:** `frontend/src/lib/auth-context.tsx` — remove `tier` from localStorage user object, derive it on mount from fresh API call

**4. Upgrades: instant. Downgrades: grace period. These are different flows.**

*Upgrades (user just paid — must be immediate):*
- Stripe fires `checkout.session.completed` webhook → backend updates DB tier instantly (verify this is already synchronous in `subscription.ts`)
- Stripe simultaneously redirects to `success_url` → `dashboard?checkout=success`
- Dashboard detects `?checkout=success` query param on mount → calls `GET /subscription/status` immediately → gets PRO tier from DB → updates auth context in the same page load
- User never waits. Webhook and redirect arrive within ~1-2 seconds of each other. DB is updated before the dashboard finishes loading.

*Cancellations (cancel_at_period_end = true — always):*
- User cancels → `cancel_at_period_end = true` set in Stripe → user keeps full access until billing period ends
- At period end: Stripe fires `customer.subscription.deleted` webhook → backend sets tier → FREE in DB
- Next JWT refresh (≤30 min) picks up the FREE tier — no user action needed
- UI during the grace period: show "Your plan cancels on [date]" banner — user knows when access ends
- No abrupt cutoffs, no prorating refunds, no angry users. This is the industry standard.

**5. On app mount + window focus: call `GET /subscription/status`**
- Single API call on mount (~10ms with Redis cache) gives real-time tier + usage counts
- Covers: admin tier changes, mid-session Stripe events, returns from Stripe portal
- **Where:** `frontend/src/lib/auth-context.tsx` — `useEffect` on mount + `visibilitychange` listener

**5. Stripe webhook must update DB tier synchronously**
- `customer.subscription.deleted` → tier → FREE immediately in DB
- `customer.subscription.updated` → tier updated in DB before webhook returns 200
- Verify this is already happening correctly in `backend/src/routes/subscription.ts`

#### Result after fix:
- **Upgrade:** Access granted instantly on dashboard load after Stripe redirect (`?checkout=success` handler)
- **Cancellation:** User keeps full access until end of billing period (`cancel_at_period_end = true`). At period end, Stripe webhook updates DB → JWT refresh revokes access within 30 min
- **Admin tier change:** Takes effect on next page load (on-mount status check)
- **localStorage manipulation:** Cannot unlock paid features — backend validates tier from DB on every billing-critical operation

---

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

### ENH-12 — Chat session 3-dot context menu (Pin, Share, Rename, Delete, Archive) + Search
- **Priority:** HIGH — replaces the current primitive 📌 hover toggle with a full session management system matching industry standard (ChatGPT UX)
- **Menu order:** Pin · Share · Rename · Delete *(red)* · Archive
- **Also add:** Search chats input at top of sidebar history list (backend already supports `?search=` on `GET /sessions`)

#### DB migration needed
```sql
ALTER TABLE chat_sessions ADD COLUMN is_pinned BOOLEAN DEFAULT false;
ALTER TABLE chat_sessions ADD COLUMN is_archived BOOLEAN DEFAULT false;
ALTER TABLE chat_sessions ADD COLUMN shared_token VARCHAR(64) UNIQUE DEFAULT NULL;
```
*(This also resolves ARCH-03's `astrologaai_pinned_chats` localStorage removal — pin state moves to DB)*

#### Backend changes
| What | How |
|------|-----|
| **Pin** | Extend `PATCH /sessions/:id` to accept `{ isPinned: bool }` |
| **Archive** | Extend `PATCH /sessions/:id` to accept `{ isArchived: bool }` |
| **Rename** | Already works via `PATCH /sessions/:id` with `{ title }` |
| **Delete** | Already exists: `DELETE /sessions/:id` |
| **Share** | New: `POST /sessions/:id/share` → generates `sharedToken` (nanoid, 12 chars), returns `{ shareUrl }`. `DELETE /sessions/:id/share` revokes it. |
| **List** | `GET /sessions` must exclude archived by default. Add `?archived=true` to fetch archived sessions separately. |

#### Frontend changes
- Replace 📌 hover button in `chat-history-list.tsx` with `···` button (visible on hover)
- Dropdown menu: Pin · Share · Rename · Delete *(red)* · Archive
- **Pin:** calls PATCH, moves session to "Pinned" section. Removes from localStorage (ARCH-03).
- **Rename:** opens inline text input replacing the title in the sidebar. Enter to save, Esc to cancel. Calls PATCH.
- **Delete:** confirmation prompt ("Delete this conversation? This cannot be undone.") → DELETE endpoint.
- **Archive:** calls PATCH `isArchived: true`. Session disappears from main list. Collapsed "Archived" section at bottom of sidebar with a toggle to show/hide.
- **Share:** opens modal with full share URL + one-click copy button. Shows "Link active" or "No link" state. Option to revoke.
- **Search:** text input at top of chat history panel. Debounced, calls `GET /sessions?search=` on each keystroke. Clears on empty.

---

### ENH-10 — Oracle aspect rotation / anti-repetition system (Phase 1 of FUTURE-02)
- **Priority:** HIGH — Oracle opens every new chat with the same dominant aspect regardless of history; feels robotic and shallow after the first session
- **Root cause:** Natal chart summary injected on every new chat gives the Oracle identical context each time. With no cross-session memory, it naturally gravitates to the most prominent aspect (e.g. Sun square Saturn). Correct behavior given context; wrong product experience.

#### Phase 1 — Cooldown Table (implement now, ~2-3 days)
- New DB table: `aspect_cooldowns (user_id, aspect_key, session_id, depth_score int, last_discussed_at timestamp)`
  - `aspect_key` = normalized string: `sun_square_saturn`, `moon_trine_venus`, etc.
  - `depth_score`: 1 = mentioned briefly, 2 = discussed, 3 = deep-dived
- **Post-session job:** After each chat session ends, Haiku processes the conversation and identifies which aspects were covered + scores depth. Writes to `aspect_cooldowns`.
- **Cooldown rules:** depth 1 → 7 day cooldown | depth 2 → 21 days | depth 3 → 60 days
- **On new chat start:** Query `aspect_cooldowns` for user → inject into system prompt:
  > *"Aspects in cooldown (recently explored, do not lead with these): Sun square Saturn (depth 3, last: 2026-03-10), Moon trine Venus (depth 2, last: 2026-03-15). Find something the user hasn't encountered yet in their chart. When cooldown expires, bring the aspect back with the framing: 'How has this felt over the past few weeks?'"*

#### Phase 2 — Absorbed into FUTURE-02 (PGVector + RAG)
- The cooldown table becomes seed data for the vector memory system
- Instead of rigid rules, pgvector similarity search detects if the Oracle's planned opening is too similar to past sessions
- Enables: smart rotation, tracking user growth across time, "last time we talked about X you felt Y — how has that shifted?"
- Phase 1 data feeds directly into Phase 2 — no throw-away work

---

### FUTURE-02 — Long-term Personal Memory (PGVector + RAG)
*(See `docs/oracle-engagement-strategy.md` for full spec)*
- After-session Haiku job extracts structured memories → `user_memories` + `user_relationships` tables
- pgvector embeddings of memories + session summaries
- Before each Oracle response: embed user message → similarity search → inject top-5 relevant memories
- Enables: "This reminds me of what you told me about your father in January"
- The competitive moat — no other astrology app has this
- **Note:** ENH-10 (aspect cooldown table) is Phase 1 of this system — build it first, absorb into FUTURE-02 when this is implemented

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
