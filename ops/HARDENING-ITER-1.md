# HARDENING-ITER-1 — AstroLogAI Production Hardening Checkpoint

Date: 2026-03-03
Scope: Iteration 1 (auth fetch failures, auth 500 hardening, production reliability)

## Issues Found

1. **[High] Backend startup coupled to CRON secret**
   - `backend/src/utils/cron.ts` threw at module import when `CRON_SECRET` was missing.
   - Because `cron` routes are imported at app boot, the whole API failed to start.
   - Frontend auth/register/login then surfaced as network-level "Failed to fetch".

2. **[Medium] Possible auth 500 path on login for incomplete/legacy user records**
   - `bcrypt.compare(password, user.passwordHash)` assumed `passwordHash` always exists.
   - Any malformed/legacy OAuth row with missing hash could trigger a runtime error path.

3. **[Medium] Existing auth payload validation was already in place**
   - Login/register now correctly return `400 VALIDATION_ERROR` for malformed payloads.
   - No change required here in this iteration (verified during tests).

---

## Fixes Applied

1. **Decoupled cron secret from API startup (reliability hardening)**
   - **File:** `backend/src/utils/cron.ts`
   - Replaced startup-throw behavior with:
     - `getCronSecret(): string | null`
     - `hasCronSecret(): boolean`
   - This prevents non-auth features (cron config) from taking down auth and the whole API.

2. **Closed cron endpoints safely when secret is missing**
   - **File:** `backend/src/routes/cron.ts`
   - Switched from static `CRON_SECRET` import to runtime `getCronSecret()` checks.
   - If secret is missing: return `503 CRON_NOT_CONFIGURED`.
   - If secret is wrong/missing in request: return `401 UNAUTHORIZED`.
   - Result: cron stays protected, while API remains available.

3. **Defensive auth login guard to avoid accidental 500**
   - **File:** `backend/src/controllers/authController.ts`
   - Added `passwordHash` existence guard before `bcrypt.compare`.
   - If hash is missing, returns generic `401 INVALID_CREDENTIALS` (no internal throw).

---

## Testing Results

Local runtime verification (backend started with current local env, without `CRON_SECRET`):

1. `GET /health`
   - **Result:** `200 OK`

2. `POST /api/v1/auth/login` with `{}`
   - **Result:** `400 VALIDATION_ERROR` (not 500)

3. `POST /api/v1/auth/register` with `{}`
   - **Result:** `400 VALIDATION_ERROR` (not 500)

4. `POST /api/v1/cron/monthly-reset` without configured secret
   - **Result:** `503 CRON_NOT_CONFIGURED`
   - Confirms cron misconfig no longer crashes API startup.

---

## Remaining Issues

1. **Frontend E2E verification not executed in this iteration**
   - We validated backend behavior and reliability path.
   - Browser-level register/login against deployed frontend should still be run next.

2. **Production env hygiene still required**
   - `CRON_SECRET` should still be configured in production for cron jobs to function.
   - Current behavior is fail-closed for cron endpoints (safe), not fail-stop for whole server.

---

## Next Prompt

Iteration 2 prompt:

1. Run full frontend browser E2E auth checks (register, login, refresh, logout) against the deployed stack.
2. Verify no "Failed to fetch" appears in login/register UI under normal production conditions.
3. Validate CORS for actual production frontend origins and capture explicit pass/fail evidence.
4. Add a lightweight startup diagnostics log block (non-secret) showing key env readiness (JWT configured, cron configured, allowed origins count).
5. If all pass, mark the release as **customer-ready**.
