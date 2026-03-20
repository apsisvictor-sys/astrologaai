# AstroLogAI — Strategic Sprint Plan

> **Generated:** 2026-03-18 | **Author:** Opus strategic review
> **Context:** Post-audit, post-fix-sprint. App is live at astrologa.bg. Two major bug-fix sprints complete. Testing sections 7-16 still pending. This plan covers everything from launch-readiness hardening through post-launch growth features.

---

## 1. Strategic Evaluation

### Where I agree with the existing priorities

- **BUG-38 (refresh token rotation) and BUG-39 (session invalidation) are correctly rated HIGH.** These are not theoretical risks. A stolen refresh token currently grants 7 days of silent access with no revocation path. This is the single biggest security gap remaining. They must be Sprint 1.
- **BUG-45 (email verification) at MEDIUM is too low.** I am upgrading this to HIGH for launch. Without email verification, you have no proof of address ownership, no recovery path for typo'd emails, and a spam account vector. More importantly: you cannot send lifecycle emails (FEAT-05) to unverified addresses without destroying your Resend domain reputation. Email verification is a hard prerequisite for the entire email strategy.
- **FEAT-08 (analytics + error tracking) is correctly rated HIGH.** You are flying blind. Every product decision after launch should be data-driven. This must be early.
- **ENH-19 (pause instead of cancel) is correctly rated HIGH.** This is the highest-ROI retention feature available — a single modal + one Stripe API call saves 20-40% of cancellations. Industry proven.
- **FEAT-07 (annual billing) is correctly rated HIGH.** 2-3x LTV improvement per subscriber with minimal engineering. But it is blocked on Victor creating Stripe price IDs.

### Where I disagree and why

- **ENH-18 (shareable Big 3 card) is overrated for Sprint 1-2.** The roadmap rates it HIGH IMPACT, and it is — but for growth, not launch readiness. You need paying users before you need viral loops. Move to Sprint 4.
- **ENH-20 (Mercury Retrograde banners) is overrated for now.** The next Mercury retrograde starts 2026-04-09. If you can ship it by then, great. But it is cosmetic and the app has security holes. Move to Sprint 3 — still in time for the April retrograde.
- **ENH-21 (progressive profiling / birth time optional) is correctly HIGH but mis-categorised as an enhancement.** This is a conversion feature. Every user who abandons signup because they don't know their birth time is lost revenue. This should be Sprint 2.
- **ENH-15 (401 token refresh interceptor) is underrated at MEDIUM.** Every user who leaves the app idle for 16 minutes hits a silent 401 on their next action. This is a broken core experience. Upgrade to HIGH, Sprint 1.
- **ENH-05 (re-enable Redis) is underrated.** If Redis is not working in production, all caching is in-memory only — every Railway restart loses all cache, and you have no session invalidation. This is Sprint 1 infrastructure.
- **ENH-04 (wire LlmUsage table) at MEDIUM is correct but should pair with FEAT-08.** Without LlmUsage data, you cannot track cost per user, cost per tier, or cost per model. This is operational visibility. Pair with analytics.
- **FEAT-06 (Moon phase) is HIGH for engagement but not for launch.** It is the single best daily-open driver, but requires the `astronomia` package integration, a new service, dashboard widget, and Redis caching. Sprint 3 — after core stability.
- **ENH-10 (Oracle aspect rotation) is correctly HIGH but complex.** The post-session Haiku summarization job, cooldown table, and prompt injection are 3-5 days of work. Sprint 4.
- **ENH-22 (onboarding ceremony) is overrated for now.** Emotional polish is important but the existing form works. Ship the "birth time optional" fix first (ENH-21), then dress it up later.
- **FEAT-10 (credits system) and FEAT-14 (gift subscriptions) are premature.** You need subscribers first. Defer to post-launch.
- **FUTURE-07/08 (transit feed, major transit waiting room) are HIGH impact but require FUTURE-01 (transit engine) as a prerequisite.** These are post-launch features.
- **BUG-06 (polar latitude ASC discrepancy) affects ~0.1% of users.** Correctly deprioritised. Add the UI warning, defer the algorithm fix.

### The critical path to launch

The launch-critical path is:
1. Security holes closed (BUG-38, BUG-39, BUG-45, BUG-46)
2. Core UX not broken (ENH-15 token refresh, ENH-05 Redis)
3. You can see what's happening (FEAT-08 analytics, ENH-04 LlmUsage)
4. You can retain users who pay (ENH-19 pause, FEAT-07 annual billing)
5. You can convert free users (FEAT-05 email lifecycle, ENH-21 progressive profiling)
6. You can engage users daily (FEAT-06 moon phase, ENH-20 retrograde banners)
7. You can grow organically (ENH-18 share card, ENH-12 chat management)

Everything else is post-launch optimisation and new verticals.

---

## 2. Sprint Plan

---

### Sprint 1: "Lockdown" — Security + Core Stability
**Goal:** Close all security holes. Fix the broken token refresh flow. Re-enable Redis. Complete testing sections 7-16. After this sprint, the app is secure and stable enough to put real users on it.

**Rationale:** You cannot launch with stolen refresh tokens granting permanent access, password changes that don't invalidate sessions, and a 401 wall hitting every idle user. These are not edge cases — they are the core auth flow. Redis must be working for caching and session management to function. Testing sections 7-16 will surface any remaining bugs before real users hit them.

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| BUG-38 | Refresh token rotation with reuse detection | Medium (1-2 days) | DB migration + auth controller rewrite |
| BUG-39 | Session invalidation — Redis Set per user | Medium (1 day) | Pairs with BUG-38 (shared auth session infrastructure) |
| BUG-46 | OAuth users can't delete account | Small (2 hours) | Skip password check for OAuth-only users |
| BUG-55 | Subscription paidAt wrong timestamp | Small (30 min) | One-line fix in webhook handler |
| ENH-15 | 401 → automatic token refresh + retry interceptor | Medium (1-2 days) | Central `apiFetch` wrapper with queue |
| ENH-05 | Re-enable Redis in production | Small (2-4 hours) | Verify Upstash credentials, test connection |
| ENH-16 | Replace KEYS * with SCAN in Redis cleanup | Small (2 hours) | Pairs with BUG-39 (user session set makes this trivial) |
| BUG-24 | Admin query count mismatch | Small (2-3 hours) | Align counters + add clear column headers |
| Testing | Complete sections 7-16 of TESTING_CHECKLIST.md | Medium (1-2 days) | May surface new bugs — address inline |

**Dependencies:** None — this is Sprint 1.

**Estimated total effort:** 5-7 working days.

**Success criteria:**
- Refresh tokens rotate on every use; reuse triggers full invalidation
- Password change invalidates all sessions within seconds
- OAuth users can delete their accounts
- Every frontend API call auto-refreshes on 401 without user-visible interruption
- Redis is confirmed connected and caching in production (check via `/health/redis`)
- KEYS * scan replaced with SCAN + user session set
- Testing sections 7-16 complete with no unresolved CRITICAL/HIGH bugs

---

