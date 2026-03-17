# AstroLogAI Fix Sprint — 2026-03-17

## Batch 1 — Architecture Foundation (do first, everything depends on it)
- [x] **ARCH-02 + ARCH-03** — Remove `astrologaai_user` from localStorage; make tier server-authoritative; short JWT expiry (15-30min); on-mount `/subscription/status` check. Fixes BUG-26 as side effect.

## Batch 2 — Quick Wins (1-3 lines each)
- [x] **BUG-25** — Admin Prompts Editor crash: change backend response to `res.json({ success: true, data: prompts })` (return array directly)
- [x] **BUG-33** — Location autocomplete small cities: change `types: '(cities)'` → `types: 'geocode'` in `geocoding.ts` line ~175
- [x] **BUG-29** — Add Dashboard as first nav item in `sidebar-nav.tsx`
- [x] **BUG-30** — Chat history empty on non-chat pages: add `isAuthenticated` to useEffect deps in `chat-history-list.tsx`
- [x] **BUG-32** — Chat history not scrollable: add `flex flex-col min-h-0` to parent wrapper in `sidebar.tsx`
- [x] **BUG-28** — Public nav auth awareness: add `useAuth` to `public-nav.tsx`, show Dashboard button for logged-in users, logo → /dashboard when authenticated

## Batch 3 — Core Chat Fixes
- [x] **BUG-21** — Chat bubble disappears after Oracle reply + text returns to input
- [x] **BUG-22** — Dashboard query counter not updating after queries used
- [x] **BUG-23** — Oracle greeting hardcoded Bulgarian (not language-aware)

## Batch 4 — Navigation + Subscription UX
- [x] **BUG-27** — Pricing page: fetch tier from `/subscription/status` instead of `/subscription/plans`
- [x] **ENH-06** — Add query counter to /chat page
- [x] **ENH-07** — Rate limit error → upgrade CTA

## Batch 5 — Enhancements
- [x] **ENH-09** — Oracle opening message dynamic + language-aware
- [x] **ENH-13** — Chat search: floating popover with match snippets + term highlighting
- [x] **ENH-14** — Location search lazy coordinate resolution (faster suggestions)

---

## Deploy Plan
- Accumulate all fixes → single batch deploy (Railway + Vercel)

---

## Review

### Session summary (2026-03-18)
All 22 items completed across 5 batches. Key changes:

**ARCH**: Removed `astrologaai_user` localStorage blob — auth is now server-authoritative via on-mount `/user/profile` fetch. JWT already 15min. BUG-26 fixed as side effect.

**Quick wins**: Admin Prompts Editor crash fixed (BUG-25), location autocomplete now finds small cities (BUG-33), Dashboard added to sidebar nav (BUG-29), chat history loads on all pages (BUG-30), chat history scroll fixed (BUG-32), public nav is auth-aware (BUG-28).

**Chat**: Oracle reply no longer causes text to re-appear in input (BUG-21 — respond-first, persist-after pattern). Dashboard query counter updates live (BUG-22). Oracle greeting is now language-aware and dynamic — 5 random variants per language (BUG-23 + ENH-09).

**Subscription**: Pricing page now fetches real tier from `/subscription/status` (BUG-27). FREE tier changed to 3 queries/day (no monthly cap). PRO/PREMIUM remain unlimited. Query counter in /chat (ENH-06). Rate limit 429 now shows upgrade banner (ENH-07). Pricing page shows "3/day" for FREE, "Unlimited" for PRO.

**Enhancements**: Chat search with floating popover — 360px wide, opens to the right of sidebar, content snippets with matched term bolded (ENH-13). Location autocomplete now resolves all 5 predictions in parallel (~5× faster on cold cache) (ENH-14).

### Deploy
- All changes accumulated — ready for single batch deploy to Railway (backend) + Vercel (frontend)
