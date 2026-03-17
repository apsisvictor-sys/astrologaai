# Product Audit Fix Plan — 2026-03-10
# AstroLogAI — Closing the Gap Between Built and Real

> **Workflow:** Each task below requires a PRODUCT DECISION before any code is written.
> Before implementing each task, Claude will surface the product question, present options, and wait
> for your answer. Only then does implementation begin.
>
> **Execution:** Use superpowers:subagent-driven-development for implementation tasks.

---

## Background

Full product audit surfaced 11 issues across two categories:
- **Fake/stub code** — things that look real but aren't (4 findings)
- **Built but unused** — features with no live connection (7 findings)

---

## Priority Tiers

```
🔴 CRITICAL  — Blocks correct admin operation or actively misleads users
🟠 HIGH      — Revenue/referral features built but not functioning end-to-end
🟡 MEDIUM    — UX promises features that don't exist; creates false expectations
⚪ LOW        — Schema/endpoint debt; harmless but worth cleaning up
```

---

## 🔴 TASK 1: Fix user suspension — admins cannot see suspended accounts

**Status:** `[x] DONE — Option B (proper migration). Migration 20260310181837 applied to Railway.`

### What's broken
The `PATCH /admin/users/:id/suspend` endpoint uses `bonusQueries: -999` as a suspension marker
(a comment in the code even acknowledges this is a hack):

```typescript
// We use bonusQueries = -999 as a suspended marker (simple flag without schema change)
data: { bonusQueries: suspended ? -999 : 0 }
```

But the `/admin/users` list filter has this:
```typescript
if (statusFilter === 'SUSPENDED') return false; // placeholder
```
And the formatted output hardcodes: `isSuspended: false`

**Result:** Admins can suspend a user but then cannot find them in the list.
Suspended users are permanently invisible to admins. Account moderation is completely blind.

### Product decision needed before implementation
> **Q: Should we keep the `bonusQueries: -999` hack or add a proper `isSuspended` boolean column?**
>
> Option A — **Quick fix (no migration):** Read `bonusQueries === -999` in the filter and map.
> Pro: 0 schema changes, 1 file edit, 5 minutes.
> Con: `bonusQueries` is semantically wrong for suspension.
>
> Option B — **Proper fix (migration):** Add `isSuspended Boolean @default(false)` to the User model.
> Update suspend endpoint to set this field. Update filter and map.
> Pro: Clean, semantically correct, easier to query.
> Con: Requires a Prisma migration deployed to Railway.
>
> **Recommendation:** Option B. We're pre-launch, migration cost is zero. The hack is confusing
> and would cause a future bug when we implement bonus queries for referrals.

### Files to change (once decision made)
- `prisma/schema.prisma` — add `isSuspended` field (Option B)
- `backend/src/routes/admin.ts:225` — fix filter logic
- `backend/src/routes/admin.ts:237` — fix `isSuspended` in map
- `backend/dist/routes/admin.js` — mirror

---

## 🟠 TASK 2: Discount codes — wire to Stripe checkout

**Status:** `[ ] pending discussion`

### What's built vs what's missing
**Admin tool (COMPLETE):**
- `POST /admin/discounts` — creates code in DB, also creates a Stripe coupon via `stripe.coupons.create()`
  and stores `stripePromotionCodeId`
- Admin UI at `/admin/discounts` shows all codes, create modal works

**User-facing flow (MISSING):**
- No UI element on the subscription/upgrade page to enter a code
- No API endpoint like `POST /api/v1/subscription/validate-code`
- Stripe checkout session is created without passing `discounts` or `promotion_code`