### Sprint 2: "Trust" — Email Verification + Conversion Foundation
**Goal:** Users must verify their email. Birth time becomes optional (more signups). Analytics and error tracking are live. You can see what users do and where they fail. After this sprint, you have a verified user base and data to make decisions.

**Rationale:** Email verification (BUG-45) is a hard prerequisite for the entire email strategy (FEAT-05, FEAT-03, FEAT-13). Without it, you cannot send lifecycle emails without risking your Resend domain reputation. Progressive profiling (ENH-21) removes the #1 signup barrier. Analytics (FEAT-08) must be live before any growth work — otherwise you cannot measure the impact of anything you build.

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| BUG-45 | Email verification flow | Medium (1-2 days) | Token generation, Resend email, verification route, 403 gate, resend endpoint |
| ENH-21 | Progressive profiling — birth time optional | Medium (1-2 days) | DB migration (`house_system` column), whole-sign fallback, UI checkbox, chart panel upgrade prompt |
| FEAT-08 | PostHog analytics + Sentry error tracking | Medium (1-2 days) | Sentry backend + frontend, PostHog frontend, 8 key events, env vars |
| ENH-04 | Wire LlmUsage table | Medium (1 day) | Write token counts after each stream; admin usage page shows real data |
| ENH-08 | Query policy transparency | Small (3-4 hours) | "3/day, resets at midnight" messaging in chat, settings, error messages |
| ENH-01 | Page transition animation | Small (1 hour) | `nextjs-toploader` install + one line in layout |
| BUG-06 | Polar latitude UI warning | Small (1 hour) | Show warning for births above 66N; defer algorithm fix |

**Dependencies:** Sprint 1 complete (security fixes + Redis).

**Estimated total effort:** 5-7 working days.

**Success criteria:**
- New registrations receive verification email; unverified users see 403 on Oracle with "verify your email" message
- Resend verification endpoint works
- Birth data form has "I don't know my exact birth time" option; chart renders correctly with whole-sign houses
- PostHog receiving events; signup-to-oracle-session funnel visible in dashboard
- Sentry catching backend 500s and frontend React errors
- LlmUsage table populated after every Oracle query; admin usage page shows real cost data
- Users see "3 queries/day, resets tomorrow" instead of confusing counters

---

### Sprint 3: "Retain" — Churn Prevention + Daily Engagement
**Goal:** Users who subscribe stay subscribed. The app gives users a reason to open it every day. After this sprint, you have the retention mechanics needed before spending money on acquisition.

**Rationale:** It is pointless to acquire users if they churn after month 1. Pause-instead-of-cancel (ENH-19) is the highest-ROI retention mechanic available. Annual billing (FEAT-07) eliminates 11 monthly churn decision points. Moon phase (FEAT-06) is the #1 daily engagement driver in every competitor. Mercury retrograde banners (ENH-20) drive daily opens during peak astrological moments. The email lifecycle (FEAT-05) converts inactive users. These belong together because they all serve retention/engagement and share infrastructure (email, transit data).

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| ENH-19 | Pause instead of cancel modal | Medium (1 day) | Stripe pause_collection API, webhook handler, paused state UI |
| FEAT-07 | Annual billing (20% discount) | Medium (1-2 days) | BLOCKED: Victor must create yearly Stripe price IDs first |
| FEAT-06 | Moon phase tracker | Medium (2-3 days) | `astronomia` integration, backend service, Redis cache, dashboard widget |
| ENH-20 | Mercury Retrograde + Eclipse banners | Medium (1-2 days) | Static event config, current-events route, `<CosmicEventBanner>` component. Must ship before 2026-04-09 retrograde. |
| FEAT-05 | Email lifecycle sequence (Day 0-30) | Large (3-5 days) | 6 email templates, lifecycle service, cron jobs, unsubscribe flow, personalisation |
| ENH-24 | Last session topic — Oracle memory cue | Medium (1-2 days) | Session summary column, background Haiku job, system prompt injection |

**Dependencies:** Sprint 2 complete (email verification live — required before sending lifecycle emails; PostHog live — required to measure retention impact). FEAT-07 blocked on Victor creating Stripe price IDs.

**Estimated total effort:** 8-12 working days.

**Success criteria:**
- Cancel flow shows pause offer; 2-step modal; paused subscriptions resume automatically via webhook
- Annual billing toggle on pricing page; checkout creates yearly subscription; "Save 20%" badge visible
- Dashboard shows current moon phase with sign, illumination, and user's house placement
- Mercury retrograde banner appears on dashboard/chat during retrograde window (test with upcoming 2026-04-09 retrograde)
- Day 0 welcome email fires on registration; Day 1/3/7/14/30 emails fire on schedule; one-click unsubscribe works
- Oracle references previous session topic naturally when starting a new conversation

---

### Sprint 4: "Polish" — Product Experience + Growth Mechanics
**Goal:** The app feels polished and premium. Users can share their charts (organic growth). Chat management matches ChatGPT-level UX. Newly upgraded users discover what they unlocked. After this sprint, the product is ready for a marketing push.

**Rationale:** Growth mechanics (shareable card, streaks) only make sense after retention is solved. The chat context menu (ENH-12) is the most visible UX gap compared to competitors. The "New for you" badge (ENH-11) directly increases feature adoption post-upgrade. The onboarding ceremony (ENH-22) increases emotional investment and completion rates. These are grouped because they are all frontend-heavy polish items that share no backend infrastructure with the earlier sprints.

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| ENH-18 | Shareable Big 3 card | Medium (2-3 days) | Backend share-card route, Vercel OG image, public share page, share modal in chart-panel |
| ENH-12 | Chat session 3-dot context menu | Medium (2-3 days) | DB migration (is_pinned, is_archived, shared_token), 6 backend endpoints, dropdown menu UI, search |
| ENH-11 | "New for you" badge on unlocked features | Small (3-4 hours) | `upgradedAt` check, pulsing badge component, welcome banner |
| ENH-22 | Onboarding ceremony redesign | Medium (1-2 days) | 3-step wrapper, Big 3 reveal screen, `onboarding_complete` flag |
| ENH-23 | Daily session streak | Medium (1-2 days) | `user_streaks` table, streakService, sidebar indicator, milestone celebrations |
| ENH-25 | In-app Oracle session rating | Medium (1 day) | `session_ratings` table, POST endpoint, star UI below Oracle messages, admin view |
| ENH-03 | House numeral display for narrow houses | Small (2-3 hours) | Angular midpoint calculation, skip < 3 degrees, reduce font < 20 degrees |
| ARCH-03 | Complete localStorage cleanup (pinned chats → DB, locale reads) | Small (2 hours) | Folded into ENH-12 (pinned chats) + quick fix for forecast locale reads |

**Dependencies:** Sprint 3 complete. ENH-22 depends on ENH-21 (birth time optional) from Sprint 2.

**Estimated total effort:** 8-12 working days.

**Success criteria:**
- Users can download/share a Big 3 card PNG; public share page shows card + CTA
- Chat sessions have pin, archive, rename, delete, share via context menu; search works
- Upgraded users see "New" badge on newly unlocked features for 7 days
- First-time birth data entry is a 3-step ceremony with Big 3 reveal
- Streaks tracked; sidebar shows current streak; milestones celebrated
- Oracle responses have star rating; ratings visible in admin
- No more `astrologaai_pinned_chats` or raw locale reads in localStorage

