## Security Issues
- [Hardcoded JWT fallback secrets]: Multiple backend modules fall back to insecure default JWT secrets (`'your-super-secret-jwt-key-change-in-production'`, `'your-secret-key-change-in-production'`) if env vars are missing. This can allow token forgery if deployed misconfigured. **Location:** `backend/src/middleware/auth.ts`, `backend/src/controllers/authController.ts`, `backend/src/controllers/oauthController.ts`, `backend/src/socket/index.ts`. **Suggestion:** Fail fast at startup when `JWT_SECRET` is missing; remove insecure defaults entirely.

- [Public admin-like LLM control endpoints]: Provider health refresh and override routes are publicly accessible although comments say “requires authentication (admin only)”. **Location:** `backend/src/routes/llm.ts` (`POST /health/check`, `POST /override`, `DELETE /override`). **Suggestion:** Add auth + admin role middleware and audit logging for override actions.

- [Cron endpoints can be unauthenticated if secret missing]: Cron auth only checks secret when `CRON_SECRET` exists; if unset, endpoints are open. **Location:** `backend/src/routes/cron.ts`. **Suggestion:** Require `CRON_SECRET` at boot and reject startup if absent; optionally restrict by IP allowlist.

- [Insecure unsubscribe token handling in one controller]: Token is decoded directly from base64 userId (“for simplicity”), enabling trivial forged unsubscribe actions. **Location:** `backend/src/controllers/userPreferencesController.ts` (`unsubscribeFromEmails`). **Suggestion:** Remove this code path or replace with signed, random, one-time token validation (DB/Redis-backed).

- [Access tokens stored in localStorage]: Frontend consistently reads bearer tokens from `localStorage`, exposing tokens to XSS theft. **Location:** e.g. `frontend/src/app/[locale]/pricing/page.tsx`, `frontend/src/app/[locale]/settings/*`, `frontend/src/components/*`. **Suggestion:** Move auth to secure httpOnly cookies + CSRF protections for state-changing endpoints.

## Code Quality
- [JWT payload inconsistency between HTTP and WebSocket]: HTTP tokens use `sub`, but WebSocket auth expects `decoded.userId`. This mismatch causes undefined user context and brittle runtime behavior. **Location:** `backend/src/controllers/authController.ts` (token creation), `backend/src/socket/index.ts` (token parsing). **Suggestion:** Standardize claims (`sub` everywhere) and add typed token schema validation.

- [Env var naming confusion for CORS]: CORS origin uses `NEXT_PUBLIC_API_URL` (API URL) instead of frontend origin variable, making policy error-prone. **Location:** `backend/src/index.ts`, `backend/src/socket/index.ts`. **Suggestion:** Use dedicated `FRONTEND_URL`/allowed origins list and validate format at startup.

- [Duplicate/legacy unsubscribe implementations]: Notification unsubscribe exists in `notificationPreferencesController`, while another insecure variant appears in `userPreferencesController`. **Location:** both controllers. **Suggestion:** Consolidate to one secure implementation and remove dead/legacy code.

- [Excessive console logging in controllers]: Sensitive workflow logs are spread across auth, OAuth, exports, charts, sockets. **Location:** `backend/src/controllers/*`, `backend/src/socket/*`. **Suggestion:** Use centralized logger with levels, redaction, and environment-based verbosity.

## Performance
- [PrismaClient instantiated in middleware module]: A new PrismaClient is created in `auth.ts` instead of reusing shared singleton, risking connection churn and pool pressure. **Location:** `backend/src/middleware/auth.ts`. **Suggestion:** Import shared client from `backend/src/utils/prisma.ts`.

- [Health DB endpoint creates PrismaClient per request]: `GET /health/db` dynamically creates a new Prisma client each call and doesn’t explicitly reuse singleton. **Location:** `backend/src/index.ts`. **Suggestion:** Reuse global Prisma instance.

- [Repeated polling intervals in UI status component]: Provider status polling every 30s in multiple effects can create overlapping network load depending on render path. **Location:** `frontend/src/components/provider-status.tsx`. **Suggestion:** Ensure single interval lifecycle and shared cache/state.

- [Large client-side pages with many inline styles and logic]: Several app pages (pricing/settings/chart pages) do heavy client rendering and repeated token/API boilerplate. **Location:** `frontend/src/app/[locale]/*`. **Suggestion:** Extract reusable API client/hooks and consider server components where possible.

## Bugs
- [WebSocket auth likely broken with access tokens]: Access token payload uses `{ sub }`, but socket middleware reads `decoded.userId`; userId becomes undefined and can break chat/reconnection logic using `socket.userId!`. **Location:** `backend/src/socket/index.ts`, `backend/src/controllers/authController.ts`. **Suggestion:** Parse `sub` claim in sockets and hard-fail if absent.

- [Refresh-token flow inconsistency]: Login sets refresh token cookie, but refresh endpoint only reads token from request body; logout also does not clear cookie. **Location:** `backend/src/controllers/authController.ts` (`login`, `refresh`, `logout`). **Suggestion:** Read refresh token from httpOnly cookie first; clear cookie on logout; rotate refresh tokens.

- [Potentially wrong OAuth random password generation approach]: Uses `bcrypt.genSaltSync(32)` as a random password source before hashing. Works but semantically incorrect and expensive. **Location:** `backend/src/controllers/oauthController.ts`. **Suggestion:** Use `crypto.randomBytes` for random secret generation.

- [Route/comment mismatch for exports]: Comment says `GET /api/v1/user/export` but route is `/export/list`, which can cause client confusion and integration bugs. **Location:** `backend/src/routes/user.ts`. **Suggestion:** Align comments/docs and route names.

## Summary
Overall assessment: **moderate-to-high risk** due to auth/session inconsistencies and exposed operational endpoints. Core architecture is solid (route separation, middleware, validations, rate limiting), but security hardening and token-flow consistency need immediate attention.

Priority recommendations:
1. **P0:** Fix JWT claim mismatch (`sub` vs `userId`) for WebSocket auth.
2. **P0:** Protect LLM override/health-check routes with auth + admin authorization.
3. **P0:** Remove insecure JWT default secrets and fail startup when missing.
4. **P1:** Enforce cron secret presence and tighten cron endpoint access.
5. **P1:** Move auth tokens out of localStorage to secure cookie-based sessions.
6. **P1:** Unify unsubscribe token implementation and remove insecure legacy logic.
7. **P2:** Reuse Prisma singleton everywhere to reduce DB connection overhead.
8. **P2:** Normalize logout/refresh behavior (cookie read, clear, rotate).
