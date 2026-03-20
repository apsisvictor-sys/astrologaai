# AstroLogAI — Master Roadmap & Source of Truth
> **Single source of truth.** Last updated: 2026-03-20 (Sprint 4 complete — annual billing, moon phase, pause subscription deployed ace2602).
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

## ✅ Sprint History

| Sprint | Name | Deployed | Key Items |
|--------|------|---------|-----------|
| Fix sprint | Stability | 2026-03-17 (059b70d / b8f1f22 / fc81ba7) | BUG-01/02/03/09/10/11/15/16/20/21/22/23/25/26/27/28/29/30/32/33 + CosmicSpinner, auth-context hardening, DB consolidation |
| Sprint 1 | Lockdown | 2026-03-18/19 | Security audit fixes: BUG-34/35/36/37/41/42/43/44/47/48/49/50/51/52/53/54/56 |
| Sprint 2 | Growth emails | 2026-03-19 | React Email templates, branded transactional emails, lifecycle cron (FEAT-05), Big 3 share card (ENH-18), retrograde banners (ENH-20) |
| Sprint 3 | (merged into Sprint 2 delivery) | 2026-03-19 | — |
| Sprint 4 | Revenue | 2026-03-20 (ace2602) | Annual billing (FEAT-07), moon phase dashboard (FEAT-06), pause/cancel (ENH-19) |

---

## ✅ Deployed Batch — 2026-03-17 (historical)

| # | What |
|---|------|
| BUG-01 | ✅ Guest session localStorage cleared on login/register |
| BUG-02 | ✅ Swiss Ephemeris second provider removed |
| BUG-03 | ✅ Login error shows correctly |
| BUG-09 | ✅ Dashboard quick action labels fixed (Chat/Forecast/Partners) |
| BUG-10 | ✅ FREE tier DailyHoroscopeCard shows 2 free sections |
| BUG-11 | ✅ Chat in sidebar nav, dashboard CTA → /chat |
| BUG-15 | ✅ Oracle language default fixed (bg → en) |
| BUG-16 | ✅ New Oracle system prompt |
| UI | ✅ CosmicSpinner — unified orbital loading animation |

---

## 🔐 Security Issues (Audit 2026-03-18)

> Found during systematic source-level audit of all backend and frontend source files. **Fix all CRITICAL items before public launch.** Items ordered by severity.

### ~~BUG-34~~ — ✅ RESOLVED (2026-03-18, 60570ff) — Stripe webhook forgery fixed
- **Priority:** CRITICAL — direct revenue loss; no Stripe involvement needed; single `curl` command exploits it
- **Where:** `backend/src/routes/subscription.ts` — webhook handler (search for `STRIPE_WEBHOOK_SECRET`)
- **Symptom:** When `STRIPE_WEBHOOK_SECRET` is not set in the environment, OR when the `stripe-signature` header is absent from the incoming request, the handler skips signature verification entirely and processes the raw JSON body as a valid `Stripe.Event`. An attacker can `curl -X POST` the webhook URL with a crafted `customer.subscription.updated` body setting any user's tier to `premium` — no Stripe account needed.
- **Root cause:** A `try/catch` around `stripe.webhooks.constructEvent()` falls back to `JSON.parse(req.body)` when the secret is missing or the header is absent. Likely added for local dev convenience, never removed.
- **Fix:**
  1. Remove the fallback entirely. Never parse the raw body as a trusted event without verification.
  2. Add a startup crash guard: `if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('[STARTUP] STRIPE_WEBHOOK_SECRET is required')`.
  3. If `stripe-signature` header is missing, return `400` immediately.
  4. Confirm Railway env has `STRIPE_WEBHOOK_SECRET` set.

---

### ~~BUG-35~~ — ✅ RESOLVED (2026-03-18, b297b13) — Rate limit middleware now fails closed
- **Priority:** CRITICAL — direct billing abuse risk; any Redis hiccup bypasses ALL subscription limits for ALL users simultaneously
- **Where:** `backend/src/middleware/queryLimit.ts` lines ~397-404 — the outer `catch` block
- **Symptom:** The `catch` block calls `next()` unconditionally on any error (Redis unreachable, Postgres timeout, network blip). During any infrastructure hiccup, every user including FREE tier gets unlimited Oracle queries for the duration of the outage.
- **Root cause:** Deliberate "fail open" design choice — wrong for a billing-critical middleware.
- **Fix:**
  1. Change the catch block to return `503` with a user-friendly message in both languages: `"The Oracle is temporarily unavailable. Please try again shortly."` / `"Оракулът е временно недостъпен. Моля, опитайте отново."`.
  2. Optional graceful degradation: cache the last-known limit result in Redis with a short TTL (30s). On error, serve from cache. Only fail closed if cache is also unavailable.
  3. Add structured error logging (not just `console.warn`) that can trigger a Slack alert.

---

### ~~BUG-36~~ — ✅ RESOLVED (2026-03-18, 63fb53f + b817b00) — Refresh token no longer in localStorage; httpOnly cookie only; SameSite:none in prod
- **Priority:** CRITICAL — any XSS in the app (including third-party scripts) can steal the refresh token and silently own accounts for 7 days
- **Where:** `frontend/src/lib/auth-context.tsx` lines ~293-294, ~347-348, ~466-493 — `loginUser`, `registerUser`, `refreshSession` functions
- **Symptom:** The backend sets `refresh_token` as an `httpOnly` cookie correctly. However, the backend also returns `refreshToken` in the JSON response body, and the frontend saves it to `localStorage` as `astrologaai_refresh_token`. The `refreshSession` function reads this localStorage value and sends it in the POST body to `/auth/refresh`. This completely negates the httpOnly protection — a single XSS payload can steal the token and maintain access indefinitely.
- **Note:** ARCH-03 below currently marks `astrologaai_refresh_token` localStorage as "KEEP (legitimate use)" — that assessment must be corrected. See ARCH-03 for updated guidance.
- **Fix:**
  1. In `auth-context.tsx`: remove all `localStorage.setItem('astrologaai_refresh_token', ...)` calls.
  2. In `auth-context.tsx`: remove all `localStorage.getItem('astrologaai_refresh_token')` calls. Remove `body: JSON.stringify({ refreshToken })` from the refresh fetch call.
  3. In `backend/src/controllers/authController.ts`: confirm `/auth/refresh` reads the token from the `httpOnly` cookie (`req.cookies.refreshToken`), not the request body. If it reads from body, change it to read from cookie.
  4. Also stop returning `refreshToken` in the JSON response body of login and register responses — clients no longer need it.
  5. Update ARCH-03 entry: move `astrologaai_refresh_token` from ✅ KEEP to 🔴 REMOVE.

---

### ~~BUG-37~~ — ✅ RESOLVED (2026-03-18, 556acf0) — CORS wildcard replaced with regex matching own Vercel project only
- **Priority:** CRITICAL — any attacker-controlled `*.vercel.app` domain can make credentialed API requests on behalf of logged-in users
- **Where:** `backend/src/config/runtime.ts` lines ~50-52 — CORS origin allowlist
- **Symptom:** CORS allows `*.vercel.app` with `credentials: true`. An attacker deploys any Vercel app, serves a page that silently fetches the AstroLogAI API, and the browser includes the victim's cookies. The response is readable by the attacker's origin — full user data exfiltration, chat session access, and account manipulation.
- **Root cause:** Wildcard added to allow Vercel preview deployments during dev — correct intent, wrong scope (covers ALL Vercel apps globally).
- **Fix:**
  1. Replace `*.vercel.app` wildcard with a regex matching only your own project's deployments: `/^https:\/\/astrologaai(-[a-z0-9]+)?\.vercel\.app$/`
  2. Keep `astrologa.bg`, `www.astrologa.bg` in the allowlist.
  3. Keep `localhost:3000` / `localhost:3001` for local dev only — guard these with `NODE_ENV !== 'production'`.

---

### ~~BUG-38~~ — ✅ RESOLVED (2026-03-20, d5aa22d) — Refresh token rotation with opaque tokens + JWT compat shim (remove shim 2026-04-20)
### ~~BUG-38 original~~ — HIGH: No refresh token rotation — stolen refresh tokens remain valid for 7 days with no revocation path
- **Priority:** HIGH — once a token is stolen (especially from localStorage per BUG-36), the attacker can silently maintain access with no detection
- **Where:** `backend/src/controllers/authController.ts` — `refreshToken` endpoint handler
- **Symptom:** When a refresh token is exchanged for a new access token, the old token is NOT invalidated. No token family is tracked. Both the legitimate user and an attacker with the stolen token can use the same refresh token indefinitely for 7 days. Silent parallel sessions with no alert.
- **Fix:**
  1. On each successful refresh: issue a new refresh token, store its hash (SHA-256) on the `User` row (or a `RefreshToken` table), and invalidate the old hash.
  2. If an already-consumed token is used again (reuse detection), treat it as a compromise signal: immediately invalidate ALL refresh tokens for that user and force re-login.
  3. Minimum viable: add `refreshTokenHash VARCHAR(64)` to `User` table. On refresh: `bcrypt.compare` or SHA-256 compare, then update to new hash.

---

### ~~BUG-39~~ — ✅ RESOLVED (2026-03-20, fa1d947) — Session invalidation uses Redis Set per user; sessions registered on create
### ~~BUG-39 original~~ — HIGH: Session invalidation after password change uses wrong Redis key pattern — existing sessions never invalidated
- **Priority:** HIGH — a user who changes their password cannot force-logout active sessions, including attacker sessions after account takeover
- **Where:** `backend/src/utils/redis.ts` line ~222 — `invalidateUserSessions` function
- **Symptom:** `invalidateUserSessions` scans for keys matching `session:*:${userId}`. Chat contexts are stored under `chat_context:${sessionId}` (user ID is not in the key). The scan returns zero matches. After a password change or account recovery, all existing sessions — including those held by an attacker — continue to work.
- **Fix:**
  1. Option A (recommended): Maintain a Redis Set per user tracking their active session IDs: `SADD user_sessions:${userId} ${sessionId}` on session create, `SREM` on session delete, `DEL user_sessions:${userId}` on password change to batch-invalidate all sessions.
  2. Option B: Include `userId` in the chat context key: `chat_context:${userId}:${sessionId}` — then update the scan pattern to match.
  3. This also unblocks ENH-17 (fixing the KEYS * scan).

