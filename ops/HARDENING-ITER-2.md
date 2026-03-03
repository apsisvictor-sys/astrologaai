# HARDENING ITER 2

## Tests Performed
- **Deployed frontend UI auth check (Vercel)** via browser automation:
  - Opened `https://frontend-rust-nu-20.vercel.app/bg/register`
  - Attempted registration with valid inputs
  - UI displayed **`Failed to fetch`**
  - Browser console error: request sent to `http://localhost:4000/api/v1/auth/register` (`ERR_CONNECTION_REFUSED`)
- **Production backend + CORS smoke**: `./scripts/smoke-backend-prod.sh`
  - `/health` returns 200
  - CORS preflight allows primary origin (`https://frontend-rust-nu-20.vercel.app`)
  - CORS preflight allows alternate origin (`https://astrologaai-qa.vercel.app`)
  - Blocked origin correctly denied (no allow-origin header)
- **Backend auth smoke (local runtime)**: `./scripts/check-backend-auth.sh`
  - malformed login/register payloads -> 400
  - valid-shape login/register payloads -> non-500
- **Build verification**:
  - `npm run build --workspace=frontend`
  - `npm run build --workspace=backend`

## Changes Made
- **Backend startup env diagnostics (non-secret)**
  - Added: `backend/src/config/envValidation.ts`
  - Updated: `backend/src/index.ts`
    - Added `GET /health/env`
    - Added startup env validation summary logs (`ok/degraded`, missing required keys only)
- **CI auth/build smoke gate**
  - Added: `.github/workflows/auth-smoke.yml`
  - CI steps now enforce:
    - frontend build
    - backend build
    - `./scripts/check-backend-auth.sh`
- **Next lockfile patch warning cleanup**
  - Updated: `frontend/package.json` (`build` script now plain `next build`)
  - Updated: `.github/workflows/auth-smoke.yml` (removed `NEXT_IGNORE_INCORRECT_LOCKFILE` env override)
  - Updated dependency/locks to stabilize Next/SWC lock resolution in workspace:
    - `frontend/package-lock.json`
    - `package-lock.json`
- **Frontend API default fix for deployed bundles**
  - Updated: `frontend/next.config.js`
  - Removed hardcoded build-time fallback `NEXT_PUBLIC_API_URL=http://localhost:4000` (this was causing deployed auth fetches to localhost when env missing)

## Validation Results
- ✅ Backend build passes.
- ✅ Frontend build passes.
- ✅ `scripts/check-backend-auth.sh` passes.
- ✅ Production CORS behavior validated (allowed + blocked origins behave correctly).
- ✅ Next build runs cleanly without lockfile patch warning noise.
- ❌ Full **deployed** register/login/refresh/logout UI flow is still not fully pass-verified on current live deployment because frontend is still serving an older/misconfigured bundle (localhost API target observed).

## Remaining Issues
1. **Production frontend deployment drift**: live Vercel build still points auth requests to `http://localhost:4000`.
2. **Full deployed auth E2E happy path not yet re-run after redeploy** (register -> login -> refresh -> logout).

## Next Prompt
"Deploy latest hardening changes to frontend and backend, then re-run full production UI auth E2E (register, login, refresh, logout) on the live Vercel URL. Confirm zero `Failed to fetch`, no auth 500s for malformed/valid payloads, and capture `/health/env` output from production (non-secret only)."