### Product decision needed before implementation
> **Q: How should discount codes work from the user's perspective?**
>
> Option A — **Stripe-native:** When user initiates checkout, they enter the code and we look up
> the `stripePromotionCodeId`, then pass it to `stripe.checkout.sessions.create({ discounts: [...] })`.
> Stripe handles validation, usage counting, and applying the discount.
> Pro: Stripe does all the math. Works correctly with Stripe billing portal.
> Con: Requires Stripe Promotion Code objects, not just Coupons. The current schema stores
> `stripePromotionCodeId` — this is the right field but needs to be created properly in Stripe.
>
> Option B — **Own validation:** User enters code → we validate against our DB (expiry, uses, tier) →
> apply a % discount to the Stripe price ID → create checkout session with discounted price.
> Pro: Full control, no Stripe setup needed.
> Con: More fragile, doesn't integrate with Stripe's billing portal, harder to reconcile.
>
> Option C — **Defer:** Remove the discount code section from admin UI entirely until we're ready
> to build the full flow. Less clutter in admin. Honest.
>
> **Recommendation:** Option A (Stripe-native), but only implement if you plan to use discount codes
> at launch. If you don't have a campaign planned yet, Option C is cleaner.
>
> **Questions for you:**
> 1. Do you have a launch promotion planned? (e.g. "first 100 users get 50% off")
> 2. Are these one-time use codes or reusable?

### Files to change (once decision made)
- `backend/src/routes/subscription.ts` — add `POST /subscription/validate-code` endpoint
- `frontend/src/app/[locale]/(app)/settings/subscription/page.tsx` — add code input to upgrade flow
- `backend/dist/routes/subscription.js` — mirror

---

## 🟠 TASK 3: Referral program — close the attribution loop

**Status:** `[ ] pending discussion`

### What's built vs what's missing
**Admin tool (COMPLETE):**
- `POST /admin/referrals` — creates referral link with slug and commission rate
- `GET /admin/referrals` — shows links with clicks, conversions, commission
- DB tables: `referral_links`, `referral_conversions` — fully designed

**What's missing (the entire user journey):**
1. **Click tracking** — no endpoint to increment `referral_links.clicks`
   when someone visits `https://astrologa.bg?ref=<slug>`
2. **Cookie persistence** — no code stores the `ref` param in a cookie/localStorage
   when a visitor lands with it
3. **Conversion recording** — no code creates a `ReferralConversion` record
   when a referred user registers + pays

### Product decision needed before implementation
> **Q: Who are your referral partners and how do you pay them?**
>
> This determines the complexity we need:
>
> Option A — **Simple affiliate tracking (recommended for now):**
> - Visitor lands on `/?ref=slug` → backend endpoint increments click counter + sets cookie
> - User registers → referral cookie is read and stored on the user (new DB field or localStorage)
> - User upgrades to paid → Stripe webhook `customer.subscription.created` creates `ReferralConversion`
> - Admin sees the report. Commission is paid manually (bank transfer, etc.)
> Pro: Fully working, simple, no third-party needed.
>
> Option B — **Defer commission tracking, just fix clicks:**
> - Only implement the click tracking redirect (`GET /r/:slug`)
> - Remove the "conversions" and "commission" columns from admin UI for now
> Pro: 1-hour job instead of 1-day job.
>
> **Questions for you:**
> 1. Are these referral links for influencers/partners (external people) or for your own marketing channels?
> 2. Do you need automated commission calculation or is manual review fine?
> 3. Are any referral links currently active and being shared?

### Files to change (once decision made)
- `backend/src/index.ts` — add `GET /r/:slug` click-tracking redirect
- `frontend/src/lib/auth-context.tsx` — read referral cookie on signUp
- `backend/src/routes/webhooks.ts` (Stripe webhook) — create ReferralConversion on subscription created
- Schema: possibly add `referredBy` field to User

---

## 🟡 TASK 4: Remove SMS/Push notification toggles from settings UI

**Status:** `[x] DONE — Option A. Removed Push and SMS ChannelCards from notifications/page.tsx.`

### What's happening
The notifications settings page (`/settings/notifications`) shows three channel toggles:
- ✅ Email (works — Resend is configured)
- ❌ Push notifications (toggle stored, never delivered — no FCM/service worker)
- ❌ SMS notifications (toggle stored, never delivered — no Twilio)

Users who toggle push or SMS on are never notified. The UX is lying.

