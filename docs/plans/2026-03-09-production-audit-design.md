# AstroLogAI — Production Audit & Hardening Design
**Date:** 2026-03-09
**Goal:** Comprehensive offline audit of all layers before a single clean redeployment to Railway (backend) and Vercel (frontend).

---

## Context

Railway backend has been failing to build due to `canvas@2.11.2` — a native C++ module with no pre-built binary for Node 22, requiring Python for source compilation (unavailable in Nixpacks). The `canvas` dep was an orphan from an unimplemented server-side PDF feature; the PDF controller already uses a stub. Vercel frontend deploys are healthy (all READY).

The previous fix-by-fix approach caused circular regressions. This audit processes all layers holistically before any deployment.

---

## Production Domains

| Service    | Domain / URL                                              |
|------------|-----------------------------------------------------------|
| Frontend   | `https://astrologa.bg` (Vercel)                           |
| Backend    | `https://astrologaai-backend-production.up.railway.app`   |
| Supabase   | `https://pmqqmyylhxykaiysoluh.supabase.co`                |

---

## Audit Phases

### Phase 1 — Railway Build Fix
- Remove `canvas` and `pdfkit` from `backend/package.json`
- Verify `railway.json` start command points to correct built file
- Pin Node version to avoid future binary incompatibility
- Verify `backend/dist/` is current or build step is correct

### Phase 2 — Backend Environment Variables
- Map every `process.env.*` reference in backend source
- Cross-check against what is actually set on Railway production environment
- Identify missing, misnamed, or placeholder values
- Fix: add missing vars, correct names

### Phase 3 — Frontend Environment Variables
- Map every `NEXT_PUBLIC_*` reference in frontend source
- Cross-check against Vercel project env vars
- Identify hardcoded URLs that should be env vars (and vice versa)
- Fix: update Vercel env vars, clean up hardcoded fallbacks

### Phase 4 — Supabase Configuration
- Auth redirect URLs: must include `https://astrologa.bg` and `/auth/callback` paths
- OAuth providers: Google client ID/secret wired correctly
- Email confirmation: site URL set to `https://astrologa.bg`
- JWT expiry settings compatible with backend token handling

### Phase 5 — Backend Code Audit
- CORS: `astrologa.bg` must be in the allowed origins list
- Auth middleware: JWT secret, token structure, header parsing
- Routes: all route files registered in `index.ts`, no dead imports
- Error handling: no raw stack traces in production responses
- Socket.io: CORS origins match, auth handshake correct

### Phase 6 — Frontend Code Audit
- `NEXT_PUBLIC_API_URL`: points to Railway backend, no localhost leaks
- Auth flow: login → JWT stored → passed correctly in API calls and Socket.io handshake
- i18n routing: `[locale]` structure correct, middleware not causing redirect loops
- Socket.io client: connects to correct backend URL with auth token

### Phase 7 — Integration Verification (offline)
- Trace register flow: frontend form → backend `/auth/register` → Supabase → DB
- Trace login flow: frontend → backend `/auth/login` → JWT → localStorage/cookie
- Trace chat flow: Socket.io connect with JWT → room join → stream → DB save
- Confirm PDF download (client-side) still works after canvas removal
- Confirm all env vars present before triggering deploy

---

## Constraints

- One phase at a time — complete, fix, verify, move on
- Every fix is the smallest possible change to affected code
- No deploy until all 7 phases are complete
- Progress tracked in `tasks/audit-progress.md` (updated each phase)
- If context window fills, resume from `tasks/audit-progress.md`

---

## Out of Scope

- New features
- UI changes
- Database migrations
- Any infrastructure not directly blocking deployment
