# Production Testing — Bug Tracker (2026-03-16)

---

## ✅ Completed This Session (2026-03-16 → 2026-03-17) — Pending Single Deploy

| # | What | Files Changed |
|---|------|--------------|
| BUG-02 | Swiss Ephemeris second provider removed | `astrology-orchestrator.ts`, `services/astrology/index.ts`, `routes/astrology.ts`, `src/index.ts` |
| BUG-15 | Oracle language default fixed (bg → en) | `middleware/languageDetection.ts`, `controllers/chatController.ts` (4 places) |
| BUG-16 | New Oracle system prompt written by Opus | `services/llm-helpers.ts` — `ASTROLOGER_SYSTEM_PROMPT` fully rewritten |
| DISCOVERY | Admin prompts UI (`/admin/prompts`) is NOT connected to the live Oracle — the real prompt is hardcoded in `llm-helpers.ts`. Editing admin does nothing. | See BUG-17 below |

**All code changes are local. Nothing deployed yet. One deploy batch will push all of the above.**

---

## 🔴 New Discovery

### BUG-17 — Admin Prompts UI is disconnected from the live Oracle
- **Where**: `backend/src/routes/admin.ts` (prompts endpoints) + `backend/src/services/llm-helpers.ts`
- **What**: The admin panel at `/admin/prompts` shows a "Master Prompt" editor with version history. It saves to the `system_prompts` database table. But the chat controller **never reads from that table** — it uses the hardcoded `ASTROLOGER_SYSTEM_PROMPT` constant in `llm-helpers.ts` directly. Editing the admin UI has zero effect on what the Oracle says.
- **Impact**: Any admin who edits the "Master Prompt" in the UI thinks they are changing the Oracle. They are not. This is a silent lie in the admin panel.
- **Fix options**:
  - (A) Wire it up: in `buildSystemPrompt()`, do a DB lookup for the 'master' system prompt and use that instead of the hardcoded constant. Fall back to hardcoded if DB record is empty. This makes the admin UI live.
  - (B) Remove the admin prompt editor entirely and document that system prompt changes require a code deploy.
  - Recommendation: Option A — it's the right architecture and enables editing without deploys.
- **Priority**: Medium — not urgent since nobody has been misled yet, but should be fixed before the admin UI is used in earnest.

---

## Pending Fixes

### BUG-01 — Guest session not cleared after registration/login
- **Where**: `frontend/src/lib/auth-context.tsx` — register + signIn success handlers
- **What**: `astrologaai_guest_session` remains in localStorage after user registers or logs in
- **Fix**: Add `localStorage.removeItem('astrologaai_guest_session')` in both register and signIn success paths
- **Priority**: Low

---

### ✅ BUG-02 — Swiss Ephemeris second provider removed
- **Where**: `astrology-orchestrator.ts`, `services/astrology/index.ts`, `routes/astrology.ts`, `src/index.ts`
- **Status**: Code changed locally, NOT YET DEPLOYED (pending same deploy batch)

---

### BUG-03 — Wrong password shows no error on login form
- **Where**: `frontend/src/components/login-form.tsx` + `auth-context.tsx`
- **What**: Entering wrong password → 401 returned → page "refreshes" → no error message shown
- **Root cause**: `signIn()` calls `setError(message)` in auth context then re-throws. The re-throw causes Next.js to re-render the component tree, resetting the visual state before the error renders.
- **Fix**:
  1. In `login-form.tsx`: add `const [submitError, setSubmitError] = useState<string | null>(null);`
  2. In `handleSubmit` catch block: `setSubmitError('Invalid credentials. Please check your email and password.');` instead of relying on authError
  3. Clear `submitError` on input change (alongside existing `clearError()` call)
  4. Render: `{(authError || submitError) && <div className="p-4 rounded-xl text-sm bg-red-500/10 text-red-500 border border-red-500/20">{authError || submitError}</div>}`
  5. In `auth-context.tsx` `friendlyAuthError()`: add `if (response?.status === 401) return 'Invalid credentials. Please check your email and password.';` before the generic error handling
- **Priority**: HIGH — users can't tell why login failed

---