---

### Sprint 5: "Differentiate" — PREMIUM Value + Oracle Intelligence
**Goal:** PREMIUM tier has a clear, unmistakable value proposition. The Oracle feels intelligent and non-repetitive. After this sprint, the PRO-to-PREMIUM upgrade path is compelling and the Oracle is best-in-class.

**Rationale:** ENH-26 (PREMIUM value gap) and ENH-10 (aspect rotation) are the two items most likely to drive revenue per user. If PREMIUM users don't feel they're getting 2x the value, they'll downgrade. If the Oracle repeats itself, power users churn. These are grouped because they share Oracle system prompt work and tier-gating infrastructure. FEAT-09 (Solar Return) is the anchor PREMIUM exclusive. FEAT-04 (aspect grid) rounds out the chart analysis toolkit.

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| ENH-26 | Strengthen PRO → PREMIUM value gap | Small (3-4 hours) | Pricing page copy rewrite, Opus model for PREMIUM, unlimited partner profiles |
| ENH-10 | Oracle aspect rotation / anti-repetition (Phase 1) | Large (3-5 days) | `aspect_cooldowns` table, post-session Haiku job, cooldown rules, system prompt injection |
| FEAT-09 | Solar Return chart + annual report (PREMIUM) | Large (3-5 days) | astronomia Solar Return calculation, chart generation, Opus report, frontend page, birthday email trigger |
| FEAT-04 | Aspect Grid Matrix | Medium (1-2 days) | `<AspectGrid>` component, collapsible panel in chart-panel |
| FUTURE-06 | Dynamic chat suggested prompts | Medium (1-2 days) | Backend endpoint, Haiku-generated prompts, per-user-per-day Redis cache |

**Dependencies:** Sprint 4 complete. FEAT-09 requires `astronomia` integration from Sprint 3 (FEAT-06 Moon phase).

**Estimated total effort:** 8-12 working days.

**Success criteria:**
- PREMIUM uses Opus model; pricing page clearly communicates tier differences
- Oracle does not lead with the same aspect on consecutive sessions; cooldown table tracks aspect coverage
- PREMIUM users can generate Solar Return charts; annual report streams from Opus
- Aspect grid shows all planet-vs-planet aspects with standard symbols
- Chat empty state shows personalised, transit-aware suggested prompts

---

### Sprint 6: "Ecosystem" — Revenue Expansion + Feature Completion
**Goal:** Additional revenue streams (credits, gift subs). OAuth completion. Composite chart completes the relationship feature set. After this sprint, the app has a full monetisation toolkit.

**Rationale:** These are post-launch revenue expansion features. They are important but not launch-critical. Facebook OAuth (FEAT-02) is blocked on Victor. Credits (FEAT-10) and gifts (FEAT-14) open new buyer segments. Composite chart (FEAT-11) and the "Best Days" calendar (FEAT-12) are medium-impact features that round out the product. They are grouped because they all require Stripe integration work (credits, gifts, annual billing adjustments).

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| FEAT-02 | Facebook OAuth | Medium (1 day) | BLOCKED: Victor must create Facebook Dev App. Mirror Google handler. |
| FEAT-10 | Credits system + one-time purchases | Large (3-5 days) | `user_credits` + `credit_transactions` tables, Stripe one-time payment, spending logic, frontend purchase modal |
| FEAT-14 | Gift subscriptions | Large (3-5 days) | `gift_codes` table, Stripe one-time payment, gift email, redemption flow, `/gift` + `/redeem` pages |
| FEAT-11 | Composite chart (PREMIUM) | Medium (2-3 days) | Midpoint calculation, chart generation, Oracle interpretation, new tab in partner page |
| FEAT-12 | "Best Days" personal calendar | Large (3-5 days) | Transit-to-natal scoring algorithm, cron pre-generation, monthly calendar UI, side panel |
| FEAT-03 | Forecast email notifications | Medium (1-2 days) | Hook daily horoscope to NotificationPreference.emailEnabled via Resend |

**Dependencies:** Sprint 5 complete. FEAT-02 blocked on Victor. FEAT-10/14 require Stripe dashboard setup.

**Estimated total effort:** 12-18 working days.

**Success criteria:**
- Facebook login works alongside Google
- Users can buy credit packs; credits deducted for one-time reports
- Gift subscriptions purchasable; redemption codes work; gift email sends
- PREMIUM users can view composite charts for any partner
- "Best Days" calendar shows personalised daily scores by life area
- Opted-in users receive daily horoscope email via Resend

---

### Sprint 7: "Intelligence" — Oracle Memory + Transit Engine
**Goal:** The Oracle remembers past conversations. Personal transits drive proactive engagement. After this sprint, the Oracle is a fundamentally different product — one that knows you and reaches out to you.

**Rationale:** These are the competitive moat features. FUTURE-01 (transit engine) is the prerequisite for FUTURE-07 (transit feed), FUTURE-08 (major life transits), FUTURE-11 (lunar return), and the daily ritual briefing (FEAT-13). FUTURE-02 (long-term memory) is the single biggest differentiator from Co-Star/Sanctuary. ENH-10 Phase 1 (Sprint 5) feeds directly into FUTURE-02. These are grouped because they share pgvector infrastructure, background Haiku jobs, and system prompt injection patterns.

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| FUTURE-01 | Real-time Transit Prediction Engine | Large (5+ days) | `user_transit_forecasts` table, nightly cron, 6-month pre-calculation, 4-stage engagement arc |
| FUTURE-02 | Long-term Personal Memory (PGVector + RAG) | Large (5+ days) | pgvector extension, `user_memories` table, Haiku extraction job, embedding + similarity search, memory injection |
| FUTURE-07 | Personal transit feed (dashboard redesign) | Large (3-5 days) | Depends on FUTURE-01. Replace dashboard hero with transit feed. Top 5 active transits, pre-seeded Oracle CTAs. |
| FEAT-13 | Daily ritual morning briefing | Medium (2-3 days) | Email template, nightly cron pre-generation, opt-in setting, in-app alternative card |

**Dependencies:** Sprint 5+ complete. FUTURE-07 requires FUTURE-01. FUTURE-02 absorbs ENH-10 Phase 1 from Sprint 5.

**Estimated total effort:** 15-20 working days.

**Success criteria:**
- Transit predictions pre-calculated for all users 6 months ahead
- Oracle references specific past conversations naturally ("Last month you told me about your job interview...")
- Dashboard shows personalised transit feed as the primary content
- Opted-in users receive daily briefing email at their chosen time

---

### Sprint 8: "Depth" — Advanced Astrology + Niche Features
**Goal:** Advanced astrology features for power users. Major life transit experiences. Secondary progressions. Chiron deep-dive. After this sprint, the app serves both casual and serious astrology users.