---

## 🔴 Active Bugs (code fix needed)

### BUG-24 — Admin users table shows wrong query count (2) vs usage tab (11)
- **Priority:** MEDIUM — admin has wrong data visibility; makes user management unreliable
- **Where:** `backend/src/routes/admin.ts` — `/admin/users` endpoint query count vs `/admin/usage` endpoint
- **Symptom:** Users table shows 2 queries for admin account; Usage & Cost tab shows 11 requests for same account.
- **Likely cause:** The two endpoints count from different sources. Users table likely reads from `subscription.queriesUsedThisMonth` (monthly counter, resets), while usage tab may read from `LlmUsage` table (cumulative all-time). They measure different things and it's not communicated clearly.
- **Fix:** Clarify and align the two counters. Users table should show current month queries. Usage tab shows total/historical. Add column headers that make the distinction clear. Verify both counts are accurate.

---

### ~~BUG-40~~ — ✅ NOT A BUG — Partners is PREMIUM-only by design
- `PRO: 0` is intentional. Partners (synastry) is a PREMIUM-exclusive feature.
- Frontend correctly gates `/partners` with `minTier: 'PREMIUM'` — PRO users see upgrade CTA.
- Backend limit stays `PRO: 0, PREMIUM: 10`. No change needed.

---

### ~~BUG-41~~ — ✅ RESOLVED (2026-03-18, 1242244) — Stripe subscription period end uses actual Stripe value
- **Priority:** HIGH — billing correctness; annual subscribers pay for 12 months and get cut off after 30
- **Where:** `backend/src/routes/subscription.ts` — `invoice.payment_succeeded` handler line ~908
- **Symptom:** `currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)` — hardcoded 30-day expiry set on every successful payment, regardless of whether the subscription is monthly or annual.
- **Root cause:** Stripe's actual `current_period_end` on the subscription object was not used.
- **Fix:** Within the handler, retrieve the Stripe subscription object and use its `current_period_end` timestamp:
  ```ts
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  currentPeriodEnd: new Date(subscription.current_period_end * 1000)
  ```

---

### ~~BUG-42~~ — ✅ RESOLVED (2026-03-18, 240a37a) — Prices unified to 9.99/19.99 across backend config and frontend
- **Priority:** HIGH — users see one price and may pay a different one; chargeback and trust risk
- **Where:**
  - `frontend/src/app/[locale]/pricing/page.tsx` lines ~50-108 — `PLANS` array (hardcoded 9.99/19.99)
  - `backend/src/config/subscription-tiers.ts` lines ~51-92 — `price: 10` / `price: 20`
  - `backend/src/routes/subscription.ts` lines ~56-58 — `SUBSCRIPTION_PLANS` used in `/subscription/plans` API response
- **Symptom:** The pricing page displays €9.99 and €19.99 as hardcoded local values. The API's plan listing returns 10 and 20. Any UI that reads from the API shows different prices than the marketing page.
- **Fix:**
  1. Canonicalize in `subscription-tiers.ts`: change `price: 10` → `price: 9.99` and `price: 20` → `price: 19.99`.
  2. Make the pricing page read prices from the `/subscription/plans` API endpoint instead of a local hardcoded array. This ensures prices live in exactly one place.
  3. Update `SUBSCRIPTION_PLANS` in `subscription.ts` to reference `subscription-tiers.ts` values directly.

---

### ~~BUG-43~~ — ✅ RESOLVED (2026-03-18, 05afe1e) — via BUG-44: duplicate rate limiter removed
- **Priority:** HIGH — abuse vector; any FREE user can get unlimited daily queries by repeatedly clearing chat history
- **Where:** `backend/src/controllers/chatController.ts` lines ~926-928 — `clearAllSessions` function
- **Symptom:** `clearAllSessions` deletes the Redis key `monthly:${userId}:${month}` — the same key used by `chatController.ts`'s internal `checkRateLimit`. After clearing, the counter reads 0 and the user gets 3 fresh queries. Repeat indefinitely.
- **Note:** The DB-backed `queryLimitMiddleware` counter is NOT reset, so this bypass only works if `chatController.ts`'s own rate limit fires before the middleware rejects — depends on route registration order. Either way the duplicate system is broken. See BUG-44.
- **Fix:** Best fix is BUG-44 (remove the duplicate rate limit from `chatController.ts` entirely). Immediate patch: do NOT delete the rate limit Redis key in `clearAllSessions`.

---

### ~~BUG-44~~ — ✅ RESOLVED (2026-03-18, 05afe1e) — Duplicate Redis rate limiter removed from chatController; queryLimitMiddleware is sole authority
- **Priority:** HIGH — users can receive different rate limit errors from the same request; one system can be bypassed (BUG-43)
- **Where:**
  - `backend/src/controllers/chatController.ts` lines ~85-138 — `checkRateLimit` using Redis monthly counters with stale "FREE: 10/month" comment
  - `backend/src/middleware/queryLimit.ts` — correct DB-backed daily limiter
- **Symptom:** Two completely separate rate limiting systems run for every chat request. They use different data sources, different limit values, and return different error messages. The chatController's system has stale limit values in comments ("10 queries/month" — no longer correct since FREE is now 3/day). A user hitting one system's limit but not the other gets inconsistent behaviour.
- **Fix:**
  1. Delete the `checkRateLimit` function entirely from `chatController.ts`.
  2. Remove its `const redisClient = ...` setup from `chatController.ts`.
  3. Remove all `await checkRateLimit(userId, tier)` call sites within `chatController.ts`.
  4. Remove the Redis monthly counter increment (`INCR monthly:${userId}:${month}`) from `chatController.ts`.
  5. Rely exclusively on `queryLimitMiddleware`. This also resolves BUG-43 as a side effect.

---

### ~~BUG-45~~ — ✅ RESOLVED (2026-03-20, c27d118) — Verification email on register, verify route, resend route, banner for unverified users
### ~~BUG-45 original~~ — MEDIUM: Email verification is not implemented — any address registers immediately without verification
- **Priority:** MEDIUM — spam account risk; users with typo'd emails have no recovery path; no proof of address ownership
- **Where:** `backend/src/controllers/authController.ts` — post-registration logic
- **Symptom:** `authController.ts` line ~170 has `// TODO: Send confirmation email via Resend`. The `emailVerified` column exists in the DB and is set to `false` on registration, but no verification email is sent and no verification endpoint exists. Accounts are immediately active and fully functional.
- **Fix:**
  1. Generate a `verificationToken` (`crypto.randomBytes(32).toString('hex')`) on registration. Store it + a 24h expiry on the User row.
  2. Send a verification email via Resend (already integrated) with link: `https://astrologa.bg/verify-email?token=...`.
  3. Add `GET /auth/verify-email?token=` route: validate token, set `emailVerified: true`, clear the token.
  4. Until verified: user can log in but Oracle queries return 403 with message "Please verify your email to start chatting." (both languages).
  5. Add `POST /auth/resend-verification` endpoint for users who didn't receive it.

---

### ~~BUG-46~~ — ✅ RESOLVED (2026-03-20, fa1d947) — OAuth-only users skip password check on delete (JWT auth is sufficient)
### ~~BUG-46 original~~ — MEDIUM: OAuth users cannot delete their account — bcrypt throws on null passwordHash
- **Priority:** MEDIUM — Google OAuth users are permanently locked out of self-service account deletion; support burden
- **Where:** `backend/src/controllers/deleteAccountController.ts` line ~92 — password verification step
- **Symptom:** `deleteAccount` calls `bcrypt.compare(password, user.passwordHash)`. OAuth users either have `passwordHash = null` or a bcrypt salt string (not a real user-set password). If `passwordHash` is null, `bcrypt.compare` throws synchronously before the async phase — the surrounding try/catch may not catch it. Even if it doesn't throw, the comparison always fails. OAuth users can never pass this check.
- **Fix:**
  1. At the start of `deleteAccount`, check if the user is OAuth-only: `if (!user.passwordHash || user.oauthProvider)`.
  2. If OAuth-only: skip password check (the user is already authenticated via JWT — sufficient verification). Proceed directly to deletion.
  3. Optionally require Google re-authentication as a second factor for OAuth users before deletion.
  4. Return a clear error message for any failed flow: `"This account uses Google sign-in. No password is required to delete it."`.

---

### ~~BUG-47~~ — ✅ RESOLVED (2026-03-18, 6f9a360) — /health/env endpoint removed entirely
- **Priority:** MEDIUM — security reconnaissance; helps attackers identify which services are configured or missing
- **Where:** `backend/src/index.ts` — `/health/env` route registration (no auth middleware applied)
- **Symptom:** `GET /health/env` returns a JSON map of which environment variables are present vs absent. Any external caller learns whether `STRIPE_WEBHOOK_SECRET` is set, what Redis config is active, which AI providers are configured, etc.
- **Fix:** Option A (simplest): remove the endpoint entirely — check env vars via the Railway dashboard. Option B: add `adminAuthMiddleware` to the route. Do not leave it public.

---

### ~~BUG-48~~ — ✅ RESOLVED (2026-03-18, e07fbf9) — All files use shared Prisma singleton from utils/prisma
- **Priority:** MEDIUM — in production under moderate traffic, Railway Postgres will hit its connection limit, causing 500 errors
- **Where:**
  - `backend/src/controllers/chatController.ts` line ~39 — `new PrismaClient()`
  - `backend/src/index.ts` line ~133 — possibly another instantiation
  - Search: `grep -r "new PrismaClient" backend/src/` to find all occurrences
- **Symptom:** Each `new PrismaClient()` call opens its own connection pool (default 10 connections). Multiple instances multiply the connection count. Under moderate traffic, Postgres hits its connection limit and new connections fail with 500.
- **Fix:** Every file that currently calls `new PrismaClient()` must be updated to import the shared singleton instead: `import { prisma } from '../utils/prisma'`. Only `backend/src/utils/prisma.ts` should ever instantiate `PrismaClient`.