### Product decision needed
> **Q: Timeline for push/SMS notifications?**
>
> Option A — **Hide now, show when ready:** Remove push and SMS toggles from the settings page.
> Keep the DB fields (no migration needed). When you're ready to implement delivery, add them back.
> User sees only Email preferences. Honest and clean.
>
> Option B — **Keep with "coming soon" badge:** Show the toggles but disabled with a
> "Coming soon" label. Sets expectation. Users know it's planned.
>
> Option C — **Keep as-is and implement push notifications now:**
> Firebase Cloud Messaging is ~2 days of work (service worker + subscription + sending).
> SMS (Twilio) is another 1-2 days.
>
> **Recommendation:** Option A (hide now) for pre-launch. Implement push notifications post-launch
> when you have real users requesting it.

### Files to change (once decision made)
- `frontend/src/app/[locale]/(app)/settings/notifications/page.tsx` — remove push/SMS toggles

---

## 🟡 TASK 5: Remove transit alerts from notification settings

**Status:** `[x] DONE — Option A. Removed transitAlerts from NotificationTypes interface, state, and config array in notifications/page.tsx.`

### What's happening
The notifications settings page includes a "Transit Alerts" toggle.
The backend notification preference controller has a `validTypes` array that does NOT include
`transitAlerts`. When the frontend tries to save this preference, it is silently ignored.

This is a frontend/backend mismatch that creates a non-functional setting.

### Product decision needed
> **Q: Is transit notification a feature you want to build soon?**
>
> Option A — **Remove from frontend now:** 1-line change. Clean.
>
> Option B — **Keep and fix the backend validation:** Add `transitAlerts` to the backend
> `validTypes` list. The preference gets saved — but still not delivered (see Task 4 re: delivery).
>
> **Recommendation:** Option A. There's no transit data engine yet (see Task 6).
> Don't surface it in settings until it's functional end-to-end.

### Files to change
- `frontend/src/app/[locale]/(app)/settings/notifications/page.tsx` — remove transit alerts row

---

## 🟡 TASK 6: Transits endpoint — implement or remove

**Status:** `[x] DONE — Full implementation. Real astrology-api.io data with in-house fallback. Pre-injected into Oracle system prompt. Active Transits page built at /transits.`

### What's happening
`GET /api/v1/forecasts/transits` exists and is authenticated, but returns:
```json
{ "message": "Transits endpoint - to be implemented with astrology-api.io integration" }
```

If anything in the frontend calls this (check if any page does), users see a stub message.

### Product decision needed
> **Q: Is real-time transit data part of your near-term roadmap?**
>
> **What transits are:** Current planetary positions relative to a user's natal chart.
> "Jupiter is transiting your 10th house — a career expansion period."
> This is one of the most valuable and engaging features in astrology apps.
>
> Option A — **Implement with astrology-api.io:** The API key is already configured.
> `astrology-api.io` has a `/transits` endpoint. We calculate using the user's natal chart + today's date.
> Estimated: 1-2 days of work.
>
> Option B — **Remove the endpoint:** If no UI calls it currently, just delete it.
> If UI calls it, remove the UI element too.
>
> Option C — **Implement in-house:** We already have `calculateNatalChart()` using Swiss Ephemeris
> via the existing astrology service. We could calculate transits ourselves without an external API.
>
> **Recommendation:** Option C (in-house) long-term, but Option B (remove) if not on the roadmap
> for the next sprint. Transits are a premium engagement feature — worth doing well, not rushed.
>
> **Question for you:** Is there currently any UI button/page that calls the transits endpoint?

### Files to change (once decision made)
- `backend/src/routes/forecasts.ts:198-215` — implement or remove

---

## ⚪ TASK 7: LlmUsage table — wire up for long-term dashboard performance

**Status:** `[ ] pending discussion`

### What's happening
The `llm_usage` table exists in the schema (pre-aggregated daily token usage by tier + model)
but nothing writes to it. The admin usage dashboard currently works fine by querying
`chat_messages.metadata` directly via raw SQL.

**The problem is scale:** As you get thousands of users and millions of messages, that raw SQL
query will get progressively slower. The `llm_usage` table was designed to solve this — aggregated
once per day, fast to query.