**Rationale:** These are depth features that serve the enthusiast/practitioner segment. They are low urgency but high perceived value. They strengthen PREMIUM's value proposition and reduce churn among power users who would otherwise outgrow the app. Grouped because they all require `astronomia` calculations and Oracle prompt work.

**Items:**

| ID | Description | Effort | Notes |
|----|-------------|--------|-------|
| FUTURE-08 | Major life transit waiting room | Large (3-5 days) | Depends on FUTURE-01. Detection cron, special Oracle mode, dedicated entry point, proactive email |
| FUTURE-09 | Secondary progressions (Progressed Moon) | Medium (2-3 days) | Day-for-a-year calculation via astronomia, chart panel section, Oracle CTA |
| FUTURE-10 | Annual cosmic review (1-year anniversary) | Medium (2-3 days) | Nightly cron trigger, Opus-generated review, email + in-app delivery |
| FUTURE-11 | Lunar return chart | Medium (2-3 days) | Binary search for lunar return moment, chart generation, monthly notification |
| FUTURE-12 | Chiron placement deep-dive | Medium (1-2 days) | 144 pre-generated interpretations, chart panel card, Oracle CTA |
| FUTURE-13 | Planetary hours | Small (1 day) | Sunrise/sunset calculation, Chaldean order, collapsible card |

**Dependencies:** Sprint 7 complete (FUTURE-01 for transit-based features). FUTURE-08 requires FUTURE-01.

**Estimated total effort:** 12-16 working days.

**Success criteria:**
- Users approaching Saturn return receive proactive outreach 3 months early
- Progressed Moon sign/house visible in chart panel with sign-change timeline
- 1-year anniversary triggers personalised cosmic review
- Lunar return chart generated monthly for PRO/PREMIUM
- Chiron interpretation accessible from chart panel with Oracle deep-dive option
- Planetary hours displayed for current day with highlighted current hour

---

## 3. Implementation Plan Per Sprint

---

### Sprint 1 Implementation: "Lockdown"

#### BUG-38 — Refresh token rotation

**DB migration required:**
```sql
-- migrations/025_refresh_token_rotation.sql
ALTER TABLE users ADD COLUMN refresh_token_hash VARCHAR(128);
ALTER TABLE users ADD COLUMN refresh_token_family UUID;
ALTER TABLE users ADD COLUMN refresh_tokens_revoked_at TIMESTAMP;
```

**Files to modify:**
- `backend/src/controllers/authController.ts` — `refreshToken` handler:
  1. On login/registration: generate refresh token, store SHA-256 hash in `users.refresh_token_hash`, set `refresh_token_family` to a new UUID
  2. On refresh: compare presented token's SHA-256 to stored hash. If match: issue new refresh token, update hash, return new tokens. If no match but family matches: REUSE DETECTED — set `refresh_tokens_revoked_at = NOW()`, return 401 forcing re-login. If no match and no family match: return 401.
  3. On every auth check: if `refresh_tokens_revoked_at` is set and recent, reject all refresh attempts for this user

**Key code pattern:**
```typescript
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// In refreshToken handler:
const storedHash = user.refreshTokenHash;
const presentedHash = hashToken(presentedRefreshToken);

if (storedHash !== presentedHash) {
  // Token reuse detected — revoke everything
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: null, refreshTokensRevokedAt: new Date() }
  });
  return res.status(401).json({ error: 'Token reuse detected. All sessions revoked.' });
}

// Valid refresh — rotate
const newRefreshToken = crypto.randomBytes(32).toString('hex');
const newHash = hashToken(newRefreshToken);
await prisma.user.update({
  where: { id: user.id },
  data: { refreshTokenHash: newHash }
});
// Set new httpOnly cookie with newRefreshToken
```

**Testing:**
1. Login, note refresh token cookie. Refresh once — verify new cookie issued.
2. Use the OLD cookie manually via curl — verify 401 + all tokens revoked.
3. Login again — verify fresh flow works.

**Env vars:** None.

**Deployment:** Apply migration to Railway PostgreSQL before deploying code.

---

#### BUG-39 — Session invalidation via Redis Set

**Files to modify:**
- `backend/src/utils/redis.ts`:
  1. Add `addUserSession(userId, sessionId)` — calls `SADD user_sessions:${userId} ${sessionId}`
  2. Add `removeUserSession(userId, sessionId)` — calls `SREM`
  3. Rewrite `invalidateUserSessions(userId)` — calls `SMEMBERS user_sessions:${userId}`, then `DEL` each `chat_context:${sessionId}`, then `DEL user_sessions:${userId}`
  4. Remove the `KEYS *` scan from `clearUserSessionContexts`

- `backend/src/controllers/chatController.ts` — wherever a new chat session/context is created, call `addUserSession(userId, sessionId)`

- `backend/src/controllers/authController.ts` — in the `changePassword` handler, call `invalidateUserSessions(userId)` after password update

**Testing:**
1. Login, start a chat session. Change password. Verify the old session's context is deleted from Redis.
2. Login with new password. Verify new session works.

---

#### BUG-46 — OAuth account deletion

**Files to modify:**
- `backend/src/controllers/deleteAccountController.ts` — at the start of `deleteAccount`:

```typescript
// If OAuth-only user, skip password verification
const isOAuthOnly = !user.passwordHash || user.oauthProvider;
if (!isOAuthOnly) {
  // existing bcrypt.compare password check
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Incorrect password' });
}
// proceed with deletion
```

**Testing:** Register via Google OAuth. Go to settings. Delete account. Verify success without password prompt.

---

#### BUG-55 — paidAt timestamp fix

**Files to modify:**
- `backend/src/routes/subscription.ts` — in `invoice.payment_succeeded` handler, change:
```typescript
// Before:
paidAt: new Date(invoice.created * 1000)
// After:
paidAt: invoice.status_transitions?.paid_at
  ? new Date(invoice.status_transitions.paid_at * 1000)
  : new Date()
```

**Testing:** Trigger a test webhook from Stripe dashboard. Verify `paidAt` in DB matches actual payment time.

---

#### ENH-15 — Token refresh interceptor

**Files to create:**
- `frontend/src/lib/api-fetch.ts` — central fetch wrapper

**Key code pattern:**
```typescript
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: Error) => void }> = [];

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('astrologaai_access_token');
  const headers = { ...options.headers, Authorization: `Bearer ${token}` };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    if (isRefreshing) {
      // Queue this request
      const newToken = await new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      });
      headers.Authorization = `Bearer ${newToken}`;
      return fetch(url, { ...options, headers });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshSession(); // from auth-context
      isRefreshing = false;
      refreshQueue.forEach(q => q.resolve(newToken));
      refreshQueue = [];
      headers.Authorization = `Bearer ${newToken}`;
      return fetch(url, { ...options, headers });
    } catch (err) {
      isRefreshing = false;
      refreshQueue.forEach(q => q.reject(err as Error));
      refreshQueue = [];
      // Redirect to login
      window.location.href = '/login?reason=session_expired';
      throw err;
    }
  }

  return response;
}
```