---

### ~~BUG-49~~ — ✅ RESOLVED (2026-03-18, 8f94032) — Session title uses user.language to set EN/BG default
- **Priority:** MEDIUM — English-language users see 'Нов разговор' (Bulgarian) as the title for every new conversation in their sidebar
- **Where:** `backend/src/controllers/chatController.ts` line ~194 — `createSession` function
- **Symptom:** `title: 'Нов разговор'` is hardcoded. English users see Bulgarian text in the chat history list.
- **Fix:**
  ```ts
  const defaultTitle = req.user.language === 'bg' ? 'Нов разговор' : 'New Conversation';
  title: defaultTitle
  ```

---

### ~~BUG-50~~ — ✅ RESOLVED (2026-03-18, 60e9a49) — adminAuthMiddleware required on /cron/status
- **Priority:** MEDIUM — information disclosure; leaks internal reset schedule and cron configuration
- **Where:** `backend/src/routes/cron.ts` line ~140 — cron status endpoint
- **Symptom:** The endpoint checks for a cron job secret header but has a fallback that returns reset-day configuration publicly when the header is absent. Any external caller can read the cron schedule.
- **Fix:** Require `adminAuthMiddleware` on this endpoint. Remove the public fallback. If an external cron service needs to call it, it must always include the secret header — no fallback.

---

### ~~BUG-51~~ — ✅ RESOLVED (2026-03-18, 75dd055) — Startup warning added when ADMIN_EMAILS is not set
- **Priority:** MEDIUM — silent production lockout; no error message; no startup warning
- **Where:** `backend/src/middleware/adminAuth.ts` — admin email check
- **Symptom:** If `ADMIN_EMAILS` is not set in Railway, the parsed array is empty and every admin request returns 403 with no explanation. There is no startup log or health check warning. Victor would have no obvious diagnostic.
- **Fix:**
  1. Add a startup warning: `if (!process.env.ADMIN_EMAILS) console.warn('[STARTUP] WARNING: ADMIN_EMAILS is not set — admin panel will be inaccessible to all users')`.
  2. Document `ADMIN_EMAILS` as a required env var in the Railway deployment checklist.

---

### ~~BUG-52~~ — ✅ RESOLVED (2026-03-18, 7528d96) — Guest chat language from request body or Accept-Language header
- **Priority:** MEDIUM — Bulgarian-speaking guests (the primary target market) experience the Oracle in English; reduces conversion
- **Where:** `backend/src/routes/guestChat.ts` line ~169 — language passed to chart summary generation
- **Symptom:** `language: 'en'` is hardcoded regardless of the guest's browser language or the locale in the URL path.
- **Fix:**
  1. Accept a `language` field in the guest chat request body — the frontend already knows the active locale from the `[locale]` URL segment and should send it.
  2. Alternatively, read `Accept-Language` header: `const lang = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en'`, then `lang === 'bg' ? 'bg' : 'en'`.

---

### ~~BUG-53~~ — ✅ RESOLVED (2026-03-18, 0efd678) — Using crypto.randomBytes for OAuth fake password
- **Priority:** LOW — works at runtime but is a maintenance hazard
- **Where:** `backend/src/controllers/oauthController.ts` line ~243
- **Symptom:** `const fakePassword = bcrypt.genSaltSync(32)` generates a bcrypt salt string (e.g., `$2b$32$...`), which looks like an already-hashed value. Future maintainers may skip hashing it or assume it's already processed.
- **Fix:** `const fakePassword = require('crypto').randomBytes(32).toString('hex')` — explicit, unambiguous, and cryptographically correct.

---

### ~~BUG-54~~ — ✅ RESOLVED (2026-03-18, 0efd678) — New OAuth users inherit locale from Accept-Language header
- **Priority:** LOW — English-speaking Google OAuth users default to Bulgarian; first session is in wrong language
- **Where:** `backend/src/controllers/oauthController.ts` line ~260 — user creation on first OAuth login
- **Symptom:** `language: 'bg'` is hardcoded for all new OAuth users. A user who clicks "Sign in with Google" from the English-language homepage gets a Bulgarian UI and Bulgarian Oracle.
- **Fix:**
  1. Encode the current locale in the OAuth `state` parameter before redirecting to Google: `state: JSON.stringify({ returnTo, locale: req.query.locale || 'en' })`.
  2. Parse `state` on the OAuth callback and use the locale to set `language` on the new user.

---

### ~~BUG-55~~ — ✅ RESOLVED (2026-03-20, fa1d947) — paidAt uses Stripe status_transitions.paid_at
### ~~BUG-55 original~~ — LOW: Subscription paidAt records invoice creation time not actual payment time
- **Priority:** LOW — minor billing record accuracy issue; affects retried invoices
- **Where:** `backend/src/routes/subscription.ts` line ~696 — `paidAt` field in `invoice.payment_succeeded` handler
- **Symptom:** `paidAt: new Date(invoice.created * 1000)` — uses invoice creation timestamp. For invoices with failed first attempts and later retries, `paidAt` could be hours or days before actual payment.
- **Fix:** Use `invoice.status_transitions.paid_at` for the actual payment timestamp: `paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date()`.

---

### ~~BUG-56~~ — ✅ RESOLVED (2026-03-18, 4f76d4c) — PREMIUM burstLimit set to -1 (truly unlimited)
- **Priority:** LOW — comment/reality mismatch; potential marketing copy inconsistency
- **Where:** `backend/src/config/subscription-tiers.ts` lines ~68-93 + `backend/src/middleware/queryLimit.ts` lines ~63-70
- **Symptom:** Code comments say "PREMIUM: no burst limits" / "unlimited". In reality `burstLimit: 60` is set and `isUnlimitedBurst` only returns true when `burstLimit === -1`. PREMIUM users hitting >60 req/min are rate-limited.
- **Fix:** Either (a) set PREMIUM `burstLimit: -1` to actually make it unlimited, or (b) update all comments to say "up to 60 requests/minute" and ensure marketing copy matches. 60 req/min is reasonable for an astrology SaaS — just be honest about it.

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

### ~~BUG-09~~ — ✅ RESOLVED (2026-03-17, deployed) — Dashboard quick actions now Chat/Forecast/Partners with correct hrefs

---

### ~~BUG-10~~ — ✅ RESOLVED (2026-03-17, b8f1f22)
- DailyHoroscopeCard 3-tier gating: FREE=4, PRO=8, PREMIUM=12 life areas. All 12 API areas in AREA_ORDER.

---

### ~~BUG-11~~ — ✅ RESOLVED (2026-03-17, deployed) — Chat is first item in sidebar nav; dashboard CTA says "Chat with the Oracle" → /chat

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

### ~~ENH-04~~ — ✅ RESOLVED (2026-03-20, 14dd8dd) — LlmUsage upsert after each Oracle stream; character-length token approximations
### ~~ENH-04 original~~ — Wire LlmUsage table (Task 9 from old roadmap)

---

