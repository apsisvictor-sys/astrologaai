# AstroLogAI — Master Roadmap & Source of Truth
> **Single source of truth.** Last updated: 2026-03-18 (Fix sprint complete — all 22 items resolved, deployed fc81ba7).
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

**Deployed 2026-03-17.**

---

## 🔴 Active Bugs (code fix needed)

### BUG-24 — Admin users table shows wrong query count (2) vs usage tab (11)
- **Priority:** MEDIUM — admin has wrong data visibility; makes user management unreliable
- **Where:** `backend/src/routes/admin.ts` — `/admin/users` endpoint query count vs `/admin/usage` endpoint
- **Symptom:** Users table shows 2 queries for admin account; Usage & Cost tab shows 11 requests for same account.
- **Likely cause:** The two endpoints count from different sources. Users table likely reads from `subscription.queriesUsedThisMonth` (monthly counter, resets), while usage tab may read from `LlmUsage` table (cumulative all-time). They measure different things and it's not communicated clearly.
- **Fix:** Clarify and align the two counters. Users table should show current month queries. Usage tab shows total/historical. Add column headers that make the distinction clear. Verify both counts are accurate.

---

### ~~BUG-25~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Admin Prompts Editor crashes: `t.map is not a function`
- **Fix:** `backend/src/routes/admin.ts` line 615 — changed `res.json({ success: true, data: { prompts } })` → `res.json({ success: true, data: prompts })` (return array directly).

---

### ~~BUG-26~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Stale tier in auth context (side effect of ARCH-02)
- **Fix:** `astrologaai_user` localStorage blob removed. Auth context now calls `GET /api/v1/user/profile` on mount — tier always comes from server.

---

### ~~BUG-27~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Pricing page shows wrong CTAs to logged-in users
- **Fix:** Changed fetch to `GET /subscription/status`. Pricing page is now fully auth-aware: Current Plan / Upgrade / Downgrade buttons. Logged-in banner shows plan name, daily usage, and "Manage billing →" link. FREE copy updated to "3 / day", PRO updated to "Unlimited".

---

### ~~BUG-21~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Chat bubble disappears after Oracle reply
- **Fix:** Respond-first SSE pattern — `event: complete` + `res.end()` now fires before any DB writes. Fire-and-forget IIFE handles persistence after stream closes. Frontend `event: error` handler now only removes user message if no assistant content was received.

---

### ~~BUG-22~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Dashboard query counter not updating
- **Fix:** Dashboard fetches `GET /subscription/status` on mount and renders `queriesRemaining` live. `/subscription/status` returns daily stats for FREE tier (`resetType: daily`).

---

### ~~BUG-23~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Oracle greeting hardcoded Bulgarian (also ENH-09)
- **Fix:** `chatController.ts` — added `ORACLE_GREETINGS` pool (5 variants per language), `getOracleGreeting(lang)` helper. Both `createSession` and `startNewConversation` now pick randomly from the pool. Language read from `req.user.language`.

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

### ~~BUG-32~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Chat history sidebar not scrollable
- **Fix:** `sidebar.tsx` line 69 — added `flex flex-col min-h-0` to the wrapper div. Breaks the flexbox height trap.

---

### ~~ENH-13~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Chat search with floating popover
- **Fix:** Backend `listSessions` now uses `DISTINCT ON` to return matching message content + `extractSearchSnippet()` helper for 140-char centred snippet. Frontend `chat-history-list.tsx` rewrote to add search input + 360px floating popover (`left-full` of sidebar) with `<Highlight>` component bolding matched terms in title and snippet. Debounced 300ms.

---

### ~~BUG-30~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Chat history empty on non-chat pages
- **Fix:** Added `isAuthenticated` to `useEffect` deps in `chat-history-list.tsx`. Re-fetches when auth context finishes initialising.

---

### ~~BUG-29~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — No Dashboard link in sidebar
- **Fix:** Added `{ href: '/dashboard', icon: '⌂', label: 'Dashboard', minTier: null }` as first item in `NAV_ITEMS` in `sidebar-nav.tsx`.

---

### ~~BUG-28~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Public nav not auth-aware
- **Fix:** `public-nav.tsx` rewritten as client component with `useAuth`. Logged-in: logo → `/dashboard`, gradient `✦ Dashboard` button. Logged-out: logo → `/`, Sign In + Start Free buttons. Mobile handled separately.

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

### ~~BUG-33~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Location autocomplete misses small cities
- **Fix:** `geocoding.ts` — changed `types: '(cities)'` → `types: 'geocode'`. Full coverage for towns and villages.

---

### ~~ENH-14~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Location autocomplete slow on cold cache
- **Fix:** `geocoding.ts` — replaced serial `for` loop with `Promise.all()`. All 5 place detail + timezone lookups now run in parallel. Cold cache: ~5× faster (~200ms vs ~1-2s). Phase-2 (true lazy resolve on selection) deferred as future optimisation.

---

### ~~ENH-06~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Query counter in /chat page
- **Fix:** `chat-window.tsx` — added subtle counter above input bar: "X queries remaining today". Hidden for unlimited tiers. Turns amber at ≤1 remaining.

---

### ~~ENH-07~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Rate limit error → upgrade CTA
- **Fix:** `chat-context-ws.tsx` — on 429, forces `usage.remaining = 0`. Triggers the existing yellow "Daily limit reached. Upgrade for unlimited access" banner in `chat-window.tsx` immediately.

---

### ENH-08 — Query policy transparency for users
- **Priority:** MEDIUM — now that FREE is 3/day (no monthly cap), the messaging should reflect this
- **Where:** `/chat` query counter tooltip, `/settings/subscription`, rate limit error message
- **What:** Communicate clearly: FREE = 3 queries/day, resets at midnight. Show "Resets tomorrow" not a date.
- **Note:** FREE tier changed to 3/day (no monthly cap) in fix sprint 2026-03-18.

---

### ~~ENH-09~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Oracle greeting hardcoded (merged with BUG-23)
- See BUG-23 resolution above.

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

### ~~ARCH-03~~ — ✅ PARTIALLY RESOLVED (2026-03-18, fc81ba7) — localStorage audit
- **Done:** `astrologaai_user` blob removed (highest priority item). Auth context now server-authoritative.
- **Still pending (low priority):** `astrologaai_pinned_chats` → DB migration (add `is_pinned` to `ChatSession`); locale reads in `forecast-panel.tsx` and `forecast/weekly/page.tsx` → use `user.language` from auth context instead.

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

### ~~ARCH-02~~ — ✅ RESOLVED (2026-03-18, fc81ba7) — Server-authoritative subscription tier
- **Fix:** `auth-context.tsx` — removed `astrologaai_user` localStorage blob entirely. On mount, calls `GET /api/v1/user/profile` with access token. User state (including tier) always comes from server. JWT already 15min (`JWT_EXPIRES_IN=15m` on Railway). Upgrades: dashboard detects `?checkout=success` → `refreshUser()`. Cancellations: grace period via `cancel_at_period_end=true`, JWT refresh propagates within 15min. localStorage manipulation no longer grants any features.

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
