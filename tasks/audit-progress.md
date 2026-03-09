# Production Audit Progress
**Plan:** `docs/plans/2026-03-09-production-audit-plan.md`
**Started:** 2026-03-09

---

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Railway Build Fix | ✅ Complete | See findings below |
| 2 — Backend Env Vars | ⬜ Not started | Map process.env.* vs Railway vars |
| 3 — Frontend Env Vars | ⬜ Not started | Map NEXT_PUBLIC_* vs Vercel vars |
| 4 — Supabase Config | ⬜ Not started | Redirect URLs, OAuth, site_url |
| 5 — Backend Code Audit | ⬜ Not started | CORS, auth, routes, error handling |
| 6 — Frontend Code Audit | ⬜ Not started | API URLs, socket, i18n, auth flow |
| 7 — Integration Verification | ⬜ Not started | End-to-end flow traces + deploy checklist |

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