**Files to modify:** Every file that currently calls `fetch()` with the access token must be updated to use `apiFetch()`. Search for `astrologaai_access_token` in frontend to find all call sites. Key files:
- `frontend/src/lib/auth-context.tsx`
- `frontend/src/components/chat/chat-context-ws.tsx`
- `frontend/src/app/[locale]/(app)/dashboard/page.tsx`
- `frontend/src/app/[locale]/(app)/settings/subscription/page.tsx`
- All other pages that fetch user data

**Testing:**
1. Login. Wait 16 minutes (or set `JWT_EXPIRES_IN=30s` temporarily). Perform an action. Verify automatic refresh — no error visible to user.
2. With expired refresh token: verify redirect to /login with toast message.

---

#### ENH-05 — Re-enable Redis in production

**Files to check:**
- `backend/src/utils/redis.ts` — verify the connection string handling supports `rediss://` (TLS) format for Upstash
- `backend/src/index.ts` — verify Redis initialization is attempted at startup

**Action items:**
1. Check Railway env vars — confirm `REDIS_URL` is set and in `rediss://` format
2. If not set: add the Upstash Redis URL from the Upstash dashboard
3. Test `/health/redis` endpoint after deploy
4. If connection fails: check if the Redis client needs `tls: { rejectUnauthorized: false }` for Upstash

**Env vars:** `REDIS_URL` (should already exist on Railway; verify format).

---

#### ENH-16 — Replace KEYS * with SCAN

**Files to modify:**
- `backend/src/utils/redis.ts` — `clearUserSessionContexts` function. With BUG-39's `user_sessions:${userId}` set in place, this becomes trivial:

```typescript
async function clearUserSessionContexts(userId: string): Promise<void> {
  const sessionIds = await redisClient.smembers(`user_sessions:${userId}`);
  if (sessionIds.length > 0) {
    const keys = sessionIds.map(id => `chat_context:${id}`);
    await redisClient.del(...keys);
  }
  await redisClient.del(`user_sessions:${userId}`);
}
```

No SCAN needed — the user session set eliminates the need for key scanning entirely.

---

#### BUG-24 — Admin query count mismatch

**Files to modify:**
- `backend/src/routes/admin.ts` — `/admin/users` endpoint:
  1. Identify which table the "query count" column reads from (likely `subscription.queriesUsedThisMonth`)
  2. Identify which table the "usage tab" reads from (likely `LlmUsage` cumulative)
  3. Add clear column headers: "Queries This Month" vs "Total Requests (All Time)"
  4. Verify both counts are mathematically correct

**Testing:** Compare admin users table count vs usage tab for the admin account. Both should show accurate numbers with clear labels.

---

### Sprint 2 Implementation: "Trust"

#### BUG-45 — Email verification

**DB migration required:**
```sql
-- migrations/026_email_verification.sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(64);
ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP;
-- Existing users are grandfathered as verified
UPDATE users SET email_verified = true WHERE id IS NOT NULL;
```

**Files to modify:**
- `backend/src/controllers/authController.ts` — `register` handler:
  ```typescript
  const verificationToken = crypto.randomBytes(32).toString('hex');
  // Store token + 24h expiry on user row
  // Send verification email via Resend
  ```

- `backend/src/routes/auth.ts` — add two new routes:
  ```typescript
  router.get('/verify-email', verifyEmailHandler);  // validates token, sets emailVerified = true
  router.post('/resend-verification', resendVerificationHandler);  // rate-limited, 1 per 2 minutes
  ```

- `backend/src/middleware/queryLimit.ts` — add email verification check:
  ```typescript
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email to start chatting.',
      messageBg: 'Моля, потвърдете имейла си, за да започнете чат.'
    });
  }
  ```

- `frontend/src/app/verify-email/page.tsx` — already exists (check if functional or stub). If stub: implement token extraction from URL params, call `GET /auth/verify-email?token=`, show success/error state.

**Files to create:**
- `backend/src/emails/verification.tsx` — React Email template for verification email (or plain HTML if React Email not set up)

**Env vars:** None new (Resend already integrated).

**Testing:**
1. Register new account. Check email. Click verification link. Verify `emailVerified = true` in DB.
2. Try to use Oracle before verification. Verify 403 with clear message.
3. Test resend endpoint. Verify rate limit (1 per 2 min).

---

#### ENH-21 — Progressive profiling (birth time optional)

**DB migration required:**
```sql
-- migrations/027_house_system.sql
ALTER TABLE birth_profiles ADD COLUMN house_system VARCHAR(20) DEFAULT 'placidus';
```

**Files to modify:**
- `frontend/src/components/birth-data/` — birth data form component:
  - Add "I don't know my exact birth time" checkbox
  - When checked: disable time input, set `birthTime: null` in submission
  - Show explanatory text about whole-sign houses

- `backend/src/controllers/birthDataController.ts` — handle null birth time:
  - Default to 12:00 noon for API call
  - Set `houseSystem: 'whole-sign'` in DB
  - Do NOT include house cusps in Oracle system prompt when `houseSystem === 'whole-sign'`

- `backend/src/services/llm-helpers.ts` — `buildSystemPrompt`:
  - When user's birth profile has `houseSystem = 'whole-sign'`: omit house placements from chart summary, add note: "Birth time unknown — house placements are approximate."

- `frontend/src/components/chart/chart-panel.tsx` — add upgrade prompt:
  - If `houseSystem === 'whole-sign'` and `birthTime === null`: show "Add your birth time to unlock exact Rising sign and house placements"

**Testing:**
1. Register, enter birth data WITHOUT time (check the checkbox). Verify chart generates with whole-sign houses.
2. Verify Oracle does not mention specific house placements.
3. Later add birth time — verify chart recalculates with Placidus.

---

#### FEAT-08 — PostHog + Sentry

**Backend files to modify:**
- `backend/src/index.ts` — add Sentry init before route registration:
  ```typescript
  import * as Sentry from '@sentry/node';
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  app.use(Sentry.Handlers.requestHandler());
  // ... all routes ...
  app.use(Sentry.Handlers.errorHandler());
  ```

**Frontend files to modify:**
- Run `npx @sentry/wizard@latest -i nextjs` (auto-configures)
- `frontend/src/app/[locale]/layout.tsx` — add PostHog init:
  ```typescript
  import posthog from 'posthog-js';
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, { api_host: 'https://eu.posthog.com' });
  }
  ```

**Key events to instrument (one `posthog.capture()` call each):**
- `frontend/src/lib/auth-context.tsx` — `signup_completed`, `login_completed`
- `frontend/src/components/birth-data/` — `birth_data_submitted`
- `frontend/src/components/chat/chat-context-ws.tsx` — `oracle_query_sent`
- `frontend/src/app/[locale]/pricing/page.tsx` — `upgrade_cta_clicked`, `checkout_started`
- `frontend/src/app/[locale]/(app)/settings/subscription/page.tsx` — `cancel_initiated`, `pause_accepted`

**Env vars to add:**
- Railway: `SENTRY_DSN`
- Vercel: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (for source maps)

**Packages:**
- Backend: `npm install @sentry/node`
- Frontend: `npm install @sentry/nextjs posthog-js`

**Testing:** Trigger a deliberate error → verify it appears in Sentry. Load a page → verify page view appears in PostHog.

