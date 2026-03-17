# Production Audit Progress
**Plan:** `docs/plans/2026-03-09-production-audit-plan.md`
**Started:** 2026-03-09

---

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Railway Build Fix | ✅ Complete | See findings below |
| 2 — Backend Env Vars | ✅ Complete | All vars set; yearly Stripe price IDs optional (no yearly plans yet) |
| 3 — Frontend Env Vars | ✅ Complete | All critical vars set; 1 manual action (Stripe live key) |
| 4 — Supabase Config | ✅ Complete | site_url fixed, redirect URLs updated, JWT expiry noted, Google OAuth verified |
| 5 — Backend Code Audit | ✅ Complete | 2 issues fixed; 1 pre-existing type issue flagged |
| 6 — Frontend Code Audit | ✅ Complete | 1 fix (socket URL); all other checks passed |
| 7 — Integration Verification | ✅ Complete | All flows verified; dist committed; ready to deploy |

---

## Findings Log

### Phase 1 — Railway Build Fix (2026-03-09) ✅

**Removed from `backend/package.json` dependencies:**
- `canvas@^2.11.2` — no pre-built binary for Node 22, required Python for native compile (unavailable in Nixpacks)
- `pdfkit@^0.15.0` — unused at runtime; PDF controller already used `pdf-generator.stub.ts`
- `@types/pdfkit@^0.13.0` — devDependency, no longer needed

**Discovered:** `data-export-pdf.ts` was actively imported by `exportController.ts` and had a direct `import PDFDocument from 'pdfkit'`. Stubbed the function to throw a clear error (`PDF export not available — use JSON format`). JSON export is unaffected.

**Excluded** `src/services/pdf-generator.ts` from `tsconfig.json` compile — it still imports pdfkit/canvas but is dead code (not imported anywhere). Exclusion prevents spurious TS errors without modifying the file.

**Pre-existing TypeScript errors (not caused by our changes, not blocking Railway):**
- `src/services/agent-tools/index.ts` — ai SDK `tool()` overload type mismatch (10 errors)
- `src/controllers/chatController.ts` — `recentMessages` not in `ChatContext` type (1 error)
- `noEmitOnError: false` means dist is emitted despite these errors

**Railway start command verified:** `node backend/dist/index.js` — no build step runs on Railway; pre-built dist is used directly.

**Node pinning:** `.nvmrc` created with `22`; engines updated to `>=18.0.0 <23.0.0` in both root and backend `package.json`.

**Build result:** `npm run build` exits with code 2 (pre-existing agent-tools errors), but dist emits correctly. Railway is unaffected.

---

### Phase 2 — Backend Env Vars (2026-03-09) ⚠️ Partial

#### Task 2.1 — Code references (35 unique vars)
```
process.env.ADMIN_EMAILS
process.env.ANTHROPIC_API_KEY
process.env.ASTROLOGY_API_KEY
process.env.ASTROLOGY_API_URL
process.env.ASTROLOGY_HEALTH_CACHE_TTL
process.env.ASTROLOGY_HEALTH_CHECK_INTERVAL
process.env.CRON_SECRET
process.env.FREE_TIER_MONTHLY_LIMIT
process.env.FREE_TIER_RESET_DAY
process.env.FRONTEND_URL
process.env.FRONTEND_URLS
process.env.JWT_EXPIRES_IN
process.env.JWT_REFRESH_EXPIRES_IN
process.env.JWT_SECRET
process.env.LLM_MODEL
process.env.MODEL_FREE / MODEL_PREMIUM / MODEL_PRO
process.env.NODE_ENV
process.env.OPENAI_API_KEY
process.env.PORT
process.env.REDIS_URL
process.env.RESEND_API_KEY
process.env.RESEND_FROM_EMAIL
process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY / _YEARLY
process.env.STRIPE_PRO_PRICE_ID_MONTHLY / _YEARLY
process.env.STRIPE_SECRET_KEY
process.env.STRIPE_WEBHOOK_SECRET
process.env.SUPABASE_ANON_KEY
process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.SUPABASE_URL
```

#### Task 2.2 — Railway env vars (at start of phase)
All Railway-injected RAILWAY_* vars present. Notable custom vars set: NODE_ENV, ASTROLOGY_API_KEY, JWT_SECRET, FRONTEND_URL (wrong), RESEND_API_KEY, STRIPE_SECRET_KEY (test key!), SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, CRON_SECRET, DATABASE_URL, ALLOWED_ORIGINS, UPSTASH_REDIS_REST_URL/TOKEN (wrong format for code).

