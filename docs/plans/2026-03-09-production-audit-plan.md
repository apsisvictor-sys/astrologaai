# Production Audit & Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit every layer of the AstroLogAI stack, fix all issues found, then trigger a single clean deploy to Railway (backend) and Vercel (frontend).

**Architecture:** 7 sequential audit phases — each phase reads relevant files/services, identifies all issues, applies the smallest possible fixes, verifies locally, commits, then moves on. No deploy happens until all 7 phases are green.

**Tech Stack:** Node 22 / Express / TypeScript (backend), Next.js 14 / next-intl (frontend), Railway (backend hosting), Vercel (frontend hosting), Supabase (auth + DB mirror), Railway Postgres (primary DB), Upstash Redis, Socket.io, Stripe, Resend

**Domain:** `https://astrologa.bg` (frontend), `https://astrologaai-backend-production.up.railway.app` (backend)

**Progress file:** `tasks/audit-progress.md` — update after each phase so work can resume if context runs out

---

## Phase 1 — Railway Build Fix

**Goal:** Make the Railway build succeed. Root cause confirmed: `canvas@2.11.2` in `backend/package.json` has no pre-built binary for Node 22 and requires Python (unavailable in Nixpacks). The PDF controller already uses a stub that doesn't import canvas.

### Task 1.1: Remove `canvas` and `pdfkit` from backend dependencies

**Files:**
- Modify: `backend/package.json`

**Step 1:** Open `backend/package.json` and remove these two lines from `dependencies`:
```json
"canvas": "^2.11.2",
"pdfkit": "^0.15.0",
```

**Step 2:** Verify `backend/src/controllers/pdfController.ts` imports from `pdf-generator.stub` (not the real `pdf-generator`). It already does — confirm line 12 reads:
```ts
import { generateNatalChartPDF, getPDFHeaders } from '../services/pdf-generator.stub';
```

**Step 3:** Verify `backend/src/services/pdf-generator.ts` (the real one, never used) still exists but is NOT imported anywhere:
```bash
grep -r "pdf-generator'" backend/src --include="*.ts" | grep -v stub | grep -v "pdf-generator.ts"
```
Expected: no output (nothing imports the real pdf-generator)

**Step 4:** Run `npm install` from the backend directory to update `package-lock.json`:
```bash
cd backend && npm install
```

**Step 5:** Commit
```bash
git add backend/package.json package-lock.json
git commit -m "fix: remove canvas and pdfkit from backend deps — crashing Railway builds"
```

---

### Task 1.2: Verify Railway start command and build path

**Files:**
- Read: `railway.json`
- Read: `backend/package.json` scripts section
- Read: `backend/tsconfig.json`

**Step 1:** Confirm `railway.json` start command:
```json
"startCommand": "node backend/dist/index.js"
```
This runs from the **repo root**. Verify `backend/dist/index.js` exists and is up-to-date by checking the last compile time vs last source change:
```bash
ls -la backend/dist/index.js && ls -la backend/src/index.ts
```

**Step 2:** Check `backend/tsconfig.json` `outDir` — should be `"./dist"` (relative to backend/).

**Step 3:** Check if Railway is expected to build from source (Nixpacks runs `npm ci` then a build command). Look for a `build` script in `backend/package.json`:
```bash
cat backend/package.json | grep -A5 '"scripts"'
```
If no build step runs `tsc`, Railway will use whatever is in `dist/` at push time. Confirm the current `railway.json` has NO build command that would run `tsc` (which would fail if canvas is in devDeps during compile).

**Step 4:** Pin Node version to avoid future binary incompatibility. Add to root `package.json` engines field:
```json
"engines": {
  "node": ">=18.0.0 <23.0.0"
}
```
Also create `.nvmrc` in repo root:
```
22
```

**Step 5:** Commit if any changes made:
```bash
git add railway.json .nvmrc package.json
git commit -m "fix: pin node version range, verify Railway start command"
```

---

### Task 1.3: Update audit progress file

**Files:**
- Create/Update: `tasks/audit-progress.md`

Mark Phase 1 complete with findings summary.

---

## Phase 2 — Backend Environment Variables

**Goal:** Every `process.env.*` reference in backend code is covered by a real value on Railway production.

### Task 2.1: Enumerate all env var references in backend source