### ENH-05 — Re-enable Redis in production (Task 10 from old roadmap)
- **Priority:** Medium — currently using in-memory fallback only
- **Fix:** Confirm `REDIS_URL` is set correctly on Railway (rediss:// format for Upstash). Wire Upstash credentials.

---

### ENH-15 — MEDIUM: Add automatic 401 → token refresh interceptor — users currently get stuck on expired access tokens
- **Priority:** MEDIUM — without this, any user idle for 15 minutes hits silent 401s on their next action and may see a broken/confusing UI
- **Where:** `frontend/src/lib/auth-context.tsx` — needs a central `apiFetch` wrapper that all API calls route through
- **What:** When the 15-minute access token expires, the next API call returns 401. There is currently no automatic interception to refresh the token and retry. The user sees a confusing error or broken state rather than a seamless experience.
- **Implementation:**
  1. Create (or confirm existence of) a central `apiFetch(url, options)` wrapper used by all frontend API calls.
  2. On any 401 response: call `refreshSession()` from `auth-context.tsx`, then replay the original request once with the new access token.
  3. If `refreshSession()` fails (refresh token expired): redirect to `/login` with a toast: "Your session expired. Please log in again." / "Сесията ви изтече. Моля, влезте отново."
  4. Handle concurrent requests: if a refresh is in progress, queue subsequent 401 requests and release them once the new token is available (prevents multiple simultaneous refresh calls).

---

### ENH-16 — LOW: Replace Redis KEYS * scan with SCAN cursor in session cleanup — prevents production latency spikes
- **Priority:** LOW — performance risk at scale; `KEYS` is O(N) and blocks the entire Redis keyspace
- **Where:** `backend/src/utils/redis.ts` — `clearUserSessionContexts` function
- **What:** `redisClient.keys('chat_context:*')` scans every key in Redis and blocks all other Redis operations for the duration. With thousands of active sessions, this causes latency spikes for all concurrent users.
- **Fix:** Replace with a `SCAN` cursor loop:
  ```ts
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', 'chat_context:*', 'COUNT', 100);
    cursor = nextCursor;
    // filter keys belonging to userId and delete
  } while (cursor !== '0');
  ```
  Long-term: maintain a `user_sessions:${userId}` Redis Set (also resolves BUG-39 session invalidation).

---

### ENH-17 — LOW: Subscription settings page uses inline locale ternaries instead of next-intl — add i18n keys
- **Priority:** LOW — inconsistent i18n pattern; fragile to adding new locales (deferred per DECISION-01)
- **Where:** `frontend/src/app/[locale]/(app)/settings/subscription/page.tsx` lines ~462-463, ~496
- **What:** `locale === 'bg' ? 'Нулиране на' : 'Resets on'` — direct locale comparison instead of `t('key')`. Adding a third language would require updating every ternary manually across the file.
- **Fix:** Add keys (`subscription.resetDate`, `subscription.usedQueries`, etc.) to the `settings` translation namespace. Replace all inline ternaries with `t('subscription.resetDate')`. Defer until full EN/BG translation pass (DECISION-01).

---

## 💡 Product Enhancements (Audit 2026-03-18)

> Ordered HIGH → MEDIUM impact on user retention, conversion, and revenue. These are near-term improvements to existing flows.

### ENH-18 — HIGH IMPACT: Shareable "Big 3" card — organic viral growth at zero ad spend ✅ CODE COMPLETE (2026-03-19)
- **Impact:** HIGH — the single highest-ROI growth feature in this category. Every Co-Star and Sanctuary user has shared their Big 3 card on Instagram. Drives organic signups by putting the brand in front of non-users. Zero infrastructure cost if built on Vercel OG.
- **Where:** New backend route + new frontend component, linked from `chart-panel.tsx`
- **What:** A shareable image card showing the user's Sun ☉ / Moon ☽ / Rising ↑ signs in the Void Prism design system (`#0D0010` background, `#e41aff` accents, Inter Bold). One-click download or share. A public page shows the card with a "Discover your cosmic blueprint → astrologa.bg" CTA below.
- **Implementation:**
  - **Backend:** `GET /api/v1/user/share-card` (auth required) — returns `{ sunSign, moonSign, risingSign, sunGlyph, moonGlyph, risingGlyph }`. Data already available from birth chart.
  - **OG image:** Add a Vercel Edge Function at `app/share/[userId]/opengraph-image.tsx` using Next.js built-in `ImageResponse` from `next/og`. Renders the card as a PNG at 1200×630. No external service needed.
  - **Public share page:** `app/share/[userId]/page.tsx` — public, no auth. Shows card + "Get your free reading →" CTA. This is the page users share. Fetches `GET /api/v1/user/share-card/public/:userId` (public endpoint, returns only sign names — no sensitive data).
  - **Frontend:** Add "Share my chart ✦" button to `chart-panel.tsx`. Opens modal: card preview image, "Download PNG" button (`<a href={imageUrl} download>`), "Copy link" button (copies `https://astrologa.bg/share/${userId}`).

---

### ENH-19 — HIGH IMPACT: Pause instead of cancel ✅ CODE COMPLETE (2026-03-20, ace2602)
- **Impact:** HIGH — industry standard retention mechanic. A single Stripe API call and a modal. No ongoing maintenance. Directly reduces churn.
- **Where:** Cancel button in `frontend/src/app/[locale]/(app)/settings/subscription/page.tsx` + new `POST /api/v1/subscription/pause` backend route
- **What:** When user clicks "Cancel subscription", show an intermediate modal before processing: *"Life gets busy. Pause your subscription for 1 month instead — your chart, Oracle history, and partner profiles stay safe."* Two buttons: "Pause for 1 month" (primary) and "Cancel anyway" (secondary, smaller).
- **Implementation:**
  - **Backend:** `POST /api/v1/subscription/pause` — calls `stripe.subscriptions.update(subscriptionId, { pause_collection: { behavior: 'void', resumes_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 } })`. Then update DB: `subscription.status = 'paused'`, `subscription.pausedUntil = new Date(Date.now() + 30 days)`.
  - **Resumption webhook:** Handle `customer.subscription.updated` where `pause_collection` becomes null → set user back to active tier in DB.
  - **Frontend:** Replace the current cancel confirmation with a two-step modal. Step 1: Pause offer. If user accepts → call pause endpoint → show confirmation: *"You're paused until [date]. We'll see you then ✦"*. If user clicks "Cancel anyway" → proceed with existing cancel flow.
  - **Paused state UI:** In subscription settings, show `Status: Paused (resumes [date])` with a "Resume now" button that calls `stripe.subscriptions.update(subId, { pause_collection: '' })`.

---

### ENH-20 — HIGH IMPACT: Mercury Retrograde + Eclipse season banners — drives daily opens at peak astrological moments ✅ CODE COMPLETE (2026-03-19)
- **Impact:** HIGH — Mercury retrograde is the most culturally recognised astrological event. Even non-astrology people know about it. Contextual banners during these windows make the app feel alive, drive daily opens, and generate social sharing organically.
- **Where:** Dashboard hero area + chat page top bar. New component `<CosmicEventBanner>` + new backend config/route.
- **What:** A persistent banner active during retrograde and eclipse periods. Personalised: states which house is affected in the user's chart. Pre-loads an Oracle session with a contextual prompt.
- **Implementation:**
  - **Backend:** Create `backend/src/config/astrological-events.ts` — a typed array of known events for 2026-2027 (retrograde dates are predictable years in advance). Example structure:
    ```ts
    export const ASTROLOGICAL_EVENTS: AstrologicalEvent[] = [
      { type: 'retrograde', planet: 'Mercury', glyph: '☿', startDate: '2026-04-09', endDate: '2026-05-03', affectedSign: 'Aries' },
      { type: 'eclipse', subtype: 'lunar', startDate: '2026-03-03', endDate: '2026-03-03', sign: 'Virgo' },
      // ...
    ];
    ```
  - **Route:** `GET /api/v1/transits/current-events` (auth optional) — filters events where `now` is between `startDate` and `endDate`. Returns active events + the user's affected house (calculated from their chart if authenticated).
  - **Frontend:** `<CosmicEventBanner>` fetched on dashboard/chat mount. Retrograde variant: `"☿ Mercury Retrograde in Aries — contracts, devices, and communication need extra care until May 3."` + `[Ask the Oracle →]` button that opens chat pre-seeded with: `"Mercury is retrograde and affecting my [Xth] house. What should I watch for and how can I work with this energy?"`. Eclipse variant: countdown until eclipse date, then on the day: a special full-bleed banner with dark imagery.
  - **Dismiss:** `localStorage.setItem('dismissed_event_${eventId}', '1')` — closes for this specific event.

---

### ENH-21 — HIGH IMPACT: Progressive profiling — make birth time optional to eliminate signup dropout
- **Impact:** HIGH — birth time is the most commonly unknown birth detail. Many users abandon registration when asked for exact time. Every removed barrier is a recovered user. Whole-sign houses are a legitimate astrological system that doesn't require birth time.
- **Where:** Birth data form + `backend/src/services/astrology/index.ts` + `birth_profiles` table
- **What:** Add "I don't know my exact birth time" checkbox. When checked, calculate using whole-sign houses and hide time-dependent data (exact ASC degree, MC, house cusps). Show a prompt in the chart view to add birth time later.
- **Implementation:**
  - **Frontend (birth data form):** Below the time input, add: `<label><input type="checkbox" onChange={handleUnknownTime} /> I don't know my exact birth time</label>`. When checked: disable and clear the time field, set `birthTime: null` in the submission payload. Show: *"We'll calculate your chart using the Whole Sign house system, which doesn't require birth time. You can always add it later."*
  - **Backend:** In the astrology service, when `birthTime` is null: pass a default noon time (12:00) to the astrology API but flag `houseSystem: 'whole-sign'`. Store `birthTime: null` and `houseSystem: 'whole-sign'` in the DB. In the Oracle system prompt, omit house placements from the chart summary when `houseSystem = 'whole-sign'` (they are unreliable without birth time).
  - **DB:** Add `house_system VARCHAR(20) DEFAULT 'placidus'` to `birth_profiles` table. Migration: `ALTER TABLE birth_profiles ADD COLUMN house_system VARCHAR(20) DEFAULT 'placidus'`.
  - **Upgrade prompt:** In `chart-panel.tsx`, if `houseSystem === 'whole-sign'` and `birthTime` is null, show a subtle card: *"🕐 Add your birth time to unlock your exact Rising sign, house rulers, and full Placidus house system. [Add birth time →]"*

---

### ENH-22 — MEDIUM IMPACT: Redesign birth data onboarding as a ceremony — increases completion and sets emotional tone
- **Impact:** MEDIUM — the birth data form is a cold admin barrier. Making it feel like a sacred ritual dramatically increases completion rates and creates an emotional investment in the product from the very first interaction.
- **Where:** The birth data input flow (first time only) — wrap existing form in a stepped ceremony UI
- **What:** Three-step animated flow with a cosmic transition between steps. Ends with a "Your cosmic blueprint has been cast" reveal showing the Big 3.
- **Implementation:**
  - **Component:** Create `<OnboardingCeremony>` component that wraps the existing birth data fields in a stepped UI. Use local state `step: 1 | 2 | 3 | 'reveal'`.
  - **Step 1 — Date:** *"When did you arrive in this world?"* — styled date picker. Continue button with ✦ icon.
  - **Step 2 — Time:** *"At what hour?"* — time input + "I don't know" option (ENH-21). Continue.
  - **Step 3 — Place:** *"Where did it begin?"* — existing Google Places autocomplete. Submit: *"Cast my chart ✦"*.
  - **Loading state:** Full-screen `<CosmicSpinner>` (already built) with slowly fading text: *"Reading the positions of the stars at the moment of your birth..."* (3 seconds, then transition to reveal).
  - **Reveal screen:** Dark full-screen with animated entrance. Title: *"Your cosmic blueprint"*. Three large glyphs animate in one by one: ☉ [Sun sign name], ☽ [Moon sign name], ↑ [Rising sign name or "Add birth time to unlock"]. CTA: *"Begin your Oracle session →"*. This screen only shows once (flag in DB: `onboarding_complete: boolean`).

---

### ENH-23 — MEDIUM IMPACT: Daily session streak + check-in gamification — converts weekly users to daily users
- **Impact:** MEDIUM — streak mechanics are proven habit formation tools. Low engineering cost, meaningful daily active user (DAU) lift.
- **Where:** New `user_streaks` table + sidebar component + auth/chat middleware
- **What:** Track consecutive days with at least one Oracle session. Display in sidebar. Celebrate milestones. Trigger re-engagement email on streak break.
- **Implementation:**
  - **DB:** `CREATE TABLE user_streaks (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, current_streak INT DEFAULT 0, longest_streak INT DEFAULT 0, last_activity_date DATE, streak_started_at TIMESTAMP DEFAULT NOW())`.
  - **Backend:** Add `streakService.updateStreak(userId)` called at the start of any Oracle session (after `queryLimitMiddleware`). Logic: if `last_activity_date = yesterday` → `current_streak += 1`. If `= today` → no change. If older or null → `current_streak = 1`. Update `longest_streak = MAX(longest_streak, current_streak)`. Update `last_activity_date = today`.
  - **API:** `GET /api/v1/user/streak` — returns `{ currentStreak, longestStreak }`. Called on dashboard/chat mount.
  - **Frontend:** Small indicator at the bottom of the sidebar: `✦ 7-day streak`. On milestone (7, 30, 100 days): confetti burst + toast message: *"7 days of cosmic alignment ✦"*. If streak breaks: one-time toast on next login: *"Your streak ended at 7 days — start a new one today."*
  - **Email trigger:** Integrate with existing email system (Resend). If `last_activity_date = two days ago` AND streak ≥ 3, send: *"Your [N]-day streak is about to end ✦ — the Oracle has something new to show you."*

---

### ENH-24 — MEDIUM IMPACT: "Last session topic" Oracle context injection — makes the Oracle feel like it remembers you
- **Impact:** MEDIUM — the Oracle currently starts from zero every session. A single sentence referencing the last conversation makes it feel deeply personalised. Dramatically improves perceived intelligence. Precursor to FUTURE-02 (full memory).
- **Where:** `backend/src/controllers/chatController.ts` — `buildSystemPrompt()` function + new `summary` column on `ChatSession`
- **What:** After each session ends, Haiku summarises the conversation in 1-2 sentences. That summary is injected into the next session's system prompt as a soft memory cue.
- **Implementation:**
  - **DB:** `ALTER TABLE chat_sessions ADD COLUMN summary TEXT`. No migration risk — nullable column.
  - **Summarisation job:** In `chatController.ts`, in the `startNewConversation` handler (or on explicit session close), fire a background summarisation after the previous session's ID is known:
    ```ts
    // fire and forget — don't await
    (async () => {
      const messages = await prisma.chatMessage.findMany({ where: { sessionId: previousSessionId }, orderBy: { createdAt: 'asc' } });
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const { text: summary } = await generateText({ model: haiku, prompt: `Summarise this astrology consultation in 1 sentence focusing on the main theme the user explored:\n\n${text}` });
      await prisma.chatSession.update({ where: { id: previousSessionId }, data: { summary } });
    })();
    ```
  - **Injection in `buildSystemPrompt()`:** Fetch user's last session with a non-null summary: `const lastSession = await prisma.chatSession.findFirst({ where: { userId, summary: { not: null } }, orderBy: { updatedAt: 'desc' } })`. If found, append to system prompt: `\n\nContext from last session: ${lastSession.summary}. You may acknowledge this continuity naturally if it feels relevant, but do not force it.`

---

### ENH-25 — MEDIUM IMPACT: In-app Oracle session rating — product intelligence at zero cost
- **Impact:** MEDIUM — you need to know which Oracle responses land before you can improve them. Cheapest product feedback available. Also surfaces testimonials.
- **Where:** `frontend/src/components/chat/chat-window.tsx` — after Oracle stream completes + new backend route
- **What:** After the Oracle finishes a response, show 5 subtle star icons below the message for 8 seconds. If clicked, log the rating silently and show "✦ Thank you." Ratings surface in the admin panel.
- **Implementation:**
  - **DB:** `CREATE TABLE session_ratings (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE, message_index INT, rating SMALLINT CHECK (rating BETWEEN 1 AND 5), feedback TEXT, created_at TIMESTAMP DEFAULT NOW())`.
  - **Backend:** `POST /api/v1/chat/sessions/:id/rate` (auth required) — body: `{ rating: 1-5, messageIndex: number, feedback?: string }`. Insert into `session_ratings`. No validation needed beyond the CHECK constraint.
  - **Frontend:** In `chat-window.tsx`, after `event: complete` fires on the SSE stream, render `<SessionRating sessionId={activeSession} messageIndex={messageCount} />` below the last assistant message. Use `setTimeout(hideRating, 8000)` to auto-hide. On click: POST rating, replace stars with `"✦ Noted"` in small text.
  - **Admin:** In the admin usage tab, add average rating per day and a table of 1-2 star ratings with their session IDs for manual review.

---

### ENH-26 — MEDIUM IMPACT: Strengthen the PRO → PREMIUM value gap — 2× price needs a visible "wow" differentiator
- **Impact:** MEDIUM — if users cannot immediately articulate why PREMIUM costs twice as much, they won't upgrade. The value gap must be unmistakable.
- **What:** The current PREMIUM exclusives (all tools + partner limit 10) are not a strong enough story. Assign at least one visibly premium experience to PREMIUM only.
- **Recommended PREMIUM exclusives to add:**
  1. **Priority Oracle model** — `MODEL_PREMIUM` env var already exists. Set it to Claude Opus (higher quality, noticeably better responses). PRO uses Sonnet, PREMIUM uses Opus. Users will feel the quality difference immediately. Cost increase: manageable at this scale.
  2. **Solar Return report** (FEAT-09) — "Your annual cosmic blueprint." High perceived value, birthday-triggered.
  3. **Composite chart** (FEAT-11) — relationship entity chart, not just synastry. Unique to PREMIUM.
  4. **Unlimited partner profiles** — PRO gets 3-5 profiles, PREMIUM gets unlimited (currently PREMIUM gets 10 — consider truly unlimited).
- **Pricing page copy rewrite (all three tiers need a clear identity):**
  - FREE: *"Explore your chart"* — 3 Oracle sessions/day, natal chart, daily horoscope preview.
  - PRO: *"Unlock the full Oracle"* — unlimited sessions, full forecasts, partner synastry, all features.
  - PREMIUM: *"Your personal cosmic advisor"* — everything in PRO + Opus-quality Oracle, Solar Return, Composite charts, priority support.

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

## 🚀 New Feature Roadmap (Product Audit 2026-03-18)

> Ordered HIGH → MEDIUM impact. Each feature includes enough implementation detail to build from scratch.

### FEAT-05 — HIGH IMPACT: Email lifecycle sequence (Day 0 → 30) — the biggest LTV lever available right now ✅ CODE COMPLETE (2026-03-19)
- **Impact:** HIGH — Resend and the schema are already integrated. The sequences just don't exist. A proper lifecycle sequence is the single highest-return investment for a SaaS at this stage. Converts registered-but-inactive users into paying customers. Prevents churn before it starts.
- **Where:** New `backend/src/services/email/lifecycle.ts` + cron jobs in `backend/src/routes/cron.ts` + Resend email templates
- **Sequence design:**

| Day | Trigger | Subject | Content |
|-----|---------|---------|---------|
| 0 | Registration | "Your cosmic blueprint is ready ✦" | Welcome + Big 3 reveal + "Ask the Oracle your first question" CTA |
| 1 | If no Oracle session yet | "The Oracle is waiting for you" | One personalised sample question based on their Sun sign. "Try asking: [question]" |
| 3 | Always | "Did you know the Oracle can..." | Feature discovery — 3 things they haven't tried: Forecast, Partners, Chart Explorer |
| 7 | If < 3 sessions total | "Your chart has something new to show you" | Personalised transit happening this week. Re-engagement. |
| 14 | FREE tier only, no upgrade | "You're exploring [Sun sign] energy deeply" | Soft upgrade nudge: *"PRO users unlock unlimited Oracle sessions and the full forecast for [their sun sign]."* |
| 30 | FREE tier, no upgrade | "A month of cosmic exploration" | Summary of what they've discovered. Hard upgrade offer: *"Upgrade before [date] and get your first month at €7.99."* (if discount codes are implemented) |

- **Implementation:**
  - **Service:** `backend/src/services/email/lifecycle.ts` — `sendLifecycleEmail(userId, template, data)` function. Uses existing Resend client. Each template is a React Email component in `backend/src/emails/`.
  - **Cron:** Add to the existing cron system in `routes/cron.ts`: a daily job `emailLifecycleCron` that runs at 09:00 user's local time (approximate with UTC+user_timezone). Queries users by `createdAt` bucket: `WHERE createdAt BETWEEN NOW()-8d AND NOW()-7d` → send Day 7 email. Etc.
  - **Unsubscribe:** Every email must have a one-click unsubscribe link. Backend: `GET /api/v1/email/unsubscribe?token=` → set `NotificationPreference.emailEnabled = false`. Token = `jwt.sign({ userId }, EMAIL_SECRET, { expiresIn: '365d' })`.
  - **Personalisation data per email:** Pass `{ sunSign, moonSign, risingSign, firstName, currentStreak, queriesUsed, tier }` to each template.

---

### FEAT-06 — HIGH IMPACT: Moon phase tracker ✅ CODE COMPLETE (2026-03-20, ace2602)
- **Impact:** HIGH — every serious astrology app shows the current moon phase. Users check it daily. New Moon and Full Moon in a user's natal chart house is deeply personal and drives daily opens. Without it the app feels static.
- **Where:** New `backend/src/services/moon-phase.ts` + Dashboard widget + `/forecast` page section
- **What:** Current moon phase with phase name, percentage illumination, exact sign and degree, and which house it falls in the user's natal chart. Next New Moon and Full Moon countdowns.
- **Implementation:**
  - **Moon phase calculation:** Use the `astronomia` npm package (pure JS, no API call) for accurate moon phase calculation: `npm install astronomia`. Calculate: phase name, illumination %, current sign, exact degree, days to next New/Full Moon.
    ```ts
    import { moonphase, solar } from 'astronomia';
    // getMoonPhase() returns illumination 0-1, age in days (0=New, ~14=Full, ~29=New)
    ```
  - **Current moon sign:** The moon moves ~1° every 2 hours (~13°/day). Calculate the Moon's current ecliptic longitude using `astronomia.moonposition`. Convert to zodiac sign (divide by 30°). This is accurate to within 0.1° with no API call.
  - **User's natal house:** With the moon's current ecliptic longitude and the user's natal house cusps, determine which house the transiting Moon is in. This is a simple comparison — no API needed.
  - **Backend route:** `GET /api/v1/astrology/moon-phase` (auth optional — logged-in users get house placement). Cached in Redis for 1 hour (moon moves slowly). Returns: `{ phase: 'Waxing Gibbous', illumination: 78, sign: 'Scorpio', degree: 15.3, house: 8, nextNewMoon: Date, nextFullMoon: Date, nextNewMoonDays: 12, nextFullMoonDays: 5 }`.
  - **Dashboard widget:** `<MoonPhaseWidget>` — shows the moon glyph at the correct illumination (SVG with dynamic clip-path), phase name, sign, house if logged in. Compact card, fits in the dashboard sidebar or hero.
  - **Full Moon / New Moon special callout:** When within 3 days of New or Full Moon, show an enhanced version: *"🌕 Full Moon in Scorpio — activating your 8th house of transformation. This is a powerful moment for release and deep truth."* This feeds directly into ENH-20 (cosmic event banners).

---

### FEAT-07 — HIGH IMPACT: Annual billing with 25% discount ✅ CODE COMPLETE (2026-03-20, ace2602)
- **Impact:** HIGH — annual billing eliminates 11 monthly churn decision points per customer per year. Industry standard offer: pay for 10 months, get 12. For a €9.99/month product: €95.90/year (vs €119.88 monthly). Significant revenue improvement with minimal engineering.
- **Where:** `backend/src/routes/subscription.ts` + `backend/src/config/subscription-tiers.ts` + `frontend/src/app/[locale]/pricing/page.tsx`
- **Blocked on:** Victor creating yearly Stripe Price IDs (already in Deferred table)
- **Implementation:**
  - **Stripe:** Create `STRIPE_PRO_PRICE_ID_YEARLY` (€95.90/year) and `STRIPE_PREMIUM_PRICE_ID_YEARLY` (€191.88/year) in the Stripe dashboard. Add to Railway env vars.
  - **Backend:** In `SUBSCRIPTION_PLANS` config, add `yearlyPriceId` and `yearlyPrice` fields. In `POST /subscription/create-checkout-session`, accept `billing: 'monthly' | 'yearly'` in the request body and select the appropriate Stripe Price ID.
  - **Pricing page toggle:** Add a `<BillingToggle monthly | annually>` switch above the pricing cards. When "Annually" is selected: show yearly price, crossed-out monthly equivalent, and green badge: *"Save 20% —2 months free"*. CTA changes from "Start PRO" to "Start PRO — Annually". Pass `billing=yearly` to the checkout session.
  - **Display:** Show both `€95.90/year` and `equivalent to €7.99/month` in the pricing card when yearly is selected.
  - **No code changes needed to webhook handling:** Stripe sends the same `invoice.payment_succeeded` webhook — just make sure BUG-41 is fixed first so `currentPeriodEnd` uses Stripe's actual value (365 days for yearly).

---

### ~~FEAT-08~~ — ✅ RESOLVED (2026-03-20, e22daa2) — PostHog mounted in layout, Sentry wired frontend + backend
### ~~FEAT-08 original~~ — HIGH IMPACT: Product analytics + error tracking ⚠️ PARTIAL
- **Impact:** HIGH — you are currently flying blind. You do not know where users drop off in onboarding, which Oracle features drive upgrades, or when your app throws errors in production. Both tools are free at startup scale.
- **Tools:** PostHog (product analytics, free up to 1M events/month) + Sentry (error tracking, free tier)
- **Status:**
  - ✅ Sentry frontend: `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts` — properly wired via Next.js wizard
  - ⚠️ PostHog frontend: `posthog-provider.tsx` + `analytics.ts` written and complete, BUT `<PostHogProvider>` is NOT yet mounted in `app/[locale]/layout.tsx`. Also needs `NEXT_PUBLIC_POSTHOG_KEY` env var set in Vercel.
  - ❌ Sentry backend: not wired. `errorLogger.ts` is a Winston-based logger, not Sentry. Needs `@sentry/node` init in `backend/src/index.ts`.
- **Implementation — Sentry (backend + frontend):**
  - Backend: `npm install @sentry/node`. In `backend/src/index.ts`, call `Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV })` before any route registration. Add `Sentry.Handlers.requestHandler()` as the first middleware and `Sentry.Handlers.errorHandler()` as the last error middleware. This catches all unhandled exceptions and 500 responses automatically.
  - Frontend: `npm install @sentry/nextjs`. Run `npx @sentry/wizard@latest -i nextjs`. Wraps the app automatically. Captures client-side errors including React rendering errors.
  - Railway: Add `SENTRY_DSN` env var (from Sentry project settings).
- **Implementation — PostHog (frontend):**
  - `npm install posthog-js`. In `app/[locale]/layout.tsx`, initialise: `posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, { api_host: 'https://eu.posthog.com' })`.
  - Key events to track immediately: `'signup_completed'`, `'birth_data_submitted'`, `'oracle_session_started'`, `'oracle_query_sent'`, `'upgrade_cta_clicked'`, `'checkout_started'`, `'subscription_activated'`, `'chat_history_cleared'`. Each event takes 1 line: `posthog.capture('event_name', { tier, language, ... })`.
  - PostHog auto-captures page views, session recordings (opt-in), and funnel drop-offs. The conversion funnel `signup → birth_data → oracle_session → upgrade` will immediately show you where to focus.

---

### FEAT-09 — HIGH IMPACT: Solar Return chart + annual report (PREMIUM exclusive) — high perceived value, natural birthday revenue trigger
- **Impact:** HIGH — the Solar Return is the #1 paid add-on in traditional astrology consultations. Every year on the user's birthday, the Sun returns to its exact natal position. The resulting chart describes the themes of the coming year. Perfect PREMIUM exclusive. Also a natural birthday re-engagement trigger (see FUTURE-10).
- **Where:** New `backend/src/controllers/solarReturnController.ts` + new frontend page `/chart/solar-return`
- **Gating:** PREMIUM tier only (or available as a one-time purchase credit — see FEAT-10)
- **Implementation:**
  - **Calculation:** The astrology-api.io should support Solar Return chart calculation — verify available endpoints. If not, use the `astronomia` package: find the exact moment in the current year when the Sun returns to its natal ecliptic longitude (binary search between birthday ±2 days, step by hours until within 0.01°). Use that moment as the birth time for a new chart calculation at the user's current location (or birth location if current is unknown).
  - **Backend:** `GET /api/v1/astrology/solar-return?year=2026` (PREMIUM auth middleware). Returns a full chart object for the Solar Return moment. Cache in Redis: `solar_return:${userId}:${year}` with 365-day TTL.
  - **Oracle report:** After chart generation, send to Claude Opus (PREMIUM model): *"Generate a rich, personalised annual reading for [year] based on this Solar Return chart. Cover: overall theme of the year, key opportunities, challenges, career, love, and personal growth. Tone: wise, warm, specific to the chart. 600-800 words."* Stream to frontend.
  - **Frontend:** New page `/chart/solar-return`. Shows the Solar Return chart wheel (reuse existing `<CircularChartWheel>` component — just pass different chart data). Below: the narrative Oracle report, streamed. Download as PDF button (reuse existing PDF export infrastructure).
  - **Birthday trigger:** On user's birthday ±3 days, send an email: *"Your Solar Return is here — a new cosmic year begins ✦. Your [year] Solar Return chart is ready."* With CTA to the Solar Return page. (PREMIUM) or *"Unlock your Solar Return chart with PREMIUM."* (lower tiers).

---

### FEAT-10 — MEDIUM IMPACT: Credits system + one-time purchases — capture the non-subscriber segment
- **Impact:** MEDIUM — a significant portion of astrology app visitors are curious but not ready to subscribe monthly. A credit system captures this segment without cannibalising subscriptions. Solar Return reports, Year Ahead readings, and Composite charts are natural one-time purchases.
- **Where:** New `user_credits` table + `POST /api/v1/credits/purchase` + Stripe one-time payment (not subscription)
- **What:** Users can buy credit packs and spend credits on premium one-time reports. Subscriptions continue to include all features without spending credits.
- **Implementation:**
  - **DB:** `CREATE TABLE user_credits (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, balance INT DEFAULT 0, updated_at TIMESTAMP DEFAULT NOW())`. `CREATE TABLE credit_transactions (id UUID PRIMARY KEY, user_id UUID, amount INT, reason VARCHAR(100), created_at TIMESTAMP)`.
  - **Credit pricing (suggested):** 5 credits = €4.99, 12 credits = €9.99, 30 credits = €19.99. Solar Return report = 3 credits. Year Ahead reading = 5 credits. Composite chart = 2 credits.
  - **Stripe:** Use Stripe Payment Links or a one-time `payment_intent` (not a subscription). On `payment_intent.succeeded` webhook: look up the credit pack by `metadata.pack_id` and add credits to the user's balance.
  - **Spending credits:** Before generating a one-time report (Solar Return, Year Ahead), check `user.credits >= required`. If yes, deduct and proceed. If no, redirect to credit purchase. Subscribed users (PRO/PREMIUM) bypass the credit check entirely.
  - **Frontend:** "Credits" balance shown in the subscription settings page. Purchase modal with the three pack options. Credit cost shown on each premium report page for FREE/PRO users.

---

### FEAT-11 — MEDIUM IMPACT: Composite chart — completes the relationship analysis feature set (PREMIUM exclusive)
- **Impact:** MEDIUM — completes the partner analysis toolkit. Synastry (already built) compares two charts side-by-side. A Composite chart creates a single chart for the relationship itself — "what kind of relationship is this?" High perceived value for couples and relationship-focused users.
- **Where:** `backend/src/controllers/partnerController.ts` + partner page frontend
- **Gating:** PREMIUM only
- **Implementation:**
  - **Calculation:** A Composite chart is the midpoint chart — for each planet, find the midpoint between Person A's and Person B's positions. Midpoint longitude = `(lonA + lonB) / 2` (handle 360° wrap: if `|lonA - lonB| > 180`, add 360 to the smaller before averaging). Do this for all planets, ASC, MC. Then calculate houses for the composite ASC at a midpoint location.
  - **Backend:** `GET /api/v1/partners/:partnerId/composite-chart` — takes user's primary birth profile + partner's birth profile. Calculates midpoints for all 10 planets + ASC + MC. Returns a chart object in the same format as natal chart. Cache in Redis: `composite:${userId}:${partnerId}` (30-day TTL — static data).
  - **Oracle report:** Call the existing Oracle infrastructure with a composite-chart-specific prompt: *"Interpret this Composite chart, which represents the relationship entity between [User] and [Partner]. Focus on: the relationship's core purpose (Composite Sun), emotional dynamic (Composite Moon), communication style (Composite Mercury), love language (Composite Venus), and long-term potential. 400-600 words."*
  - **Frontend:** In the partner detail page, add a new "Composite Chart" tab alongside the existing synastry view. Shows the `<CircularChartWheel>` for the composite chart + the Oracle interpretation below.

---

### FEAT-12 — MEDIUM IMPACT: "Best Days" personal calendar — practical utility that drives daily return visits
- **Impact:** MEDIUM — turns the app from a self-exploration tool into a practical decision-making tool. Users will consult it before signing contracts, scheduling important meetings, or starting new projects. High stickiness, high perceived value.
- **Where:** New `/calendar` page + new `backend/src/services/best-days.ts`
- **What:** A monthly calendar view showing the user's personally favourable and challenging days, categorised by life area: Career, Love, Creativity, Rest, New Beginnings.
- **Implementation:**
  - **Algorithm:** For each day of the current month, check the transiting planets' aspects to the user's natal planets using the astrology API. Score each day by aspect quality: trine/sextile = positive, square/opposition = challenging, conjunction = potent (depends on planets). Sum scores by life area (e.g., Venus transits affect Love, Jupiter/Saturn affect Career, Moon affects emotional/rest days).
  - **Backend:** `GET /api/v1/calendar/best-days?month=2026-04` — generates scores for all 30 days. Expensive to compute; cache aggressively in Redis: `best_days:${userId}:${year}-${month}` with 30-day TTL. Pre-generate for next month as part of the nightly cron.
  - **Response format:** Array of 30 objects: `{ date, scores: { career: 1-5, love: 1-5, creativity: 1-5, rest: 1-5, newBeginnings: 1-5 }, highlights: string[] }`. `highlights` = array of notable transits for the day.
  - **Frontend:** `/calendar` page — monthly grid. Each day cell shows coloured dots per category. Clicking a day opens a side panel: the full day breakdown and a pre-seeded Oracle CTA: *"Ask about [date] →"*.
  - **Gating:** FREE gets current week only. PRO/PREMIUM get full month + next month.

---

### FEAT-13 — MEDIUM IMPACT: Daily ritual morning briefing — converts weekly users to daily openers
- **Impact:** MEDIUM — a consistent daily touch point. Builds habit faster than any other mechanic. The astrology equivalent of a daily weather check.
- **Where:** New email template + opt-in in notification preferences + `backend/src/services/email/daily-briefing.ts`
- **What:** A short daily email or in-app notification delivered at the user's chosen time (or 08:00 default). Three elements: today's moon phase, one active personal transit, one Oracle reflection prompt.
- **Implementation:**
  - **Opt-in:** In `/settings/notifications`, add: "Daily cosmic briefing" with a time-of-day picker. Defaults to 08:00, opt-in not opt-out (avoid spam perception).
  - **Content generation:** Nightly cron at 23:00 UTC generates the next day's briefings for all opted-in users. For each user:
    1. Moon phase for their local tomorrow (from FEAT-06 service — no API cost).
    2. Most significant personal transit tomorrow (from FUTURE-01 data if available, or calculate on-the-fly from astrology API transit endpoint).
    3. Oracle reflection prompt — generated by Haiku from the transit data. Cached per transit type (not per user — e.g., all users with a Venus transit get variations of the same prompt). 1 Haiku call per transit type per day ≈ ~20 calls/day total.
  - **Email template:** Minimal, beautiful. Dark background. Moon phase glyph at top. Two short lines of transit text. One italicised Oracle prompt question. Single CTA: *"Open the Oracle →"* linking directly to a pre-seeded chat session.
  - **In-app alternative:** For users who don't want email, show the briefing as a dismissable card at the top of the dashboard (fetched from `GET /api/v1/user/daily-briefing`, cached in Redis per user per day).

---

### FEAT-14 — MEDIUM IMPACT: Gift subscriptions — astrology is a major gift category
- **Impact:** MEDIUM — Valentine's Day, birthdays, and "thinking of you" are natural gifting moments for astrology. Gift subscriptions attract a new buyer segment (gifters who aren't users themselves). Referral infrastructure already exists in the codebase.
- **Where:** New `/gift` page + new `backend/src/routes/gift.ts` + Stripe Payment Links or one-time payment
- **What:** A gifter buys a 1-month or 3-month PRO or PREMIUM subscription for someone else. Generates a redemption code. Gifter receives a branded gift card email to forward. Recipient enters the code on `/redeem`.
- **Implementation:**
  - **DB:** `CREATE TABLE gift_codes (id UUID PRIMARY KEY, code VARCHAR(16) UNIQUE, tier VARCHAR(10), duration_months INT, purchased_by_user_id UUID, redeemed_by_user_id UUID, purchased_at TIMESTAMP, redeemed_at TIMESTAMP, stripe_payment_intent_id VARCHAR(100))`.
  - **Backend:** `POST /api/v1/gifts/purchase` — Stripe one-time payment intent for the gift amount. On `payment_intent.succeeded`: generate a unique `code` (nanoid 16 chars, uppercase), insert into `gift_codes`. Send a beautifully designed email to the purchaser: "You've given the gift of the Oracle ✦. Your gift code: [CODE]. Forward this email to your recipient."
  - **Redemption:** `POST /api/v1/gifts/redeem` — body: `{ code }` (auth required — recipient must be logged in). Validates code is unused. Creates a Stripe subscription for the recipient using the tier and duration. Sets `gift_codes.redeemed_by_user_id` and `redeemed_at`.
  - **Frontend:** `/gift` page — simple form: choose tier (PRO/PREMIUM), choose duration (1 month / 3 months), enter recipient's name + your email. Checkout button → Stripe. `/redeem` page — text input for code + "Activate your gift ✦" button.
  - **Pricing:** 1 month PRO = €9.99, 3 months PRO = €24.99 (€8.33/mo). 1 month PREMIUM = €19.99, 3 months PREMIUM = €49.99.