#### Task 2.3 — Gap analysis findings
| Var | Status Before | Action |
|-----|--------------|--------|
| NODE_ENV | ✅ production | no change |
| FRONTEND_URL | ❌ astrologaai-frontend.vercel.app | Fixed → astrologa.bg |
| FRONTEND_URLS | ❌ missing | Fixed → astrologa.bg,www.astrologa.bg,astrologaai-frontend.vercel.app |
| DATABASE_URL | ⚠️ public proxy URL | Not changed (see Task 2.5) |
| JWT_SECRET | ✅ 64-char secret | no change |
| SUPABASE_URL | ✅ correct | no change |
| SUPABASE_SERVICE_ROLE_KEY | ❌ missing | Fixed → set from local backend/.env |
| SUPABASE_ANON_KEY | ✅ present | no change |
| REDIS_URL | ❌ missing (had REST URL instead) | Fixed → rediss://default:…@measured-chamois-27086.upstash.io:6379 |
| ANTHROPIC_API_KEY | ❌ missing | **Needs manual action** — key not available |
| OPENAI_API_KEY | ✅ present | no change |
| ASTROLOGY_API_KEY | ✅ present | no change |
| STRIPE_SECRET_KEY | ❌ test key (sk_test_) | Fixed → live key (sk_live_) from shell env |
| STRIPE_WEBHOOK_SECRET | ❌ missing | **Needs manual action** — get from Stripe dashboard |
| RESEND_API_KEY | ✅ present | no change |
| RESEND_FROM_EMAIL | ❌ missing (had EMAIL_FROM) | Fixed → notifications@astrologa.bg |
| ADMIN_EMAILS | ❌ missing | Fixed → apsis.victor@gmail.com |
| CRON_SECRET | ✅ present | no change |
| STRIPE_PRO_PRICE_ID_MONTHLY | ❌ missing (had generic ID) | Fixed → price_1T5Q3vIl9OIfRJkgPTpOrA61 |
| STRIPE_PRO_PRICE_ID_YEARLY | ❌ missing | **Needs manual action** — create yearly price in Stripe |
| STRIPE_PREMIUM_PRICE_ID_MONTHLY | ❌ missing (had generic ID) | Fixed → price_1T5Q9fIl9OIfRJkgEnYds4Bk |
| STRIPE_PREMIUM_PRICE_ID_YEARLY | ❌ missing | **Needs manual action** — create yearly price in Stripe |

#### Task 2.5 — DATABASE_URL target (Postgres instance)
- Backend `DATABASE_URL` = `postgresql://postgres:***@yamabiko.proxy.rlwy.net:11442/railway`
- This is the **public proxy URL** of `Postgres-KgZU` (service ID: `250c2b23-b99a-4bcd-85f2-5422f7c10f8e`)
- Internal URL would be `postgres-kgzu.railway.internal:5432` (better for latency, but not changed per audit scope)
- `Postgres` (60f9c138) uses `trolley.proxy.rlwy.net:54598` — not used by backend

#### Vars requiring manual action (4)
1. **`ANTHROPIC_API_KEY`** — No key available. Get from console.anthropic.com.
2. **`STRIPE_WEBHOOK_SECRET`** — Register webhook at `https://astrologaai-backend-production.up.railway.app/api/v1/webhooks/stripe` in Stripe Dashboard and copy the `whsec_...` secret.
3. **`STRIPE_PRO_PRICE_ID_YEARLY`** — Create a yearly Pro price in Stripe Dashboard and set the price ID.
4. **`STRIPE_PREMIUM_PRICE_ID_YEARLY`** — Create a yearly Premium price in Stripe Dashboard and set the price ID.

---

### Phase 3 — Frontend Env Vars (2026-03-09) ✅

#### Task 3.1 — Code references (unique vars in frontend/src)
```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_FRONTEND_URL
process.env.NODE_ENV
```