**Step 1:** Run this to get every unique env var name referenced:
```bash
grep -rh "process\.env\." backend/src --include="*.ts" \
  | grep -oP 'process\.env\.[A-Z_]+' | sort -u
```
Write down the full list.

**Step 2:** Key vars expected from the codebase (verify each exists in scan):
| Var | Used for |
|-----|----------|
| `DATABASE_URL` | Prisma DB connection |
| `JWT_SECRET` | Token signing (fails hard at startup if missing) |
| `SUPABASE_URL` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin operations |
| `REDIS_URL` | Upstash Redis |
| `ANTHROPIC_API_KEY` | Claude AI |
| `OPENAI_API_KEY` | GPT-4o fallback |
| `ASTROLOGY_API_KEY` | astrology-api.io |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook validation |
| `FRONTEND_URL` | CORS allowed origin |
| `ADMIN_EMAILS` | Admin auth middleware |
| `RESEND_API_KEY` | Email sending |
| `MODEL_FREE` / `MODEL_PRO` / `MODEL_PREMIUM` | Per-tier AI models (optional, have defaults) |
| `PORT` | Server port (Railway injects automatically) |
| `NODE_ENV` | `production` |

### Task 2.2: Query Railway for currently set env vars

**Step 1:** Query Railway GraphQL for the production environment variables of the backend service:
```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ variables(serviceId: \"5b2b4b25-871e-4116-bd6b-97eff86770ab\", environmentId: \"70408d23-c4b1-43e6-8a71-078a4d86724a\") }"}' \
  | python3 -m json.tool
```

**Step 2:** Compare the Railway vars against the list from Task 2.1. Note every missing or suspicious var.

### Task 2.3: Fix missing/wrong env vars on Railway

For each missing var, set it via Railway API or note it for manual action via Railway dashboard if the value requires a secret lookup.

**Step 1:** For any var that is missing and whose value is known from local `.env` or the infrastructure guide, set it:
```bash
# Example pattern (repeat per missing var):
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { variableUpsert(input: { projectId: \"d5cb7ab9-a90c-4723-ab73-57fa26ad37aa\", environmentId: \"70408d23-c4b1-43e6-8a71-078a4d86724a\", serviceId: \"5b2b4b25-871e-4116-bd6b-97eff86770ab\", name: \"VAR_NAME\", value: \"VAR_VALUE\" }) }"}'
```

**Step 2:** Verify `FRONTEND_URL` is set to `https://astrologa.bg` (used for CORS).

**Step 3:** Verify `JWT_SECRET` is a strong secret (≥32 chars). If not, generate one:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Task 2.4: Update audit progress file

---

## Phase 3 — Frontend Environment Variables

**Goal:** Every `NEXT_PUBLIC_*` variable in frontend code points to the correct production value on Vercel.

### Task 3.1: Enumerate all frontend env var references

**Step 1:**
```bash
grep -rh "NEXT_PUBLIC_\|process\.env\." frontend/src --include="*.ts" --include="*.tsx" \
  | grep -oP '(NEXT_PUBLIC_[A-Z_]+|process\.env\.[A-Z_]+)' | sort -u
```

**Step 2:** Key vars expected:
| Var | Expected value |
|-----|---------------|
| `NEXT_PUBLIC_API_URL` | `https://astrologaai-backend-production.up.railway.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pmqqmyylhxykaiysoluh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `NEXT_PUBLIC_APP_URL` | `https://astrologa.bg` (if referenced) |

### Task 3.2: Query Vercel for currently set env vars

**Step 1:**
```bash
curl -s "https://api.vercel.com/v9/projects/prj_7sA2y1WmHos6LYZ93vSXG3lXq7ud/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for e in data.get('envs', []):
    print(f\"{e['key']} = [{e['type']}] target={e.get('target','')}\")
"
```

**Step 2:** Compare against list from Task 3.1. Note missing or wrong values.

### Task 3.3: Scan for hardcoded backend URLs in frontend code

**Step 1:**
```bash
grep -rn "railway.app\|localhost:3001\|localhost:4000\|localhost:8000" \
  frontend/src --include="*.ts" --include="*.tsx"
```
Any hardcoded Railway URL that is NOT behind `process.env.NEXT_PUBLIC_API_URL` must be fixed to use the env var.