### BUG-04 — Location search hits 429 and silently breaks
- **Where**: Backend `routes/locations.ts` + Frontend `components/birth-data/birth-data-form.tsx` + `components/partners/partner-form.tsx`
- **What**: Typing quickly in city autocomplete triggers 429. Dropdown silently stops showing results with no feedback to user.
- **Root cause 1**: Rate limit `rateLimiter(20, 60)` is too tight for an autocomplete field
- **Root cause 2**: 300ms debounce fires too frequently when typing + backspacing
- **Root cause 3**: Frontend silently ignores 429 response — no user feedback
- **Fix 1** (backend, 1 line): `routes/locations.ts` line 17 → change `rateLimiter(20, 60)` to `rateLimiter(60, 60)`
- **Fix 2** (frontend, 1 line each): In `birth-data-form.tsx` line 102 and same line in `partner-form.tsx` → change setTimeout delay from `300` to `600`
- **Fix 3** (frontend): After the `fetch()` call, before the `if (response.ok)` check, add:
  ```ts
  if (response.status === 429) {
    setLocationError('Searching too fast — please pause and try again.');
    setIsSearchingLocations(false);
    return;
  }
  ```
  (requires adding `const [locationError, setLocationError] = useState<string | null>(null)` and rendering it below the location input, cleared on next successful search)
- **Note**: This is a stopgap. ENH-02 (Google Places API) will replace this entirely.
- **Priority**: HIGH — blocks onboarding

---

### BUG-07 — geo-tz returns Europe/Berlin for all Norwegian coordinates
- **Where**: `backend/src/services/geocoding.ts` — `findTimezone(lat, lon)` via `geo-tz` library
- **What**: Every Norwegian coordinate (including Oslo) returns `Europe/Berlin` instead of `Europe/Oslo`
- **Impact**: Currently harmless — Europe/Oslo and Europe/Berlin use identical UTC offsets since the 1970s. But it's wrong data and could affect edge cases.
- **Fix**: Update `geo-tz` to latest version (`npm update geo-tz` in backend). If that doesn't fix it, add a post-processing correction: after `findTimezone()`, check if the coordinate is in Norway (country_code = 'no' from Nominatim result) and override to `Europe/Oslo`.
- **Priority**: Low (no practical user impact currently)

---

### BUG-08 — Location search returns administrative boundary before town center
- **Where**: `backend/src/services/geocoding.ts` `searchLocations()` — result ordering
- **What**: For "Hammerfest", first result is the administrative boundary centroid (70.6413, 23.8361), not the town center (70.6628, 23.6831). Users select the first result. Administrative boundary centroids are inaccurate for chart calculation.
- **Evidence**: Astro-seek uses town center 70.6667, 23.6833 — matches our 2nd result closely. Our 1st result differs by ~2.8km latitude and ~5.8km longitude.
- **Fix**: In `searchLocations()`, after transforming results, sort so that `type=town`, `type=city`, `type=village` results appear before `type=administrative`. Change the result mapping to pass `type` through, then sort:
  ```ts
  const PREFERRED_TYPES = ['city', 'town', 'village', 'suburb', 'hamlet'];
  transformed.sort((a, b) => {
    const aScore = PREFERRED_TYPES.indexOf(a.type) === -1 ? 99 : PREFERRED_TYPES.indexOf(a.type);
    const bScore = PREFERRED_TYPES.indexOf(b.type) === -1 ? 99 : PREFERRED_TYPES.indexOf(b.type);
    return aScore - bScore;
  });
  ```
- **Priority**: Medium — affects coordinate accuracy for all city searches, directly impacts chart accuracy

---