---

#### ENH-04 — Wire LlmUsage table

**Files to modify:**
- `backend/src/controllers/chatController.ts` — after the LLM stream completes (in the `event: complete` handler or after `streamText` resolves):

```typescript
// After stream completes, write usage
await prisma.llmUsage.create({
  data: {
    userId: req.user.id,
    date: new Date(),
    tier: req.user.tier,
    model: selectedModel,
    inputTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    latencyMs: Date.now() - streamStartTime,
  }
});
```

Verify the `LlmUsage` Prisma model exists and matches the columns. If not, check `schema.prisma` and add the model.

**Testing:** Send an Oracle query. Check DB: `SELECT * FROM llm_usage ORDER BY date DESC LIMIT 1`. Verify tokens and latency populated. Check admin usage page — verify data appears.

---

#### ENH-08 — Query policy transparency

**Files to modify:**
- `frontend/src/components/chat/chat-window.tsx` — update the query counter tooltip: "3 queries per day. Resets tomorrow at midnight." instead of showing a date.
- `frontend/src/app/[locale]/(app)/settings/subscription/page.tsx` — update the subscription status display: "FREE plan: 3 Oracle sessions per day. Resets daily at midnight."
- `frontend/src/components/chat/chat-context-ws.tsx` — update the rate limit error message: "You've used your 3 free sessions for today. Resets tomorrow. Upgrade for unlimited access."

**Testing:** As a FREE user, verify all three locations show consistent "3/day, resets tomorrow" messaging.

---

#### ENH-01 — Page transition animation

**Package:** `npm install nextjs-toploader` in frontend directory.

**Files to modify:**
- `frontend/src/app/[locale]/layout.tsx`:
```tsx
import NextTopLoader from 'nextjs-toploader';
// Inside the layout return:
<NextTopLoader color="#e41aff" showSpinner={false} />
```

**Testing:** Navigate between pages. Verify purple loading bar animates at the top.

---

#### BUG-06 — Polar latitude warning

**Files to modify:**
- `frontend/src/components/chart/chart-panel.tsx` — after chart renders, check latitude:
```tsx
{Math.abs(birthProfile.latitude) > 66 && (
  <div className="text-amber-400 text-sm p-3 bg-amber-400/10 rounded-lg">
    For Arctic/Antarctic latitudes, Placidus house cusps may be approximate.
    The Whole Sign house system is recommended for births above 66 latitude.
  </div>
)}
```

---

### Sprint 3 Implementation: "Retain"

#### ENH-19 — Pause instead of cancel

**Files to modify:**
- `backend/src/routes/subscription.ts`:
  - Add `POST /subscription/pause` route:
    ```typescript
    router.post('/pause', authMiddleware, async (req, res) => {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { subscription: true } });
      const resumesAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
        pause_collection: { behavior: 'void', resumes_at: resumesAt }
      });
      await prisma.subscription.update({
        where: { userId: req.user.id },
        data: { status: 'paused', pausedUntil: new Date(resumesAt * 1000) }
      });
      res.json({ success: true, resumesAt: new Date(resumesAt * 1000) });
    });
    ```
  - Add `POST /subscription/resume` route (calls `stripe.subscriptions.update(subId, { pause_collection: '' })`)
  - In the webhook handler for `customer.subscription.updated`: detect when `pause_collection` becomes null → set subscription back to active

- `frontend/src/app/[locale]/(app)/settings/subscription/page.tsx`:
  - Replace cancel confirmation with 2-step modal:
    - Step 1: Pause offer ("Life gets busy. Pause for 1 month instead?")
    - "Pause for 1 month" (primary button) + "Cancel anyway" (secondary)
  - Add paused state display: "Status: Paused (resumes [date])" with "Resume now" button

**DB migration:** Check if `pausedUntil` column exists on `subscription` table. If not:
```sql
ALTER TABLE subscriptions ADD COLUMN paused_until TIMESTAMP;
```

**Testing:**
1. As a subscribed user, click cancel. Verify pause modal appears first.
2. Click "Pause for 1 month". Verify Stripe subscription is paused. Verify DB status = paused.
3. Verify subscription resumes after the pause period (test with Stripe CLI webhook forwarding).
4. Test "Resume now" button.

---

#### FEAT-07 — Annual billing

**BLOCKED:** Victor must create yearly Stripe price IDs first.

**Files to modify (after unblocked):**
- `backend/src/config/subscription-tiers.ts` — add `yearlyPriceId` and `yearlyPrice` fields
- `backend/src/routes/subscription.ts` — `create-checkout-session` accepts `billing: 'monthly' | 'yearly'`
- `frontend/src/app/[locale]/pricing/page.tsx` — add billing toggle switch, show yearly prices

**Env vars:** `STRIPE_PRO_PRICE_ID_YEARLY`, `STRIPE_PREMIUM_PRICE_ID_YEARLY`

---

#### FEAT-06 — Moon phase tracker

**Package:** `astronomia` is likely already installed (check `package.json`). If not: `npm install astronomia`

**Files to create:**
- `backend/src/services/moon-phase.ts`:
  ```typescript
  import { moonposition, moonphase } from 'astronomia';

  export interface MoonPhaseData {
    phase: string;        // 'New Moon' | 'Waxing Crescent' | ... | 'Waning Crescent'
    illumination: number; // 0-100
    sign: string;         // zodiac sign
    degree: number;       // degree within sign
    house?: number;       // natal house (if user authenticated)
    nextNewMoon: Date;
    nextFullMoon: Date;
    nextNewMoonDays: number;
    nextFullMoonDays: number;
  }

  export function getMoonPhase(userHouseCusps?: number[]): MoonPhaseData {
    // Calculate moon ecliptic longitude using astronomia
    // Convert to zodiac sign (longitude / 30)
    // Calculate phase from moon age
    // If houseCusps provided, determine which house the moon is transiting
    // Calculate next new/full moon dates
  }
  ```

**Files to modify:**
- `backend/src/routes/astrology.ts` — add `GET /astrology/moon-phase` route:
  - Auth optional. If authenticated, include house placement.
  - Redis cache: `moon_phase:${hour}` with 1-hour TTL (moon moves ~0.5 degrees/hour)
  - For authenticated users: `moon_phase:${userId}:${hour}` with 1-hour TTL

**Frontend files to create:**
- `frontend/src/components/astrology/moon-phase-widget.tsx` — compact card showing moon glyph (SVG with dynamic illumination clip-path), phase name, sign, house

**Files to modify:**
- `frontend/src/app/[locale]/(app)/dashboard/page.tsx` — add `<MoonPhaseWidget>` to dashboard

**Testing:**
1. Verify moon phase data against a reference site (e.g., timeanddate.com moon phase).
2. Verify house placement matches user's chart.
3. Verify Redis caching works (second request faster).

---

#### ENH-20 — Mercury Retrograde + Eclipse banners

**Files to create:**
- `backend/src/config/astrological-events.ts` — typed array of known events for 2026-2027 (Mercury retrogrades, eclipses, etc.)
- `frontend/src/components/astrology/cosmic-event-banner.tsx` — banner component