**Step 2:** Check `professional-pdf-export.tsx` — known to have a hardcoded fallback URL:
```bash
grep -n "API_URL\|railway.app" frontend/src/components/chart/professional-pdf-export.tsx
```
Fix any hardcoded fallbacks to use only `process.env.NEXT_PUBLIC_API_URL`.

### Task 3.4: Fix missing/wrong Vercel env vars

For each missing var, upsert via Vercel API:
```bash
# Example pattern:
curl -s -X POST "https://api.vercel.com/v10/projects/prj_7sA2y1WmHos6LYZ93vSXG3lXq7ud/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "NEXT_PUBLIC_API_URL",
    "value": "https://astrologaai-backend-production.up.railway.app",
    "type": "plain",
    "target": ["production", "preview"]
  }'
```

### Task 3.5: Commit any code changes, update progress file

```bash
git add frontend/src/
git commit -m "fix: remove hardcoded URLs from frontend, use env vars"
```

---

## Phase 4 — Supabase Configuration

**Goal:** Supabase auth is configured for `astrologa.bg` — redirect URLs, OAuth, email templates all point to the right domain.

### Task 4.1: Verify Supabase auth redirect URLs via API

**Step 1:** Query Supabase project config:
```bash
curl -s "https://api.supabase.com/v1/projects/pmqqmyylhxykaiysoluh/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | python3 -m json.tool | grep -E "site_url|redirect|external"
```

**Step 2:** `site_url` must be `https://astrologa.bg`. If not, patch it:
```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/pmqqmyylhxykaiysoluh/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"site_url": "https://astrologa.bg"}'
```

**Step 3:** `additional_redirect_urls` must include:
- `https://astrologa.bg/auth/callback`
- `https://astrologa.bg/en/auth/callback`
- `https://astrologa.bg/bg/auth/callback`
- `http://localhost:3000/auth/callback` (dev)

If missing, patch:
```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/pmqqmyylhxykaiysoluh/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "additional_redirect_urls": "https://astrologa.bg/auth/callback,https://astrologa.bg/en/auth/callback,https://astrologa.bg/bg/auth/callback,http://localhost:3000/auth/callback"
  }'
```

### Task 4.2: Verify Google OAuth is configured

**Step 1:** Check if Google provider is enabled with valid client ID/secret. If `SUPABASE_GOOGLE_CLIENT_ID` and `SUPABASE_GOOGLE_CLIENT_SECRET` are set in Railway env, they may also need to be in Supabase auth config.

**Step 2:** Check Google OAuth callback URL registered in Google Console — must be:
`https://pmqqmyylhxykaiysoluh.supabase.co/auth/v1/callback`

Note any missing configuration for manual action (Google Console access required).

### Task 4.3: Update audit progress file

---

## Phase 5 — Backend Code Audit

**Goal:** Backend code is production-ready — correct CORS, auth, routes, error handling.

### Task 5.1: Audit CORS configuration

**Files:**
- Read: `backend/src/config/runtime.ts`

**Step 1:** Read `runtime.ts` and find `isOriginAllowed` or `allowedOrigins`:
```bash
grep -n "astrologa\|FRONTEND_URL\|allowedOrigins\|isOriginAllowed" \
  backend/src/config/runtime.ts
```

**Step 2:** The CORS allowed origins must include `https://astrologa.bg`. It should be driven by `FRONTEND_URL` env var. Verify the logic handles both `astrologa.bg` and `astrologaai-frontend*.vercel.app` (for preview deploys).

**Step 3:** If `astrologa.bg` is not covered, add it to the allowed origins list. Minimal fix — add a check for the production domain:
```ts
// In isOriginAllowed or allowedOrigins array:
process.env.FRONTEND_URL,           // https://astrologa.bg
/astrologaai-frontend.*\.vercel\.app$/,  // Vercel preview URLs
'http://localhost:3000',
```

**Step 4:** Commit any fix:
```bash
git add backend/src/config/runtime.ts
git commit -m "fix: ensure astrologa.bg is in CORS allowed origins"
```

### Task 5.2: Audit auth middleware

**Files:**
- Read: `backend/src/middleware/auth.ts`
- Read: `backend/src/utils/jwt.ts`

**Step 1:** Verify `auth.ts` reads the JWT token from `Authorization: Bearer <token>` header (standard).