### Product decision needed
> **Q: Do you want to wire this up now or wait until query speed becomes an issue?**
>
> Option A — **Wire now:** After each streaming completion, `upsert` into `llm_usage`
> (increment request count, token counts, latency). One `UPSERT` per chat message, very cheap.
> Pro: Future-proof from day 1, admin dashboard stays fast at scale.
>
> Option B — **Defer:** The raw SQL works fine for < 100k messages. Monitor query speed.
> Add a `⚠ Note` in the codebase pointing to the table.
>
> **Recommendation:** Option A if you want to build things right. It's a small change
> (~20 lines in `llm.ts`). But not urgent before launch.

### Files to change (once decision made)
- `backend/src/services/llm.ts` — add upsert to `llm_usage` after each completion

---

## ⚪ TASK 8: Referral click tracking redirect

**Status:** `[ ] pending discussion`

### What's happening
`referral_links.clicks` is stored in the DB and shown in the admin dashboard, but the counter
is never incremented. All links show 0 clicks even if they're being used.

### Implementation (straightforward, no real product decision)
> A simple `GET /r/:slug` endpoint that:
> 1. Finds the referral link by slug
> 2. Increments `clicks` counter
> 3. Sets a referral cookie (for Task 3 attribution)
> 4. Redirects to `https://astrologa.bg?ref=<slug>`
>
> This is ~20 lines of code and makes the admin analytics accurate.
>
> **Note:** This depends on Task 3 (referral attribution) — they should be done together.

### Files to change
- `backend/src/index.ts` or a new `routes/referral.ts` — `GET /r/:slug`

---

## ⚪ TASK 9: Chart history — complete or remove

**Status:** `[ ] pending discussion`

### What's built vs what's missing
**Built (complete):**
- `ChartHistory` table in schema with full snapshot fields
- Backend controller function `getChartHistory` fully implemented
- Route `GET /api/v1/birth-data/:id/history` registered

**Missing:**
- **Archive trigger:** When user updates birth data, old chart should be saved to `chart_history`
  (the update endpoint doesn't call the archival logic)
- **Frontend UI:** No page or component to view past charts

### Product decision needed
> **Q: Is historical chart tracking a feature you want to offer?**
>
> This would let users say "show me how my chart looked when I used a different birth time."
> Useful for people refining their birth time (chart rectification).
>
> Option A — **Complete it:** Add archival trigger in birth data update + simple "Chart History"
> section in settings. ~1 day of work.
>
> Option B — **Remove it:** Delete the table, the controller function, and the route.
> Reduces maintenance surface. Can always rebuild if users ask for it.
>
> **Recommendation:** Option B for now. This is a niche feature. Remove the dead code,
> keep the schema clean. Revisit when users request it.

### Files to change (once decision made)
- If removing: `backend/src/controllers/birthDataController.ts`, route, schema migration

---

## Execution Order

Once product decisions are made per task, this is the recommended implementation order:

```
Sprint 1 (must-fix, pre-UAT):
  Task 1 — User suspension filter bug        🔴 ~30 min
  Task 4 — Hide SMS/Push toggles             🟡 ~15 min
  Task 5 — Remove transit alerts setting     🟡 ~5 min

Sprint 2 (complete the core loops):
  Task 3 — Referral click tracking (Task 8)  🟠 ~1 hour
  Task 6 — Transits endpoint decision        🟡 ~variable

Sprint 3 (revenue features):
  Task 2 — Discount code checkout            🟠 ~1 day
  Task 3 — Full referral attribution         🟠 ~1 day

Post-launch cleanup:
  Task 7 — LlmUsage wiring                   ⚪ ~2 hours
  Task 9 — Chart history decision            ⚪ ~variable
```

---

## How to proceed

**Before writing any code on any task:**
1. Claude surfaces the product question for that task
2. You answer with your decision
3. Claude writes the plan, you approve
4. Implementation begins

No code will be written on any task until you have explicitly confirmed the product direction.