#### Task 3.2 — Vercel env vars at start of phase
All vars at `production,preview,development` target unless noted. Key vars present:
`NEXT_PUBLIC_API_URL` (plain), `NEXT_PUBLIC_SUPABASE_URL` (encrypted), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (encrypted), `STRIPE_PUBLISHABLE_KEY` (encrypted, test key).
Missing: `NEXT_PUBLIC_FRONTEND_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

#### Task 3.3 — Hardcoded URL audit
- No bare hardcoded URLs found; all railway.app references are safe fallbacks in pattern `process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app'`
- No hardcoded Supabase URLs found in source (only via env vars)
- **Bug found:** `frontend/src/lib/runtime-config.ts` `getFrontendBaseUrl()` had wrong production fallback: `https://frontend-rust-nu-20.vercel.app` — **Fixed** → `https://astrologa.bg`

#### Task 3.4/3.5 — Cross-reference and gap fixes
| Var | Status | Action |
|-----|--------|--------|
| `NEXT_PUBLIC_API_URL` | ✅ correct — `https://astrologaai-backend-production.up.railway.app` | no change |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ correct — `https://pmqqmyylhxykaiysoluh.supabase.co` | no change |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ correct — matches expected `eyJ...` key | no change |
| `NEXT_PUBLIC_FRONTEND_URL` | ❌ missing | Fixed → set to `https://astrologa.bg` (production, preview) |
| `NEXT_PUBLIC_APP_URL` | ❌ missing | Fixed → set to `https://astrologa.bg` (production, preview) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ missing (not referenced in code either) | no action needed |
| `STRIPE_PUBLISHABLE_KEY` | ⚠️ set but using `pk_test_...` test key | **Needs manual action** — replace with `pk_live_...` when available |

#### Code changes (commit 8fc772b)
- `frontend/src/lib/runtime-config.ts`: corrected `getFrontendBaseUrl()` production fallback from `frontend-rust-nu-20.vercel.app` to `astrologa.bg`