---

## 🔵 Architecture

### ~~ARCH-03~~ — ✅ PARTIALLY RESOLVED (2026-03-18, fc81ba7) — localStorage audit
- **Done:** `astrologaai_user` blob removed (highest priority item). Auth context now server-authoritative.
- **Still pending (low priority):** `astrologaai_pinned_chats` → DB migration (add `is_pinned` to `ChatSession`); locale reads in `forecast-panel.tsx` and `forecast/weekly/page.tsx` → use `user.language` from auth context instead.

#### ✅ KEEP (legitimate use)
- `astrologaai_access_token` — JWT token. Standard.
- `astrologaai_refresh_token` — **⚠️ INCORRECT assessment — see BUG-36.** This was marked as "KEEP" but the audit found the refresh token is also stored here from the JSON response body, completely defeating the httpOnly cookie. Must be moved to 🔴 REMOVE and fixed via BUG-36.
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
| Sidebar menu labels i18n (L-3) | DECISION-01 (English first) | `frontend/src/components/shell/sidebar.tsx` lines ~14-19 — `MENU_ITEMS` labels (Profile, My Birth Data, etc.) are hardcoded in English. Add to i18n namespace when BG translation pass begins. |
| Pricing page i18n (L-6) | DECISION-01 (English first) | `frontend/src/app/[locale]/pricing/page.tsx` — entire page (PLANS array, FAQ, all copy) is hardcoded in English inside the `[locale]` route group. Needs full `next-intl` wiring when BG translation pass begins. |

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

