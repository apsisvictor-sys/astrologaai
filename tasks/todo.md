# Sprint 5 — Token Limits + Streaks

## System 1: Token-Based Daily Limit (FREE tier)

### Architecture summary
- Pre-stream: check Redis `tokens:daily:{userId}:{YYYY-MM-DD}` — if >= limit → 429 (block new messages)
- Post-stream: INCR Redis key by approxOutput tokens, set 26h TTL on first write
- If new total > limit → include `dailyLimitReached: true` in `complete` SSE event
- Frontend: on `complete` with `dailyLimitReached: true` → show inline upgrade banner after message
- Admin accounts (`ADMIN_EMAILS` env var) → bypass all limits
- Limit value stored in AdminConfig table: key `free_tier_daily_token_limit`, default 1500

### Backend tasks

- [x] **B1** `admin-defaults.ts` — add seed `free_tier_daily_token_limit: '1500'`
- [x] **B2** `queryLimit.ts` — rewritten: token-based Redis check for FREE, admin bypass, burst for PRO/PREMIUM
- [x] **B3** `chatController.ts` — post-stream INCR + `dailyLimitReached` in complete SSE event
- [x] **B4** `routes/admin.ts` — GET/PUT `/admin/config/free-tier-limits`
- [x] **B5** `routes/subscription.ts` — query count fields stripped from status response

### Frontend tasks

- [x] **F1** `chat-context-ws.tsx` — `dailyLimitReached` state, SSE handler, 429 handler
- [x] **F2** `chat-window.tsx` — query counter removed, DailyLimitBanner added, input disabled on limit
- [x] **F3** `dashboard/page.tsx` — `queriesRemaining` removed, replaced with Oracle access copy
- [x] **F4** `settings/subscription/page.tsx` — query display replaced with Oracle access text
- [x] **F5** `pricing/page.tsx` — "Limited/Unlimited cosmic intelligence from the Oracle"
- [x] **F6** `admin/config/page.tsx` — "Free Tier Limits" section with token limit field + save
- [x] **F7** `admin/users/page.tsx` — "Queries (legacy)" column label

---

## System 2: Daily Streak + Rewards (ENH-23)

### Architecture summary
- Any Oracle message sent = streak day counted
- 7-day streak → 48h PRO trial (set subscription tier = PRO, trialExpiresAt = now + 48h)
- On login: check + revert expired trials
- Existing tier gating handles feature access automatically

### Backend tasks

- [x] **B6** `prisma/schema.prisma` — `UserStreak` model added + `db:sync` run (deployed to Railway DB)
- [x] **B7** `services/streakService.ts` — new service: updateStreak, grantProTrial, checkTrialExpiry, revertExpiredTrials, getStreakInfo
- [x] **B8** `chatController.ts` — `updateStreak(userId)` called in background block after Oracle message
- [x] **B9** `routes/user.ts` — `GET /api/v1/user/streak` endpoint added
- [x] **B10** `authController.ts` — `checkTrialExpiry(userId)` called on login
- [x] **B11** `routes/cron.ts` — `POST /api/v1/cron/streak-maintenance` for daily trial reversion

### Frontend tasks

- [x] **F8** `components/shell/streak-indicator.tsx` — new component: shows streak badge + milestone toast
- [x] **F9** `components/shell/sidebar.tsx` — `<StreakIndicator />` added between nav and user card

---

## System 3: Railway Cron Setup

### Tasks

- [x] **C1** `routes/cron.ts` — fix `streak-maintenance` to use CRON_SECRET (not adminAuthMiddleware)
- [x] **C2** `services/transits.ts` — export `warmDailyTransitsCache()` function
- [x] **C3** `routes/cron.ts` — add `POST /api/v1/cron/daily-transits` endpoint (pre-warms planetary positions)
- [x] **C4** `routes/cron.ts` — add `POST /api/v1/cron/daily-forecasts` endpoint (runs nightly forecast job)

---