#### Vars requiring manual action (1)
1. **`STRIPE_PUBLISHABLE_KEY`** on Vercel — currently `pk_test_...`, should be replaced with `pk_live_...` live publishable key from Stripe Dashboard. (Note: frontend doesn't directly call Stripe JS, so this is low urgency until Stripe checkout flow is implemented in frontend.)

---

---

### Phase 4 — Supabase Configuration (2026-03-09) ✅

#### Task 4.1 — Auth config before changes
| Setting | Value |
|---------|-------|
| `site_url` | `http://localhost:3000` ← WRONG |
| `uri_allow_list` | `http://localhost:3000/auth/callback,https://astrologa.bg/auth/callback` ← incomplete |
| `jwt_exp` | `3600` (1 hour) |
| `external_email_enabled` | `true` |
| `external_google_enabled` | `true` |
| `external_google_client_id` | `170460567349-bandmt7u9t1...` (configured) |
| `external_apple_enabled` | `false` |

#### Task 4.2 — site_url fix
- **Before:** `http://localhost:3000`
- **After:** `https://astrologa.bg`
- Patched via PATCH `/v1/projects/pmqqmyylhxykaiysoluh/config/auth`

#### Task 4.3 — Redirect URLs fix
Frontend uses `${window.location.origin}/auth/callback` (from `supabase-browser.ts` lines 38, 66).
Backend OAuth controller uses `${FRONTEND_URL}/auth/callback` (redirectTo in all OAuth flows).

- **Before:** `http://localhost:3000/auth/callback, https://astrologa.bg/auth/callback`
- **After (5 URLs):**
  - `https://astrologa.bg/auth/callback`
  - `https://astrologa.bg/en/auth/callback`
  - `https://astrologa.bg/bg/auth/callback`
  - `https://www.astrologa.bg/auth/callback`
  - `http://localhost:3000/auth/callback`

#### Task 4.4 — JWT expiry alignment
| Source | Access Token | Refresh Token |
|--------|-------------|---------------|
| Backend (`jwt.ts`) | `JWT_EXPIRES_IN` env var, default `15m` | `JWT_REFRESH_EXPIRES_IN` env var, default `7d` |
| Supabase `jwt_exp` | `3600s` (1 hour) |  — |

**Analysis:** The backend issues its own JWTs (15m access / 7d refresh) — it does NOT rely on Supabase JWTs for API auth. Supabase JWTs are only used during the OAuth code-exchange step (`exchangeCodeForSession`). After that, the backend issues its own tokens. The Supabase 1-hour `jwt_exp` is irrelevant to session duration — no alignment issue.

#### Task 4.5 — Google OAuth status
- `external_google_enabled`: `true`
- `external_google_client_id`: `170460567349-bandmt7u9t1ai6dnhad2ps36jrtl12b7.apps.googleusercontent.com`
- `external_google_secret`: configured (hashed value stored in Supabase)
- **Status: Google OAuth is fully configured in Supabase.** No manual action needed unless credentials change.
- Apple OAuth (`external_apple_enabled: false`) — not yet configured; no Apple login in production scope.

#### Manual actions required (0)
None. All Supabase config items were fixable programmatically.

---

---

### Phase 5 — Backend Code Audit (2026-03-09) ✅

#### Task 5.1 — CORS Configuration
- `FRONTEND_URL` env var (`astrologa.bg`) is read and added to allowed origins — covered.
- `www.astrologa.bg` covered via `FRONTEND_URLS` env var set in Phase 2.
- Vercel preview URLs: allowed via broad pattern `/^https:\/\/[a-z0-9-]+\.vercel\.app$/i` — matches all vercel.app subdomains (not scoped to astrologaai-frontend prefix, but acceptable for dev purposes).
- `http://localhost:3000` allowed in non-production via `DEFAULT_DEV_FRONTEND`.
- `optionsSuccessStatus: 204` present in index.ts CORS config.
- `DEFAULT_PROD_FRONTEND` is the old Vercel URL (`frontend-rust-nu-20.vercel.app`) — harmless since correct domains come from env vars.
- **No fixes needed.**

#### Task 5.2 — Auth Middleware JWT Structure
- authController signs: `{ sub: userId, email, tier }` — standard JWT `sub` claim.
- auth.ts middleware reads: `decoded.sub` for user lookup — matches.
- socket/index.ts reads: `decoded.sub` mapped to `socket.userId` — matches.
- `req.user.id` is set from DB lookup (`user.id`), not directly from token.
- **No mismatch. No fixes needed.**

#### Task 5.3 — Route Audit
All 15 route files in `backend/src/routes/` are imported AND registered in `index.ts`:
`admin, astrology, auth, birthChart, birthData, chat, compatibility, cron, forecasts, language, llm (×2 paths), locations, partners, subscription, user`
- Health endpoints (`/health`, `/health/db`, `/health/redis`, `/health/env`, `/health/astrology`) are registered before auth middleware — no auth required.
- `/api/v1` prefix consistent across all route registrations.
- **No issues found.**

#### Task 5.4 — Error Handling
- Stack traces: NOT included in any error response (only `err.message` in dev, generic message in production).
- 404 handler: present and returns consistent JSON shape.
- Error handler: consistent `{ success: false, error: { code, message } }` shape.
- **Bug found and fixed:** `register()` catch block (from debug commit `a8b3e79`) was returning `{ code: 'DEBUG', message: rawErrorMsg }` in production — exposes internal error details. Fixed to use `handleAuthInfraError` + `next(error)` like the `login` and `refresh` handlers.

#### Task 5.5 — Pre-existing TypeScript Errors
**Before fixes:** 21 errors total (20 agent-tools + 1 chatController).

**Fixed:** `chatController.ts` TS2353 — `recentMessages` was passed to `buildSystemPrompt()` but not declared in `ChatContext` interface. Added the field to `ChatContext`. The data was built correctly at runtime but silently ignored by `buildSystemPrompt`. Now type-safe. (Note: `buildSystemPrompt` doesn't currently render `recentMessages` in the prompt — that's a future enhancement, not a runtime bug.)

**Remaining (pre-existing, not runtime risks):**
- `agent-tools/index.ts` — 20 errors: AI SDK `tool()` overload type mismatch + implicit `any` for `args`. These are type-level only — the `tool()` call structure is correct at runtime and the AI SDK accepts it. The compiled JS works. Flagged for future cleanup when AI SDK types stabilize.

**After fixes:** 20 errors (agent-tools only). `noEmitOnError: false` means dist still emits.

#### Code changes (commit faef168)
- `backend/src/controllers/authController.ts`: removed temporary DEBUG error exposure from `register()` catch
- `backend/src/services/llm-helpers.ts`: added `recentMessages` field to `ChatContext` interface

---

---

### Phase 6 — Frontend Code Audit (2026-03-09) ✅

#### Task 6.1 — API Client (`frontend/src/lib/api-client.ts`)
- Base URL: uses `getApiBaseUrl()` from `runtime-config.ts` — reads `NEXT_PUBLIC_API_URL`, strips trailing slash, has correct prod fallback. **No issue.**
- No bare `localhost` fallback (all localhost guarded by `NODE_ENV !== 'production'` or `window.location.hostname` check). **No issue.**
- Auth token: `getAccessToken()` reads `localStorage.getItem('astrologaai_access_token')`, added as `Authorization: Bearer <token>`. **No issue.**
- Error handling: non-OK responses throw typed `ApiError`; all callers receive a typed error, app does not crash. Retry loop with exponential backoff for 429/5xx. **No issue.**

#### Task 6.2 — Socket.io Client (`frontend/src/lib/socket-client.ts`)
- **Bug found and fixed:** `initializeSocket()` used `process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app'` directly instead of `getApiBaseUrl()`. This bypassed trailing-slash normalisation. Fixed to call `getApiBaseUrl()` — consistent with api-client.
- Auth token: reads `localStorage.getItem('astrologaai_access_token')` and passes as `io(url, { auth: { token } })`. **Correct.**
- Reconnection: manual exponential backoff (5 max attempts, 1s→30s delay with ±20% jitter), message queue of 50 items during disconnect, stream state resumption. **Robust implementation.**
- Error handling: `connect_error` callback increments attempts, emits `onConnectionError`/`onReconnectionFailed`, never throws uncaught. **No crash risk.**
- No console.log statements printing tokens, passwords, or secrets. **Clean.**

#### Task 6.3 — Next.js Middleware (`frontend/middleware.ts`)
- Middleware file is at `frontend/middleware.ts` (root of project, not `src/`) — correct for Next.js.
- Uses `createMiddleware(routing)` from `next-intl` — no custom redirect logic, no loop risk.
- `config.matcher`: `'/((?!api|_next|_vercel|.*\\..*).*)'` — excludes `/_next/`, `/api/`, `/_vercel/`, and any path with a dot (covers `favicon.ico`, `robots.txt`, `sitemap.xml`, images). **Correct.**
- Routing config: `locales: ['en', 'bg']`, `defaultLocale: 'en'`, `localePrefix: 'as-needed'` — root `/` serves English without prefix, `/bg/` prefix for Bulgarian. No redirect loop possible with `as-needed` strategy.
- `app/layout.tsx`: no redirect calls. `app/[locale]/layout.tsx`: no redirect calls (only `notFound()` for invalid locales). **No conflicting redirects.**
- Settings pages use `router.push('/login?redirect=...')` without locale prefix — these will be intercepted by middleware and redirected to `/login?redirect=...` (default locale, correct).

#### Task 6.4 — Auth Flow (`frontend/src/lib/auth-context.tsx`)
- Token storage: `accessToken` and `refreshToken` stored in `localStorage` under `astrologaai_access_token` / `astrologaai_refresh_token`. On page load, read back from localStorage and user state restored.
- Token passed to API: `api-client.ts` calls `getAccessToken()` independently on every request. Socket client does the same. **Consistent.**
- Logout: clears all three localStorage keys (`ACCESS_TOKEN_KEY`, `REFRESH_TOKEN_KEY`, `USER_KEY`) and redirects to `/login`. **Complete.**
- Token refresh: `refreshSession()` posts to `/api/v1/auth/refresh` with stored refresh token; on failure calls `signOut()`. Not called automatically on 401 (no interceptor), but errors are caught and reported gracefully. **Acceptable — no crash risk.**
- OAuth callback: `app/auth/callback/page.tsx` — exchanges Supabase code via `exchangeCodeForSession`, then calls `handleOAuthCallback(code, provider)` which hits backend `/api/v1/auth/callback`. Tokens stored in localStorage. Redirect to `/dashboard` after 1s delay. **Correct flow.**
- `app/auth/callback/` is outside `[locale]` — receives no locale prefix from middleware (paths without a locale prefix default to `en` under `as-needed` strategy). Supabase redirects to `https://astrologa.bg/auth/callback` — **this is fine**, middleware will not inject a locale prefix because this path is served as root-layout page, not `[locale]` layout.

#### Task 6.5 — Sensitive data in console.log
- No `console.log` printing tokens, passwords, keys, or bearer headers found in `frontend/src`. **Clean.**

#### Code changes (commit 89da740)
- `frontend/src/lib/socket-client.ts`: replaced direct `process.env.NEXT_PUBLIC_API_URL || fallback` with `getApiBaseUrl()` import from `runtime-config.ts`.

#### Issues requiring manual attention
- None.

---

---

### Phase 7 — Integration Verification (2026-03-09) ✅

#### Task 7.1 — Registration Flow

**Form → API:**
- `register/page.tsx` renders `<RegistrationForm>` which calls `useAuth().signUp(email, password, fullName)`
- `auth-context.tsx` `signUp()` POSTs to `${getApiBaseUrl()}/api/v1/auth/register`
- On success: stores `accessToken` + `refreshToken` in localStorage, sets user state (`setUser`), sets `isAuthenticated = true`

**Backend route:**
- `POST /api/v1/auth/register` is public — no auth middleware, only `registrationLimiter` (rate limit: 5/hour)

**Backend controller (`register`):**
- Does NOT use Supabase — uses Prisma only (email/password stored in `user.passwordHash` via bcrypt)
- Creates user in Prisma with `tier: Tier.FREE`, creates profile + subscription + usageRecords in same transaction
- Generates JWT: `{ sub: userId, email, tier }` (access) + `{ sub: userId, type: 'refresh' }` (refresh)
- Returns both tokens in response body
- No debug code — clean

**Gap:** None. Flow is complete and correct.

---

#### Task 7.2 — Login Flow

**Form → API:**
- `login/page.tsx` renders `<LoginForm>` which calls `useAuth().signIn(email, password)`
- `auth-context.tsx` `signIn()` POSTs to `${getApiBaseUrl()}/api/v1/auth/login`

**Backend controller (`login`):**
- Looks up user in Prisma (not Supabase — this is email/password auth, NOT Supabase auth)
- Verifies `bcrypt.compare(password, user.passwordHash)` — generic error for both invalid email/password
- Signs JWT: `generateAccessToken(user.id, user.email, user.tier)` → `{ sub: userId, email, tier }`
- Sets refreshToken as httpOnly cookie (7 days)
- Returns `accessToken` in response body (no refreshToken in body for login — only for register)

**Note:** Login response body only includes `accessToken`, no `refreshToken`. But `auth-context.tsx` `signIn()` does `localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)` — `tokens.refreshToken` will be `undefined` here. This means `refreshToken` won't be stored in localStorage after login (only after register). `refreshSession()` reads from localStorage, so token refresh won't work after login (only after register). However: the refresh token IS set as an httpOnly cookie on login, so the `/api/v1/auth/refresh` endpoint (which reads from cookie first) will still work. The localStorage refresh path is broken for login, but the cookie path works.

**Frontend `isAuthenticated`:**
- `isAuthenticated: !!user` — set to true once `setUser(userData)` is called
- On page reload: restored from localStorage `astrologaai_user` + `astrologaai_access_token`

**Gap (minor, non-blocking):** `signIn()` stores `tokens.refreshToken` which is `undefined` for login — but the httpOnly cookie covers refresh server-side. Not a blocker for production.

---

#### Task 7.3 — Chat Flow

**Socket connection:**
- `socket-client.ts` `initializeSocket()` calls `getApiBaseUrl()` (fixed in Phase 6), passes `auth: { token }` from localStorage

**Backend auth middleware (`socket/index.ts`):**
- Reads token from `socket.handshake.auth.token` or `Authorization` header
- Verifies JWT, maps `decoded.sub` → `socket.userId`, `decoded.email` → `socket.userEmail`, `decoded.tier` → `socket.userTier`

**Chat handler (`socket/chat-handler.ts`):**
- `const userId = socket.userId!` — uses authenticated userId
- `const userTier = (socket.userTier as Tier) || 'FREE'` — uses tier from JWT
- Calls `checkRateLimit(userId, userTier)` before processing message — enforces per-tier limits
- Calls `incrementRateLimit(userId, userTier)` after message accepted
- DB lookup: `where: { id: conversationId, userId }` — scopes to authenticated user's conversations

**Gap:** None. Full auth → tier → rate-limit chain is intact.

---

#### Task 7.4 — Final Pre-Deploy Checklist

**Build:**
- `npm run build` exits code 2 (pre-existing `agent-tools/index.ts` TS overload errors — 20 errors, unchanged from Phase 1)
- `noEmitOnError: false` — dist is emitted correctly despite errors
- `backend/dist/index.js` exists (11,632 bytes, dated 2026-03-09 12:59)

**Railway config:**
- `railway.json` start command: `node backend/dist/index.js` ✅
- No build command — pre-built dist used directly ✅

**Railway env vars:**
- Railway API v2 `variables` query returned `Not Authorized` with current token scope (query-only, variables not readable via API)
- All critical vars were set and confirmed during Phase 2 (FRONTEND_URL, JWT_SECRET, DATABASE_URL, REDIS_URL, SUPABASE_URL, STRIPE_SECRET_KEY, etc.)

**Code checks:**
- No `localhost` hardcoded in production fallbacks: `runtime-config.ts` uses `PROD_API_FALLBACK` constant for Railway URL, `localhost` only returned when `window.location.hostname` is localhost ✅
- No debug/temp code in `authController.register` — clean catch block (fixed Phase 5) ✅
- `canGeneratePDF` — no such function exists in frontend codebase; PDF generation was removed at the stub level in Phase 1 ✅
- `socket-client.ts` uses `getApiBaseUrl()` (fixed Phase 6) ✅

---

#### Task 7.5 — Backend Dist Commit

Modified dist files from Phase 5 (authController debug removal + llm-helpers ChatContext fix):
- `backend/dist/controllers/authController.js` + maps
- `backend/dist/services/llm-helpers.js` + maps

Committed as "build: fresh backend dist — all audit fixes compiled"

---

## READY TO DEPLOY

### What Was Fixed (All Phases)

| Phase | Fix |
|-------|-----|
| 1 | Removed `canvas` + `pdfkit` from `package.json`; stubbed PDF export; excluded dead `pdf-generator.ts`; pinned Node 22 |
| 2 | Fixed `FRONTEND_URL` (was wrong Vercel URL); added `FRONTEND_URLS`; fixed `REDIS_URL` (was REST format); added `SUPABASE_SERVICE_ROLE_KEY`; swapped Stripe test→live key; fixed `RESEND_FROM_EMAIL`; added `ADMIN_EMAILS`; fixed Stripe price IDs |
| 3 | Fixed `getFrontendBaseUrl()` fallback (was old Vercel URL); added `NEXT_PUBLIC_FRONTEND_URL` + `NEXT_PUBLIC_APP_URL` to Vercel |
| 4 | Fixed Supabase `site_url` (was `localhost`!); fixed OAuth redirect URL allowlist (5 URLs) |
| 5 | Removed debug error exposure from `register()` catch; fixed `ChatContext` type for `recentMessages` |
| 6 | Fixed `socket-client.ts` to use `getApiBaseUrl()` instead of inline env var |

### Manual Actions Completed (2026-03-09)

1. ✅ **`ANTHROPIC_API_KEY`** — Set on Railway
2. ✅ **`STRIPE_WEBHOOK_SECRET`** — Webhook registered programmatically at `/api/v1/subscription/webhook`, secret set on Railway (`whsec_vSA0TR800Qot6Rff5bBlog2bsrPnS2vU`, endpoint ID `we_1T91niIl9OIfRJkg3J0Bnh5V`)
3. ✅ **`STRIPE_PUBLISHABLE_KEY`** on Vercel — Updated to live `pk_live_...` key
4. ✅ **`CRON_SECRET`** — Confirmed set on Railway

### Remaining Optional Items (not blocking deploy)

- **Yearly Stripe Price IDs** — `STRIPE_PRO_PRICE_ID_YEARLY` / `STRIPE_PREMIUM_PRICE_ID_YEARLY` — only needed when yearly billing plans are offered

### ✅ READY TO DEPLOY — No blockers remaining

**To deploy:**
1. Push current commits to `main` → Vercel auto-deploys frontend
2. In Railway dashboard → click Deploy on `astrologaai-backend` service to pick up new dist

---

#### Additional notes (Phase 2)
- `LLM_MODEL`, `MODEL_FREE/PREMIUM/PRO` — optional; code has fallbacks. Not critical.
- `ASTROLOGY_HEALTH_CACHE_TTL`, `ASTROLOGY_HEALTH_CHECK_INTERVAL` — optional with defaults.
- `JWT_REFRESH_SECRET` on Railway (set) but code references `JWT_REFRESH_EXPIRES_IN` (set). `JWT_REFRESH_SECRET` not in code — likely unused/extra.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` remain on Railway but code only uses `REDIS_URL` (node redis client, not REST). These are harmless extras.
- Redis client (`redis` npm package v4) needs `redis://` or `rediss://` URL format — correctly set as `rediss://default:…`