### FUTURE-07 — HIGH IMPACT: Personal transit feed — "What's happening in your chart right now" as the new homepage core
- **Impact:** HIGH — this is the single most important strategic product shift. The app currently relies entirely on users choosing to open it and typing a question. The transit feed flips this: the app comes to the user with insight. This is what transforms a chat tool into a daily ritual. Builds on FUTURE-01.
- **Relationship:** This is the front-end product layer on top of FUTURE-01 (Real-time Transit Prediction Engine). FUTURE-01 must be built first (or in parallel).
- **What:** Replace the current dashboard hero with a personalised "Your cosmic weather today" feed. A ranked list of 3-5 active transits, ordered by significance, each with a one-sentence plain-language interpretation and a "Go deeper →" button that opens an Oracle chat pre-seeded with that transit.
- **Implementation:**
  - **Transit ranking:** Score each active transit by: planet weight (outer planets = higher, Moon = daily/lower), aspect type (conjunction > opposition > square > trine > sextile), natal planet sensitivity (Sun/Moon/Rising ruler = higher weight). Return top 5.
  - **Plain-language interpretation:** Pre-generate interpretations by transit type (e.g., `Saturn_square_natal_Moon`) using Claude Haiku, cache in Redis indefinitely (same interpretation for all users with that transit). Personalise with the user's name and house placement at render time.
  - **UI:** Each transit card: planet glyph + aspect symbol + natal planet glyph, one-line interpretation, severity indicator (intense / supportive / neutral), active duration ("active for 3 more days"). Tapping the card opens a new Oracle session with a pre-seeded question: *"Tell me about [transit] and how it's specifically affecting my chart."*
  - **Dashboard redesign:** The current static hero gets replaced with this feed. The Big 3 cards move to a secondary section. The transit feed becomes the reason to open the app every day.