**Step 2:** Verify `jwt.ts` fails fast at startup if `JWT_SECRET` is not set (already confirmed in security audit, but double-check).

**Step 3:** Verify the JWT payload structure matches what `authController` puts in it:
- `authController` should sign with `{ sub: userId, email, tier }`
- `auth.ts` should read `decoded.sub` as userId
- `socket/index.ts` should also use `decoded.sub`

```bash
grep -n "sub\|userId\|decoded\." backend/src/middleware/auth.ts backend/src/socket/index.ts
```

### Task 5.3: Audit all routes registered in index.ts

**Files:**
- Read: `backend/src/index.ts`

**Step 1:** Verify every route file in `backend/src/routes/` is imported and registered in `index.ts`:
```bash
ls backend/src/routes/
grep "import.*Routes\|app.use" backend/src/index.ts
```
Find any route file that exists but is not registered.

**Step 2:** Verify health check endpoints are publicly accessible (no auth middleware):
- `GET /health`
- `GET /health/db`
- `GET /health/redis`

**Step 3:** Commit any fixes.

### Task 5.4: Audit error handling — no stack traces in production

**Files:**
- Read: `backend/src/index.ts` (global error handler at bottom)

**Step 1:** Find the global error handler:
```bash
grep -n "err.*stack\|NODE_ENV.*development\|errorHandler" backend/src/index.ts | tail -20
```

**Step 2:** Verify stack traces are only included when `NODE_ENV === 'development'`. Fix if exposing stacks in production.

**Step 3:** Commit any fixes:
```bash
git add backend/src/
git commit -m "fix: backend code audit — CORS, auth, routes, error handling"
```

### Task 5.5: Update audit progress file

---

## Phase 6 — Frontend Code Audit

**Goal:** Frontend correctly targets the production backend, auth flow is solid, i18n routing doesn't loop.

### Task 6.1: Audit API client base URL

**Files:**
- Read: `frontend/src/lib/api-client.ts`

**Step 1:** Verify the API client uses `process.env.NEXT_PUBLIC_API_URL` with no localhost fallback that could sneak into production:
```bash
grep -n "API_URL\|baseURL\|localhost" frontend/src/lib/api-client.ts
```

**Step 2:** The fallback chain should be:
```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL
  ?? 'https://astrologaai-backend-production.up.railway.app';
```
No `localhost` in any fallback.

### Task 6.2: Audit Socket.io client connection

**Files:**
- Read: `frontend/src/lib/` (find socket client file)

**Step 1:**
```bash
ls frontend/src/lib/ && grep -rn "socket.io\|io(" frontend/src/lib --include="*.ts" | head -20
```

**Step 2:** Verify the socket connects to `NEXT_PUBLIC_API_URL`, passes the JWT token in the auth handshake:
```ts
const socket = io(API_URL, {
  auth: { token: accessToken },
  ...
});
```

**Step 3:** Verify no hardcoded URLs in socket setup.

### Task 6.3: Audit i18n middleware — no redirect loops

**Files:**
- Read: `frontend/src/middleware.ts`
- Read: `frontend/src/app/[locale]/layout.tsx`

**Step 1:** Read the Next.js middleware:
```bash
cat frontend/src/middleware.ts
```

**Step 2:** Verify the middleware:
- Does NOT redirect on API routes (`/api/*`)
- Does NOT redirect on `/_next/*`, `/favicon.ico`, `/robots.txt`
- Handles the root `/` → `/en` or `/bg` redirect without looping
- The `[locale]` segment covers `en` and `bg`

**Step 3:** Check that no page component has its own redirect that conflicts with middleware:
```bash
grep -rn "redirect\|useRouter.*push" frontend/src/app --include="*.tsx" | grep -v ".next" | head -20
```

### Task 6.4: Audit auth flow

**Files:**
- Read: `frontend/src/lib/auth-context.tsx` (or equivalent)

**Step 1:**
```bash
ls frontend/src/lib/ | grep -i auth && grep -rn "localStorage\|sessionStorage\|token" frontend/src/lib --include="*.ts" --include="*.tsx" | head -20
```

**Step 2:** Verify:
- Token is stored and retrieved correctly after login
- Token is passed in `Authorization: Bearer` header on API calls
- Token is passed in socket auth handshake
- On logout, token is cleared