### BUG-06 — ASC/house cusp discrepancy vs astro-seek for polar latitudes
- **Where**: Backend `services/astrology/astrology-api-provider.ts` + `services/geocoding.ts`
- **What**: Chart for Hammerfest, Norway (70°40'N) shows ASC Cancer 20°04' in our system vs Leo 4°44' in astro-seek. Both use 08:00 local (+02) = 06:00 UTC. Planet positions match exactly. Only house cusps diverge.
- **Test case**: 15 April 1982, 08:00 local time (+02 = 06:00 UTC), Hammerfest Norway, Placidus, 70°40'N 23°41'E
- **Root cause candidates** (in order of likelihood):
  1. **Coordinate precision**: Astro-seek uses exactly `70°40'N 23°41'E` (70.6667°N, 23.6833°E). Our Nominatim result for "Hammerfest" may return slightly different coordinates. At 70°N, even 0.05° latitude difference causes large Placidus shifts.
  2. **Polar Placidus approximation**: Hammerfest is above the Arctic Circle (66.5°N). Placidus is mathematically undefined for some house cusps at these latitudes. Different software uses different approximation algorithms. Our astrology-api.io provider may use a different polar fallback than astro-seek.
- **Investigation steps**:
  1. Log the exact lat/lon being stored when user searches "Hammerfest" via our system — compare to 70.6667°N 23.6833°E
  2. Check what `timezone` value is being passed to astrology-api.io for this profile
  3. Test with exact coordinates 70.6667, 23.6833 hardcoded — if ASC matches astro-seek, it's a coordinate precision issue
  4. If still different with exact coordinates, the issue is polar Placidus handling in astrology-api.io
- **Updated analysis after investigation**:
  - Timezone difference (Europe/Berlin vs Europe/Oslo): NOT the cause — identical UTC offsets for 1982
  - Coordinate difference (our 70.6413 vs astro-seek's 70.6667): Partial contributor — ~2.8km latitude, ~5.8km longitude. BUG-08 fix will reduce this.
  - **Most likely cause**: Different Placidus polar approximation algorithms between astrology-api.io and astro-seek. Above 66.5°N (Arctic Circle), Placidus is mathematically undefined. Every software implements a different workaround.
- **Investigation steps**:
  1. First: test a non-polar chart (Sofia, London) against astro-seek — confirms normal-latitude accuracy ✅
  2. Manually create Hammerfest profile with exact coordinates 70.6667, 23.6833 — if ASC still differs from astro-seek, the issue is the polar algorithm in astrology-api.io, not coordinates
  3. If algorithm issue confirmed: contact astrology-api.io support with test case, OR add a UI notice for births above 66°N recommending Whole Sign houses
- **Options if polar algorithm confirmed**:
  - (a) Contact astrology-api.io — provide test case (15 Apr 1982, 06:00 UTC, 70.6667N 23.6833E, Placidus) and ask them to verify against Swiss Ephemeris
  - (b) Add gentle UI warning for users born above 66°N: "For Arctic latitudes, Placidus houses may be approximate. Whole Sign houses are recommended."
  - (c) Accept as known Placidus limitation — it affects <0.1% of users (Arctic births)
- **Priority**: Medium — affects accuracy for Arctic latitude users. Normal charts unaffected.

---

## Pending Features / OAuth Setup

### FEAT-01 — Google OAuth (NOT YET SET UP)
- **What**: Google OAuth button exists in UI but Google Cloud credentials not configured
- **TODO**: Set up Google Cloud OAuth app, add client ID + secret to Railway env vars
- **Blocked until**: Victor sets up Google Cloud project (same project as ENH-02 Google Maps key)
- **Priority**: High

### FEAT-02 — Replace Magic Link with Facebook OAuth
- **What**: Remove "Magic Link" button from login + register forms. Replace with Facebook OAuth button.
- **Where**: `frontend/src/components/login-form.tsx`, `frontend/src/components/register-form.tsx`, backend OAuth handler
- **TODO**:
  1. Victor creates Facebook Developer App + gets App ID + App Secret
  2. Add `FACEBOOK_CLIENT_ID` + `FACEBOOK_CLIENT_SECRET` to Railway env vars
  3. Backend: add `/api/v1/auth/facebook` OAuth route (mirror of existing Google handler)
  4. Frontend: replace Magic Link button JSX block in both `login-form.tsx` and `register-form.tsx` with Facebook button (same layout/styling as Google button, use Facebook blue `#1877F2` and FB logo SVG)
  5. Remove `signInWithMagicLink` usage and the magic link inline form from both components
- **Blocked until**: Victor sets up Facebook Developer App
- **Priority**: High

---

## Enhancements

### ENH-01 — Page transition animation
- **What**: Page loads are abrupt — brief white flash + plain white spinner on submit buttons
- **Recommended fix**: Install `nextjs-toploader` — adds a thin progress bar at the top of the page during navigation (like GitHub/YouTube). 2 lines in root layout, matches our fuchsia brand color.
  ```tsx
  // in app/[locale]/layout.tsx, inside <body>:
  import NextTopLoader from 'nextjs-toploader';
  <NextTopLoader color="#e41aff" showSpinner={false} />
  ```
- **Secondary**: Update submit button spinner SVG color to match gradient (currently plain white circle, should be fuchsia or gradient)
- **Priority**: Medium

### ENH-02 — Replace Nominatim with Google Places API for city autocomplete
- **Current**: OpenStreetMap Nominatim — 1s forced delay between requests, missing Bulgarian cities, routed through our backend which adds latency + our own rate limiter on top
- **Target**: Google Maps Places Autocomplete — sub-200ms results, full coverage, called directly from frontend (no backend proxy)
- **TODO**:
  1. Victor creates Google Cloud project → enables Maps JavaScript API + Places API + Geocoding API
  2. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to Vercel env vars
  3. `cd frontend && npm install @googlemaps/js-api-loader`
  4. Create `frontend/src/components/ui/google-places-input.tsx` — reusable component that wraps `google.maps.places.AutocompleteService` for suggestions and `google.maps.Geocoder` for lat/lng on selection
  5. Replace location input + useEffect search block in `birth-data-form.tsx` with `<GooglePlacesInput>` component
  6. Same replacement in `partner-form.tsx`
  7. Backend: replace `getTimezoneFromCoordinates()` in `geocoding.ts` — instead of `geo-tz`, call Google Time Zone API: `https://maps.googleapis.com/maps/api/timezone/json?location={lat},{lng}&timestamp={unixTime}&key={API_KEY}`. This returns the correct historical IANA timezone for the exact birth date/time. Use `GOOGLE_MAPS_API_KEY` env var (server-side, not the public frontend key).
  8. Backend: remove `routes/locations.ts` route + `searchLocationsHandler` from `birthDataController.ts` + delete Nominatim search from `geocoding.ts`. Keep the file for `validateCoordinates()` and the new Google timezone lookup.
- **Blocked until**: Google Maps API key created (enable Maps JS API + Places API + Geocoding API + **Time Zone API** — all in same project)
- **Priority**: High — directly impacts onboarding conversion
- **Resolves**: BUG-04 (rate limit), BUG-07 (wrong Norway timezone via geo-tz), BUG-08 (admin boundary ordering), BUG-06 coordinate precision contributor
- **Note**: BUG-04, BUG-07, BUG-08 fixes are stopgaps until this is done.

### ENH-03 — House number (Roman numeral) display for narrow houses
- **What**: At high latitudes (and sometimes at normal latitudes with Placidus), some houses become very narrow (< 5°). Current implementation places Roman numerals along the house cusp line near the zodiac ring → numbers pile up illegibly when multiple narrow houses are adjacent.
- **Where**: `frontend/src/components/astrology/natal-chart-canvas.tsx` — the house numeral rendering section
- **Current behaviour**: Each Roman numeral is drawn at a fixed offset from the outer ring along the cusp line. Works fine for normal charts, breaks visually for polar/extreme charts.
- **Proposed fix — angular midpoint at fixed inner radius**:
  - Instead of placing numerals on the cusp lines, calculate the **angular midpoint** of each house (average of its cusp and the next cusp)
  - Place the numeral at a **fixed radius** of ~52% of the chart radius (just inside the planet orbit ring, well inside the zodiac ring)
  - Scale font: house span ≥ 20° → normal size (10-11px); 10°–20° → small (8-9px); < 10° → smallest (7px, or skip if < 3°)
  - For houses < 3° span: omit the numeral entirely (too narrow to label), but keep the cusp line
  - This matches how professional software (Astro.com, Solar Fire) handles polar charts
- **Implementation**:
  1. In `natal-chart-canvas.tsx`, find the house numeral drawing loop
  2. Replace current numeral position calculation with: `angle = (houseStart + houseEnd) / 2` (angular midpoint), `radius = chartRadius * 0.52`
  3. Add `houseSpan = Math.abs(houseEnd - houseStart)` check before drawing — skip if span < 3°, reduce fontSize if span < 20°
  4. No other changes needed — cusp lines, axis labels, and everything else stays the same
- **Priority**: Medium — visual quality issue, affects polar charts and some normal charts with uneven house distribution

---

### BUG-13 — WebSocket heartbeat timeout too aggressive → "Failed to send message"
- **Where**: `frontend/src/lib/socket-client.ts` line 222-229 — `startHeartbeat()` method
- **What**: Client sends `ping:heartbeat` every 30s and expects `pong:heartbeat` back within **10 seconds**. If no pong in 10s → forces disconnect → user gets "Failed to send message" on next send.
- **Root cause**: 10-second pong window is too tight for Railway's WebSocket proxy. Railway adds latency to WebSocket traffic; pong can legitimately take >10s under load or network hiccups.
- **Observed behaviour**: Multiple connect/reconnect cycles visible in console, followed by `[Socket] Heartbeat timeout, connection may be stale` → disconnect → reconnect attempt 1/5.
- **Fix 1** (main fix, 1 line): In `socket-client.ts` line 229, change `}, 10000)` → `}, 25000)`. This gives the server 25 seconds to pong back — enough to survive Railway proxy latency while still detecting truly dead connections.
- **Fix 2** (additional protection): Before calling `handleUnexpectedDisconnect('heartbeat_timeout')` on line 227, add a guard to skip the disconnect if a stream is actively in progress:
  ```ts
  if (this.streamState?.isStreaming) {
    // Don't disconnect during active LLM stream — heartbeat lag is expected
    return;
  }
  ```
- **Priority**: HIGH — causes message loss and broken chat sessions for active users
- **Note**: BUG-13 fix is a stopgap. See ARCH-01 for the permanent architectural solution. See also BUG-14 for the message loss on failed send.

---

### BUG-09 — Quick action card labels are wrong
- **Where**: `frontend/src/app/[locale]/(app)/dashboard/page.tsx` or dashboard component — Quick Actions section
- **What**: Cards show Oracle / Transits / Synastry / Settings. Should show Chat / Chart / Forecast / Partners with correct links.
- **Fix**: Update the quick action card definitions — change labels and href values:
  - Oracle → Chat → `/chat`
  - Transits → Forecast → `/forecast`
  - Synastry → Partners → `/partners`
  - Settings → keep or swap to Chart → `/chart` (discuss with Victor which 4 to show)
- **Priority**: Medium — misleading navigation labels

---

### BUG-10 — DailyHoroscopeCard entirely locked for FREE tier (should show Love + Career)
- **Where**: `frontend/src/components/chart/` — DailyHoroscopeCard component
- **What**: FREE users see a fully locked card "Personal Daily Reading — Your Oracle horoscope — available on PRO" with just an Upgrade button. No content at all. Checklist spec says FREE should see Love + Career sections with other life areas locked.
- **Screenshot confirmed**: Card is 100% locked, zero content shown to FREE user.
- **Fix**: In the DailyHoroscopeCard component, FREE tier should:
  1. Fetch and display the Love + Career sections (2 of 6 life areas) with real content
  2. Show the remaining 4 areas (Health, Finances, Family, Personal Growth) as locked with upgrade prompt
  3. Only show the full lock wall if the API call fails or returns nothing
- **Why important**: Showing zero value to FREE users kills conversion. Showing a taste of the product (2 free sections) is the correct freemium pattern.
- **Priority**: HIGH — conversion impact

---

### BUG-11 — "Unlock the Oracle" CTA wrong destination + missing Chat button in nav
- **Where**: `frontend/src/app/[locale]/(app)/dashboard/page.tsx` — CTA button + sidebar navigation
- **What (part 1)**: The CTA button on dashboard says "Unlock The Oracle" and links to `/pricing`. Victor wants this changed to "Chat with the Oracle" → `/chat`.
- **What (part 2)**: There is no Chat button in the left navigation sidebar. This is the primary feature of the app and it's not directly accessible from the nav.
- **Fix 1**: Find the CTA button component on the dashboard — change label to `"Chat with the Oracle"` and href to `/chat`
- **Fix 2**: Add a Chat nav item to the sidebar. Review `frontend/src/components/shell/sidebar.tsx` — add Chat link (with chat bubble icon) near the top of the nav list, above or below Dashboard.
- **Priority**: HIGH — Chat is the core product feature and it's not reachable from the main nav

---

### BUG-12 — Left sidebar not translating when language is switched
- **Where**: `frontend/src/components/shell/sidebar.tsx` — nav labels not using i18n translation keys
- **What**: Switching language updates the dashboard content but the left sidebar nav labels stay in English. Also "Personal Daily Reading" stays in English in both BG and EN.
- **Broader decision — see DECISION-01 below**
- **Priority**: Deferred — see DECISION-01

---

### BUG-14 — Typed message cleared from input on failed send (message lost forever)
- **Where**: `frontend/src/components/chat/chat-input-bar.tsx` — send handler
- **What**: When a message fails to send (e.g. WebSocket disconnect), the input field is cleared and the message is gone. User loses everything they typed. No way to recover — message never reached the backend.
- **What should happen**: On any send failure:
  1. Keep the typed text in the input field — do NOT clear it
  2. Show a red error banner: "Message failed to send — your text is preserved above, press Enter to retry"
  3. Re-enable the input and send button immediately
- **Fix**: In the send handler, only clear the input field AFTER confirmed successful send. Move `setInputValue('')` from before/during the send to inside the success callback. On catch/error, restore the input value if it was already cleared.
- **Also**: Add `localStorage.setItem('astrologaai_draft_' + conversationId, inputValue)` as a draft autosave on every keystroke (debounced 1s). Restore draft on page load. This is how Gmail, Slack, and every serious messaging product handles this.
- **Priority**: HIGH — users lose work, causes real frustration

---

### ✅ BUG-15 — Oracle responds in Bulgarian regardless of user's language setting
- **Status**: FIXED (pending deploy)
- **Root cause**: `DEFAULT_LANGUAGE = 'bg'` in `languageDetection.ts` + 4 places in `chatController.ts` defaulting to `'bg'` when user language not found
- **Fixes applied**:
  1. `languageDetection.ts` line 18: `DEFAULT_LANGUAGE = 'bg'` → `'en'`
  2. `chatController.ts` line 230: `=== 'en' ? 'en' : 'bg'` → `=== 'bg' ? 'bg' : 'en'`
  3. `chatController.ts` lines 536, 816, 878 (3 occurrences): `|| 'bg'` → `|| 'en'`
  4. New Oracle system prompt language section: "If the user writes in a different language than their setting, immediately switch to match the language they are writing in"
- **Note**: Tier context upgrade messages in `llm.ts` still have hardcoded Bulgarian CTAs (minor — doesn't affect main Oracle responses)
- **Priority**: ~~HIGH~~ → Done

---

### ✅ BUG-16 — Oracle reveals too much too fast (critical subscription model risk)
- **Where**: Backend LLM system prompt — `/admin/prompts` → master prompt
- **What**: Oracle gives 6-8 planetary insights, chart summary, transits, and life themes in 2-3 messages. Equivalent of a full professional reading (€100-200 value) delivered in minutes. Users have nothing left to discover → no reason to stay subscribed.
- **This is a system prompt change — no code required. Edit at `/admin/prompts`.**
- **New Oracle rules to add to system prompt**:
  1. **One insight per response, max two**: Never list multiple aspects. Pick the single most relevant one to what the user just asked. Go deep — real examples, emotional resonance, personal application. Make them feel truly seen by ONE thing, not vaguely described by eight.
  2. **Always end with an open loop**: Every response must end with either (a) a question that invites the user to go deeper, or (b) an intrigue hook: *"There's something in your 8th house I haven't shown you yet that explains a pattern you've probably noticed your whole life…"* Never fully close a topic.
  3. **Progressive revelation by session**: Session 1 = Sun, Moon, Rising only. Session 2+ = follow what the USER brings. They mention relationships → explore Venus and 7th house. They mention work → Saturn and MC. They mention fear or recurring pain → only then go to 12th house and Chiron. Never volunteer wound material until the user opens that door.
  4. **Create FOMO and forward momentum**: *"Your Saturn configuration is one of the most unusual I've seen — but I want to understand something about you first before I reveal it. Tell me: do you feel like you have to earn love?"* Every session should end with the user thinking "I learned something profound AND there's still so much more to discover."
  5. **Match depth to the question**: If the user asks "what's interesting in my chart?" — give ONE intriguing hook and ask what resonates. Do not dump the whole chart.
- **Priority**: CRITICAL — this is the subscription retention mechanism. Users who get everything in 10 messages will cancel.

---

## Architecture Changes

### ARCH-01 — Migrate chat from WebSocket to HTTP POST + SSE streaming
- **Current**: Persistent WebSocket connection with 30s heartbeat, reconnection logic, Railway proxy fights
- **Target**: HTTP POST to send message + Server-Sent Events (SSE) to stream response — exactly how ChatGPT, Claude, Gemini work
- **Why**: WebSocket is the wrong tool for AI chat. It requires a persistent connection to stay alive, which conflicts with how cloud proxies (Railway, Vercel, Cloudflare) work. SSE is one-directional (server→client streaming) which is exactly what AI response streaming needs. HTTP POST handles the client→server direction.
- **How it works**:
  1. User hits Send → `POST /api/v1/chat/messages` with `{ conversationId, message, userContext }`
  2. Backend loads conversation history from DB by conversationId
  3. Calls LLM, streams response back as `Content-Type: text/event-stream`
  4. Frontend reads the SSE stream token by token, renders in real time
  5. Stream ends → connection closes → done
  6. Next message = new POST, same conversationId, DB loads history again
  7. Old session from 2 months ago = just a DB lookup, works identically
- **What gets removed**: `socket-client.ts`, WebSocket server setup, heartbeat logic, reconnection manager, message queuing for reconnect — all gone
- **What gets added**: SSE streaming endpoint, simple `fetch()` with `ReadableStream` on frontend
- **Result**: Zero heartbeat bugs, zero disconnect bugs, zero Railway proxy fights, sessions work forever, simpler codebase
- **Scope**: Large — full replacement of `chat-context-ws.tsx` + backend WebSocket handlers. Plan carefully before starting.
- **Priority**: High — permanent fix for entire class of chat reliability bugs. Do after current testing/deployment cycle.

---

## Decisions

### DECISION-01 — Language strategy: English first, Bulgarian second
- **Decision**: Complete and deploy the entire app in English first. All bugs, features, and deployment done in English as the single working language. Bulgarian translation is a separate phase after the English version is stable and deployed.
- **What this means**:
  - Do NOT spend time fixing partial translation issues right now
  - BUG-12 and all other i18n bugs are deferred until the English version is fully working
  - When BG translation phase begins: audit every page for hardcoded English strings, move all to i18n keys, then translate all keys in `bg.json`
  - The language switcher can remain in the UI but BG will be incomplete until that phase
- **Other languages**: After BG is complete, evaluate adding Romanian, Greek, or others
- **Priority of this decision**: Noted — do not touch translation files until English is fully stable

---

## Passed Tests

| # | Test | Result |
|---|------|--------|
| 1.1–1.4 | All health endpoints | ✅ |
| 3A.1–3A.8 | Full registration section | ✅ |
| 3B.1–3B.8 | Full login section incl. password reset email | ✅ |
| 3B — token expiry | 15 min access + 401 reactive refresh | ✅ |
| 4 (partial) | Onboarding form loads, birth data submits | ✅ (with workaround for BUG-04) |

---

## Skipped (pending setup)
- Section 3C — Google OAuth (needs Google Cloud credentials — same project as ENH-02)
- Magic Link section — to be replaced with Facebook OAuth (FEAT-02)

---

## Testing Progress

| Section | Status |
|---------|--------|
| 1. Health checks (backend) | ✅ Complete |
| 2. Environment check | ✅ Complete |
| 3A. Registration | ✅ Complete |
| 3B. Login / Password reset | ✅ Complete |
| 3C. Google OAuth | ⏭ Skipped — needs Google Cloud credentials |
| 3D. Magic Link / Facebook | ⏭ Skipped — to be replaced with Facebook OAuth (FEAT-02) |
| 4. Onboarding / Birth data | ✅ Partial — form works, location 429 bug noted (BUG-04) |
| 5. Dashboard | ✅ Partial — BUG-09/10/11/12 noted |
| 6. Chat / Oracle | 🛑 Stopped — WebSocket disconnect (BUG-13/14/15/16) |
| 7–16 | ⏳ Not yet started |

**Stopped at: Section 6 (Chat / Oracle)**