---

### FUTURE-08 — HIGH IMPACT: Major life transit waiting room (Saturn return, Chiron return, Jupiter return) — the highest perceived value moments in astrology
- **Impact:** HIGH — Saturn return (~age 29, 58), Chiron return (~age 50), and Jupiter return (~age 12, 24, 36...) are the most significant and emotionally resonant transits in a lifetime. Users entering these windows are in an identity crisis, deeply open to guidance, and willing to pay premium prices for deep insight. This is where the Oracle can provide its highest value.
- **What:** Detect when a user is entering or actively experiencing a major life transit window (within 6 months of peak). Send proactive outreach. Create a dedicated "Saturn Return" or "Chiron Return" Oracle experience with a special system prompt and multi-session arc.
- **Implementation:**
  - **Detection:** At user registration and on each birthday, calculate: `(currentYear - birthYear)` and check against major transit ages. More precisely, calculate when Saturn's current position conjuncts the user's natal Saturn (within 3° orb) — this requires FUTURE-01 infrastructure.
  - **DB flag:** Add `active_major_transit VARCHAR(50)` to users table. Updated by nightly cron: `'saturn_return' | 'chiron_return' | 'jupiter_return' | null`.
  - **Proactive email:** 3 months before the transit peaks: *"Something significant is approaching in your chart ✦. Your Saturn Return begins in 90 days. This is one of the most important astrological periods of your life. The Oracle is ready to guide you through it."* With CTA to a dedicated session.
  - **Special Oracle mode:** When `active_major_transit` is set, the Oracle system prompt gains an additional context block: *"This user is currently experiencing their [Saturn Return / Chiron Return / Jupiter Return]. This is a major life transit. Treat it with the seriousness it deserves. Ask about their current life circumstances before diving into interpretation. This should feel like a multi-session journey, not a one-time reading."*
  - **Dedicated entry point:** A "Your [Saturn Return]" card on the dashboard (visible only to users in the transit window) with a purple/gold special design. Tapping it opens a dedicated Oracle session with the transit context pre-loaded.