**Files to modify:**
- `backend/src/routes/astrology.ts` — add `GET /astrology/current-events` (auth optional). Filters events where now is between start and end dates.
- `frontend/src/app/[locale]/(app)/dashboard/page.tsx` — mount `<CosmicEventBanner>`
- `frontend/src/components/chat/chat-window.tsx` — mount `<CosmicEventBanner>` above chat

**Testing:** Manually set an event's dates to include today. Verify banner appears. Click "Ask the Oracle" — verify chat opens with pre-seeded question. Dismiss — verify it stays dismissed for that event.

---

#### FEAT-05 — Email lifecycle sequence

**Files to create:**
- `backend/src/services/email/lifecycle.ts` — `sendLifecycleEmail(userId, template, data)` function
- `backend/src/emails/welcome.tsx` (or `.html`) — Day 0 template
- `backend/src/emails/first-session-nudge.tsx` — Day 1 template
- `backend/src/emails/feature-discovery.tsx` — Day 3 template
- `backend/src/emails/transit-reengagement.tsx` — Day 7 template
- `backend/src/emails/upgrade-soft.tsx` — Day 14 template (FREE only)
- `backend/src/emails/upgrade-hard.tsx` — Day 30 template (FREE only)

**Files to modify:**
- `backend/src/routes/cron.ts` — add `emailLifecycleCron` job that runs daily:
  - Query users by `createdAt` bucket: Day 1, 3, 7, 14, 30
  - For each bucket: check eligibility (e.g., Day 1 only if no Oracle session yet)
  - Call `sendLifecycleEmail` with appropriate template
  - Track sent emails to avoid duplicates (add `lifecycle_emails_sent` JSON column on user, or a simple `email_log` table)

- `backend/src/routes/auth.ts` — add `GET /email/unsubscribe?token=` route:
  - Verify JWT token, set `NotificationPreference.emailEnabled = false`

**DB consideration:** Add tracking to avoid duplicate sends:
```sql
CREATE TABLE email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template VARCHAR(50),
  sent_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, template)
);
```

**Testing:**
1. Register a new account. Verify Day 0 welcome email arrives.
2. Manually trigger the cron for Day 1 bucket. Verify email sends (if no session).
3. Click unsubscribe in any email. Verify no further emails sent.

---

#### ENH-24 — Last session topic injection

**DB migration required:**
```sql
ALTER TABLE chat_sessions ADD COLUMN summary TEXT;
```

**Files to modify:**
- `backend/src/controllers/chatController.ts`:
  - In `startNewConversation`: after identifying the previous session, fire a background summarisation job (no await):
    ```typescript
    (async () => {
      const messages = await prisma.chatMessage.findMany({ where: { sessionId: prevSessionId }, orderBy: { createdAt: 'asc' }, take: 20 });
      if (messages.length < 2) return;
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const { text: summary } = await generateText({ model: haiku, prompt: `Summarise this astrology consultation in 1 sentence: ${text}` });
      await prisma.chatSession.update({ where: { id: prevSessionId }, data: { summary } });
    })();
    ```

- `backend/src/services/llm-helpers.ts` — in `buildSystemPrompt`:
  - Fetch user's last session with non-null summary
  - If found: append `"\n\nContext from your last session: ${summary}. You may reference this naturally if relevant, but do not force it."`

**Testing:** Have a conversation about career. Start a new session. Verify the Oracle's opening acknowledges the previous topic naturally (not always — only if relevant).

---

### Sprint 4 Implementation: "Polish"

#### ENH-18 — Shareable Big 3 card

**Files to create:**
- `backend/src/routes/user.ts` — add `GET /user/share-card` (auth required) returning `{ sunSign, moonSign, risingSign }` from birth chart
- `backend/src/routes/user.ts` — add `GET /user/share-card/public/:userId` (public, returns only sign names)
- `frontend/src/app/share/[userId]/page.tsx` — public share page with card + "Get your free reading" CTA
- `frontend/src/app/share/[userId]/opengraph-image.tsx` — Vercel OG image (1200x630 PNG) using `ImageResponse` from `next/og`

**Files to modify:**
- `frontend/src/components/chart/chart-panel.tsx` — add "Share my chart" button. Opens modal with card preview, download PNG, copy link.

---

#### ENH-12 — Chat session context menu

**DB migration:**
```sql
ALTER TABLE chat_sessions ADD COLUMN is_pinned BOOLEAN DEFAULT false;
ALTER TABLE chat_sessions ADD COLUMN is_archived BOOLEAN DEFAULT false;
ALTER TABLE chat_sessions ADD COLUMN shared_token VARCHAR(64) UNIQUE;
```

**Backend files to modify:**
- `backend/src/routes/chat.ts`:
  - `PATCH /sessions/:id` — extend to accept `isPinned`, `isArchived`, `title`
  - `POST /sessions/:id/share` — generate shared_token (nanoid 12), return shareUrl
  - `DELETE /sessions/:id/share` — revoke shared_token
  - `GET /sessions` — exclude archived by default; accept `?archived=true`

**Frontend files to modify:**
- `frontend/src/components/chat/chat-history-list.tsx` — replace hover pin button with 3-dot menu. Dropdown: Pin, Share, Rename, Delete (red), Archive. Inline rename input. Archive section at bottom.

---

#### ENH-11 — "New for you" badge

**Files to modify:**
- `frontend/src/components/shell/sidebar-nav.tsx` — for each nav item gated above user's previous tier:
  ```tsx
  {upgradedAt && (Date.now() - upgradedAt < 7 * 24 * 60 * 60 * 1000) && item.minTier === currentTier && (
    <span className="animate-pulse bg-[#e41aff] text-white text-xs px-1.5 py-0.5 rounded-full">New</span>
  )}
  ```

Check if `upgradedAt` is available on the user profile. If not, add it to the subscription status response.

---

#### ENH-22 — Onboarding ceremony

**Files to create:**
- `frontend/src/components/onboarding/onboarding-ceremony.tsx` — 3-step wrapper around existing birth data fields. Step 1: Date, Step 2: Time + unknown option (ENH-21), Step 3: Place. Loading transition. Big 3 reveal.

**DB migration (if needed):**
```sql
ALTER TABLE users ADD COLUMN onboarding_complete BOOLEAN DEFAULT false;
-- Existing users are grandfathered
UPDATE users SET onboarding_complete = true;
```

---

#### ENH-23 — Daily session streak

**DB migration:**
```sql
CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  streak_started_at TIMESTAMP DEFAULT NOW()
);
```

**Files to create:**
- `backend/src/services/streakService.ts` — `updateStreak(userId)` with day-comparison logic

**Files to modify:**
- `backend/src/controllers/chatController.ts` — call `streakService.updateStreak(userId)` on Oracle session start
- `backend/src/routes/user.ts` — add `GET /user/streak` endpoint
- `frontend/src/components/shell/sidebar.tsx` — add streak indicator at sidebar bottom

---

#### ENH-25 — In-app session rating