### Task 6.5: Commit any frontend code fixes and update progress file

```bash
git add frontend/src/
git commit -m "fix: frontend code audit — API URLs, socket, i18n, auth flow"
```

---

## Phase 7 — Integration Verification (Offline)

**Goal:** Trace all critical user flows end-to-end through the code before deploying.

### Task 7.1: Trace registration flow

**Step 1:** Follow the code path:
```
frontend/src/app/[locale]/register/page.tsx
  → POST /api/v1/auth/register
  → backend/src/controllers/authController.ts (register function)
  → prisma.user.create
  → Supabase auth.admin.createUser (or signUp)
  → JWT issued
  → response with token
```

Verify each step exists and there are no obvious gaps (missing `await`, wrong field names, etc.).

**Step 2:** Check the register endpoint is NOT behind auth middleware (it should be public):
```bash
grep -n "register\|authMiddleware" backend/src/routes/auth.ts | head -10
```

### Task 7.2: Trace login flow

**Step 1:** Follow:
```
frontend/src/app/[locale]/login/page.tsx
  → POST /api/v1/auth/login
  → backend/src/controllers/authController.ts (login)
  → Supabase verify credentials
  → JWT signed with { sub: userId, email, tier }
  → frontend stores token
  → redirects to dashboard
```

**Step 2:** Verify the `debug` commit (`a8b3e79`) that exposed raw errors in register endpoint is reverted/cleaned up:
```bash
grep -n "debug\|TODO\|TEMP\|expose" backend/src/controllers/authController.ts | head -10
```

### Task 7.3: Trace chat flow

**Step 1:** Follow:
```
frontend: socket.connect(API_URL, { auth: { token } })
  → backend/src/socket/index.ts: auth middleware decodes JWT
  → socket.userId = decoded.sub
  → chat:start event → room join
  → chat:message event → chat-handler.ts → streamText
  → stream chunks → chat:chunk events back to frontend
  → chat:complete → DB save
```

**Step 2:** Verify socket auth uses `decoded.sub` (not `decoded.userId`):
```bash
grep -n "decoded\." backend/src/socket/index.ts
```

### Task 7.4: Final pre-deploy checklist

Run through this checklist manually before committing the "ready to deploy" signal:

- [ ] `backend/package.json` — `canvas` and `pdfkit` removed
- [ ] `railway.json` — start command is `node backend/dist/index.js`
- [ ] `backend/dist/index.js` — compiled and current
- [ ] Railway env vars — all required vars present, `FRONTEND_URL=https://astrologa.bg`
- [ ] Vercel env vars — `NEXT_PUBLIC_API_URL` set to Railway backend URL
- [ ] Supabase — `site_url=https://astrologa.bg`, redirect URLs include `/auth/callback`
- [ ] CORS — `astrologa.bg` in allowed origins
- [ ] JWT — `decoded.sub` used everywhere (not `decoded.userId`)
- [ ] No raw stack traces in production error responses
- [ ] No `localhost` hardcoded in frontend fallbacks
- [ ] No debug/temp code left in auth controller
- [ ] i18n middleware — no redirect loops

### Task 7.5: Rebuild backend dist and final commit

**Step 1:** Rebuild the backend TypeScript:
```bash
cd backend && npm run build
```
Expected: no TypeScript errors, `dist/` updated.

**Step 2:** Commit the fresh dist:
```bash
cd ..
git add backend/dist/
git commit -m "build: fresh backend dist for production deploy"
```

### Task 7.6: Update audit progress file — mark all phases complete

Update `tasks/audit-progress.md` with full summary and signal ready to deploy.

---

## Notes

- **PDF feature:** `canvas` and `pdfkit` removed. `pdf-generator.ts` (real implementation) stays in place but unused — delete later if desired. Future professional PDF should use `@resvg/resvg-js` + `pdfkit` (no native compilation). See `tasks/master_roadmap_todo.md` ENH-00.
- **Railway Postgres vs Supabase:** Railway has a `Postgres-KgZU` service alongside `Postgres`. `DATABASE_URL` must point to the correct one. Verify which Postgres instance Prisma is targeting.
- **Two Postgres instances on Railway:** Investigate during Phase 2 — confirm which is active, whether the other is orphaned.