---

### FUTURE-09 — MEDIUM IMPACT: Secondary progressions (Progressed Moon) — differentiates from surface-level astrology apps
- **Impact:** MEDIUM — Secondary progressions (especially the Progressed Moon) are used by serious astrologers and enthusiasts who have outgrown daily horoscopes. The Progressed Moon changes sign every ~2.5 years and is considered one of the most accurate indicators of a person's current emotional chapter. Offering this separates the app from Co-Star and positions it for the enthusiast segment.
- **What:** The Progressed Moon's current sign and house, and when it next changes sign. Optional: full progressed chart.
- **Implementation:**
  - **Calculation method (Secondary Progressions):** One day after birth = one year of life. To find the Progressed Moon for a 30-year-old born on 1990-01-01: calculate the Moon's position for 1990-01-31 (30 days = 30 years). This is called the "day-for-a-year" method.
  - **Calculate:** `progressedDate = birthDate + ageInDays`. Then calculate the Moon's ecliptic longitude at that date using `astronomia.moonposition`. Convert longitude to zodiac sign and natal house. This is a pure calculation — no API call needed.
  - **Next sign change:** Binary search forward from `progressedDate` until the Moon crosses the next 30° boundary. Typically 2-3 years from now. Return as `{ progressedMoonSign, progressedMoonHouse, daysUntilSignChange, nextSign }`.
  - **Backend route:** `GET /api/v1/astrology/progressions` — returns current progressed moon sign/house and sign change timeline. Cache: 30-day TTL (progressed Moon moves ~1° per year, negligible daily change).
  - **Frontend:** A "Progressed Chart" section in the chart panel. Expandable. Shows: "Your Progressed Moon is in [Sign] in the [Xth] house — you are currently in a chapter of [theme]. This chapter ends in approximately [X months]." With an Oracle CTA: *"Tell me about my Progressed Moon in [Sign]."*
  - **Gating:** PRO/PREMIUM only.

---

### FUTURE-10 — MEDIUM IMPACT: Annual cosmic review (1-year app anniversary) — powerful retention and upgrade trigger
- **Impact:** MEDIUM — the one-year anniversary is the highest-stakes retention moment. A user who receives a meaningful personalised year-in-review feels seen and understood by the product. It also triggers upgrade consideration at the natural subscription renewal point.
- **What:** On the user's 1-year anniversary with the app, generate a retrospective: "This year, [planet] was transiting your [house]. Here's what was happening in the sky during your major life moments." Also: usage highlights (X Oracle sessions, Y questions asked), and a forward-looking "The year ahead" teaser.
- **Implementation:**
  - **Trigger:** Nightly cron checks `users.createdAt` — if `createdAt` was exactly 1 year ago (±1 day): queue the anniversary job for that user.
  - **Content (generated by Opus):** Pull the major transits from the past 12 months (from FUTURE-01 data). Pull the user's session count, most common Oracle topics (from `session_summaries` — ENH-24). Generate: *"This past year, you explored [X] questions with the Oracle. The dominant themes were [topics from summaries]. Cosmically, Saturn transited your 10th house — a year of building and discipline. Jupiter crossed your 7th — relationships expanded. Here's what the stars have in store for your next year..."*
  - **Delivery:** In-app notification + email. Subject: *"One year of cosmic exploration ✦ — your review is ready."*
  - **Upgrade hook:** If the user is FREE or PRO, the "Year Ahead" section is blurred with a *"Unlock your full annual forecast with PREMIUM"* CTA.

---

### FUTURE-11 — MEDIUM IMPACT: Lunar return chart — monthly re-engagement trigger
- **Impact:** MEDIUM — the Lunar Return is a monthly chart generated when the Moon returns to its exact natal position (approximately every 29.5 days). It describes the themes of the coming month. Less well-known than the Solar Return but highly valued by serious practitioners. Creates a natural monthly re-engagement moment.
- **What:** Monthly chart generated on the user's Lunar Return date. Brief Oracle interpretation. Notification when it's ready.
- **Implementation:**
  - **Calculation:** Find the exact moment when the Moon's ecliptic longitude equals the user's natal Moon longitude, within the current 29.5-day cycle. Binary search from today ± 14 days using `astronomia.moonposition`. Use that moment as the chart birth time at the user's birth location.
  - **Chart generation:** Pass the Lunar Return moment to the astrology API for a full chart. Cache: `lunar_return:${userId}:${yearMonth}` — 30-day TTL.
  - **Nightly cron:** Check which users have a Lunar Return today (natal Moon longitude within 0.5° of current Moon longitude). For those users: generate the chart, store it, send a notification: *"Your monthly Lunar Return is today — a new chapter begins ✦."*
  - **Frontend:** A "Monthly Chart" card in the chart section. Shows the Lunar Return chart wheel + a brief Oracle interpretation (200 words, generated by Haiku). Available to PRO/PREMIUM.

---

### FUTURE-12 — MEDIUM IMPACT: Chiron placement deep-dive — highest emotional resonance topic in astrology
- **Impact:** MEDIUM — Chiron (the "wounded healer" asteroid) represents where you were wounded and where your greatest gift lies. It is the most emotionally resonant topic in modern astrology. Every serious astrology enthusiast wants to understand their Chiron. This is an ideal gateway feature that drives deep engagement and emotional investment in the app.
- **What:** A dedicated Chiron page (or chart section) that gives a rich, personalised interpretation of the user's Chiron placement by sign and house, with an Oracle conversation arc specifically designed around wound + gift.
- **Implementation:**
  - **Data:** Chiron's position is typically already returned by the astrology API as part of the natal chart (`rawChart.chiron`). Verify it's included in the current API response. If not, add it to the chart calculation request parameters.
  - **Backend:** `GET /api/v1/astrology/chiron-reading` — reads user's Chiron sign and house from their stored birth chart. Generates a Chiron-specific Oracle prompt and returns a cached interpretation (Haiku-generated, cached per Chiron sign+house combination — only 144 combinations total, so pre-generate all of them once and cache indefinitely).
  - **Oracle prompt for Chiron:** *"Generate a deep, compassionate, specific interpretation of Chiron in [Sign] in the [House] house. Structure: (1) The wound — what early experience or core wound this placement suggests, (2) The gift — how this wound, once worked with, becomes the person's greatest strength and offering to others, (3) The path — practical and spiritual guidance for integrating this energy. Tone: warm, direct, healing. 300-400 words."*
  - **Frontend:** "Your Chiron Wound & Gift" card in `chart-panel.tsx`. Expandable. Shows the Chiron glyph (⚷), sign, and house. The interpretation below. At the bottom: *"Explore your Chiron story with the Oracle →"* which opens a chat pre-seeded with: *"I want to understand my Chiron in [Sign] in the [House] house — what is my wound, and what is my gift?"*
  - **Gating:** Available to all tiers (this should be a free engagement feature — it drives emotional investment and upgrades).

---

### FUTURE-13 — LOW IMPACT: Planetary hours — feature for traditional astrology practitioners
- **Impact:** LOW — a niche feature beloved by traditional astrology practitioners. Planetary hours divide the day and night into 12 segments each ruled by a planet. Used for timing activities (e.g., "Start negotiations in Jupiter's hour"). Appeals to the advanced user segment.
- **What:** A daily view showing the planetary hours for today, with the current hour highlighted. Brief note on what each planetary hour is good for.
- **Implementation:**
  - **Calculation:** Traditional formula. Hour 1 after sunrise is ruled by the day's ruling planet (Sunday = Sun, Monday = Moon, etc.). Subsequent hours follow the Chaldean order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → Saturn... Calculate sunrise and sunset for the user's location using `astronomia.sunrise`. Divide day (sunrise→sunset) into 12 equal parts, night into 12 equal parts.
  - **Backend:** `GET /api/v1/astrology/planetary-hours?date=2026-04-01&lat=42.69&lng=23.32` — returns array of 24 hour objects: `{ startTime, endTime, planet, planetGlyph, isCurrentHour, goodFor }`. Cache per location per day (24-hour TTL). `goodFor` is a hardcoded string per planet (e.g., Jupiter hour: "expansion, finance, legal matters, optimism").
  - **Frontend:** A collapsible "Planetary Hours" card, accessible from the forecast or dashboard. Timeline view showing current hour highlighted. Minimal UI — this is a utility feature.
  - **Gating:** PRO/PREMIUM.

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