**DB migration:**
```sql
CREATE TABLE session_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_index INT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Files to modify:**
- `backend/src/routes/chat.ts` — add `POST /sessions/:id/rate`
- `frontend/src/components/chat/chat-window.tsx` — render 5 stars below Oracle response after `event: complete`. Auto-hide after 8 seconds.
- `backend/src/routes/admin.ts` — add average rating per day to admin usage tab

---

### Sprint 5 Implementation: "Differentiate"

#### ENH-26 — PREMIUM value gap

**Files to modify:**
- `backend/src/config/subscription-tiers.ts` — ensure `MODEL_PREMIUM` points to Opus
- `frontend/src/app/[locale]/pricing/page.tsx` — rewrite tier descriptions:
  - FREE: "Explore your chart"
  - PRO: "Unlock the full Oracle"
  - PREMIUM: "Your personal cosmic advisor"

---

#### ENH-10 — Oracle aspect rotation (Phase 1)

**DB migration:**
```sql
CREATE TABLE aspect_cooldowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  aspect_key VARCHAR(50),  -- e.g. 'sun_square_saturn'
  session_id UUID REFERENCES chat_sessions(id),
  depth_score INT CHECK (depth_score BETWEEN 1 AND 3),
  last_discussed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, aspect_key)
);
```

**Files to create:**
- `backend/src/services/aspect-cooldown.ts` — `getAspectCooldowns(userId)` returns active cooldowns; `updateAspectCooldowns(userId, sessionId, aspects)` writes post-session results

**Files to modify:**
- `backend/src/controllers/chatController.ts`:
  - After session end: fire background Haiku job to identify discussed aspects + depth scores
  - On new session start: query cooldowns, inject into system prompt

---

#### FEAT-09 — Solar Return chart

**Files to create:**
- `backend/src/services/solar-return.ts` — calculate Solar Return moment using `astronomia`
- `backend/src/controllers/solarReturnController.ts` — `GET /astrology/solar-return?year=2026` (PREMIUM only)
- `frontend/src/app/[locale]/(app)/chart/solar-return/page.tsx` — chart wheel + Oracle report

---

### Sprint 6-8: Implementation details follow the same pattern as above. The key implementation notes are already embedded in the roadmap entries.

---

## 4. What NOT to Build Yet (and Why)

### Explicitly Deferred

| Item | Why Defer |
|------|-----------|
| **FUTURE-03 — Astrocartography Map** | Requires Leaflet/Mapbox integration + custom astro line rendering. High engineering cost, niche use case. Build after core engagement loop is proven. |
| **FUTURE-04 — Multi-language expansion (RO, RS, GR)** | The Bulgarian translation is not even complete yet (DECISION-01: English first). Do not add languages until the English version is stable and you have data on which markets to target. |
| **FEAT-10 — Credits system** | Premature monetization complexity. You need subscribers before you need micro-transactions. Credits add a second payment rail, confuse the pricing story, and require Stripe one-time payment infrastructure. Build after you have 100+ paying subscribers and data showing demand for one-time purchases. |
| **FEAT-14 — Gift subscriptions** | Same reasoning as credits. The gifting infrastructure (redemption codes, gift emails, dedicated pages) is significant engineering for a feature whose demand is seasonal (Valentine's Day, birthdays). Build 4-6 weeks before Valentine's Day 2027. |
| **FEAT-02 — Facebook OAuth** | Blocked on Victor creating a Facebook Developer App. Low priority vs Google OAuth (already working). Facebook login adoption has declined significantly — most users prefer Google or email. Implement when Victor provides the credentials, but do not wait for it. |
| **BUG-12 — Sidebar i18n** | Deferred per DECISION-01 (English first). Not a launch blocker. |
| **ENH-17 — Subscription settings i18n** | Same as BUG-12. |
| **BUG-18 — TypeScript errors in agent-tools** | Non-blocking. Code works at runtime. AI SDK types are unstable. Fix when the SDK stabilizes. |
| **Discount codes → Stripe checkout** | Backend + admin UI exist but pricing strategy is TBD. Do not wire until Victor confirms discount structure (percentage vs fixed, which tiers, duration). |
| **Referral affiliate dashboard** | The referral tracking infrastructure exists, but a public-facing affiliate dashboard is premature. Build when you have enough affiliates to justify the UI. |
| **Cloudflare Turnstile on guest chat** | Bot protection is needed when abuse is detected, not before. Add when daily guest sessions exceed ~100 or when you see suspicious patterns in PostHog. |
| **Chart history UI** | Backend archives charts on every edit but there is no UI to browse historical charts. Low user demand. Decide whether to build a "chart timeline" or remove the archiving code to reduce DB bloat. |
| **FUTURE-03 — Astrocartography** | Maps integration is a large standalone project. The text-based relocation tool works. Defer until you have engagement data showing demand. |

### The "Not Yet" Principle

The single most important product discipline at this stage is **saying no to features that don't serve the current bottleneck.** Right now, the bottleneck is:

1. **Security** (Sprint 1) — can you trust the app with real user data?
2. **Stability** (Sprint 1-2) — does the core flow work without interruption?
3. **Visibility** (Sprint 2) — do you know what users are doing?
4. **Retention** (Sprint 3) — do paying users stay?
5. **Conversion** (Sprint 3) — do free users upgrade?
6. **Engagement** (Sprint 3-4) — do users come back daily?
7. **Growth** (Sprint 4+) — do users bring other users?

Every feature that does not directly serve the current bottleneck is a distraction. Build in this order, resist the temptation to skip ahead.

---

## Sprint Timeline (estimated, solo developer)

| Sprint | Name | Est. Duration | Cumulative |
|--------|------|---------------|------------|
| 1 | Lockdown | 5-7 days | Week 1-2 |
| 2 | Trust | 5-7 days | Week 2-3 |
| 3 | Retain | 8-12 days | Week 4-6 |
| 4 | Polish | 8-12 days | Week 6-8 |
| 5 | Differentiate | 8-12 days | Week 9-11 |
| 6 | Ecosystem | 12-18 days | Week 12-15 |
| 7 | Intelligence | 15-20 days | Week 16-20 |
| 8 | Depth | 12-16 days | Week 21-24 |

**Marketing push window:** After Sprint 3 or 4 (approximately week 6-8). The app is secure, stable, instrumented, has retention mechanics, and daily engagement hooks. That is the right moment to start spending on acquisition.

---

## Pending: Manual Actions Required (Victor)

| Action | Sprint | Unblocks |
|--------|--------|----------|
| Create yearly Stripe price IDs (`STRIPE_PRO_PRICE_ID_YEARLY`, `STRIPE_PREMIUM_PRICE_ID_YEARLY`) | Sprint 3 | FEAT-07 |
| Create Facebook Developer App (App ID + Secret) | Sprint 6 | FEAT-02 |
| Create Sentry project → get DSN | Sprint 2 | FEAT-08 |
| Create PostHog project → get key | Sprint 2 | FEAT-08 |
| Verify Upstash Redis credentials in Railway | Sprint 1 | ENH-05 |
| Decide on discount code strategy (% vs fixed, tiers, duration) | Deferred | Discount wiring |
