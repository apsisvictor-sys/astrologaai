# Step 11: Admin Dashboard — Todo

## Overview
Full admin dashboard: monitoring, user management, LLM cost control, prompt editing, model config, discount codes, referral links.
All date filters support: presets (Today / 7d / 30d / 90d) AND custom date range (startDate → endDate).

---

## Phase A — Backend: New DB Tables (Prisma migrations)

- [x] A1. Add `LlmUsage` table — daily aggregate for token/cost/latency stats
- [x] A2. Add `SystemPrompt` table — editable prompts with version history
- [x] A3. Add `AdminConfig` table — model string overrides per tier
- [x] A4. Add `DiscountCode` table — discount code management + Stripe coupon link
- [x] A5. Add `ReferralLink` + `ReferralConversion` tables — affiliate/referral tracking
- [x] A6. LLM service now yields real token counts from Vercel AI SDK `finish` chunk; chat-handler stores `{ inputTokens, outputTokens, totalTokens, latencyMs, model, tier }` in `ChatMessage.metadata`

## Phase B — Backend: Admin API Routes

All routes under `/api/v1/admin/*`, protected by `adminAuthMiddleware`.

- [x] B1. `GET /admin/overview` — total users, tier breakdown, new signups (with date range filter), MRR estimate, conversion rate
- [x] B2. `GET /admin/users` — paginated + searchable user list (email, tier, date range filter for joined date, query count, last active)
- [x] B3. `GET /admin/users/:id` — full user detail: subscription history, usage records, last 5 sessions
- [x] B4. `PATCH /admin/users/:id/tier` — manually set user tier (admin override, bypasses Stripe)
- [x] B5. `PATCH /admin/users/:id/suspend` — suspend / unsuspend account
- [x] B6. `GET /admin/usage` — token usage aggregates by day/tier/model, with date range, latency p50/p95/p99
- [x] B7. `GET /admin/revenue` — MRR, new subs, churn, billing period split (from Stripe API), date range
- [x] B8. `GET /admin/prompts` — list all system prompts (name, tier, isActive, version, updatedAt)
- [x] B9. `GET /admin/prompts/:id` — get full prompt content + version history (last 10)
- [x] B10. `PUT /admin/prompts/:id` — save new version + activate (replaces in-memory cache)
- [x] B11. `POST /admin/prompts/:id/restore/:version` — restore a previous version
- [x] B12. `GET /admin/config/models` — get current model per tier (DB overrides + env fallbacks)
- [x] B13. `PUT /admin/config/models` — save model override per tier to DB, hot-reload in LLM service
- [x] B14. `GET /admin/discounts` — list all discount codes with usage stats, date range filter for created/used
- [x] B15. `POST /admin/discounts` — create discount code + corresponding Stripe coupon
- [x] B16. `PATCH /admin/discounts/:id` — activate/deactivate code
- [x] B17. `GET /admin/referrals` — list referral links with clicks, conversions, commission earned
- [x] B18. `POST /admin/referrals` — create referral link with custom slug + commission rate
- [x] B19. `PATCH /admin/referrals/:id` — activate/deactivate link

## Phase C — Frontend: Admin App Route + Layout

- [x] C1. Create `src/app/[locale]/(admin)/layout.tsx` — admin shell: sidebar nav + top bar showing "Admin" badge + logged-in email
- [x] C2. Create `src/app/[locale]/(admin)/admin/page.tsx` — redirect to /admin/overview
- [x] C3. Admin route guard — redirect non-admin users to /dashboard

## Phase D — Frontend: Dashboard Pages

- [x] D1. Overview page (`/admin/overview`) — metric cards + signups sparkline + tier donut
- [x] D2. Users page (`/admin/users`) — searchable table with tier/status filter + date range
- [x] D3. User detail modal/page — subscription history, usage, last sessions
- [x] D4. Usage & Cost page (`/admin/usage`) — token charts, latency percentiles, cost by tier/model, date range
- [x] D5. Revenue page (`/admin/revenue`) — MRR chart, new subs vs churn, Stripe data, date range
- [x] D6. Prompt Editor page (`/admin/prompts`) — split panel: prompt list + Monaco-style editor + version history
- [x] D7. Model Config page (`/admin/config`) — tier rows with model string input + save button
- [x] D8. Discount Codes page (`/admin/discounts`) — table + create form modal
- [x] D9. Referral Links page (`/admin/referrals`) — table + create form modal

---

## New Prisma Tables — Schema

### LlmUsage
```
model LlmUsage {
  id            String   @id @default(uuid())
  date          DateTime @db.Date          // day bucket (date only, no time)
  tier          Tier
  model         String                     // "claude-haiku-4-5", "claude-sonnet-4-6", etc.
  requestCount  Int      @default(0)
  inputTokens   BigInt   @default(0)
  outputTokens  BigInt   @default(0)
  totalTokens   BigInt   @default(0)
  costUsdCents  Int      @default(0)       // stored as cents to avoid float issues
  p50LatencyMs  Int      @default(0)
  p95LatencyMs  Int      @default(0)
  p99LatencyMs  Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([date, tier, model])
  @@index([date])
  @@index([tier])
  @@map("llm_usage")
}
```

### SystemPrompt
```
model SystemPrompt {
  id        String   @id @default(uuid())
  name      String   @unique              // "master", "free_addon", "pro_addon", "premium_addon"
  label     String                        // Display name: "Master Prompt", "Free Tier Addon", etc.
  content   String   @db.Text
  isActive  Boolean  @default(true)
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  history   SystemPromptHistory[]

  @@map("system_prompts")
}

model SystemPromptHistory {
  id        String   @id @default(uuid())
  promptId  String
  prompt    SystemPrompt @relation(fields: [promptId], references: [id], onDelete: Cascade)
  content   String   @db.Text
  version   Int
  savedAt   DateTime @default(now())
  savedBy   String                        // admin email

  @@index([promptId])
  @@map("system_prompt_history")
}
```

### AdminConfig
```
model AdminConfig {
  id        String   @id @default(uuid())
  key       String   @unique              // "model_free", "model_pro", "model_premium"
  value     String
  updatedAt DateTime @updatedAt
  updatedBy String                        // admin email

  @@map("admin_config")
}
```

### DiscountCode
```
model DiscountCode {
  id              String    @id @default(uuid())
  code            String    @unique
  stripePromotionCodeId String? @map("stripe_promotion_code_id")  // Stripe coupon ID
  discountType    String    @default("percent")                   // "percent" | "amount"
  discountValue   Int                                              // % or cents
  appliesTo       String    @default("ALL")                        // "PRO" | "PREMIUM" | "ALL"
  maxUses         Int?      @map("max_uses")                       // null = unlimited
  usesCount       Int       @default(0) @map("uses_count")
  expiresAt       DateTime? @map("expires_at")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("discount_codes")
}
```

### ReferralLink
```
model ReferralLink {
  id              String    @id @default(uuid())
  slug            String    @unique
  label           String                     // "John's Blog", "Instagram Story", etc.
  commissionRate  Float     @default(0.2)    // 0.2 = 20%
  clicks          Int       @default(0)
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  conversions     ReferralConversion[]

  @@map("referral_links")
}

model ReferralConversion {
  id              String    @id @default(uuid())
  linkId          String    @map("link_id")
  link            ReferralLink @relation(fields: [linkId], references: [id])
  userId          String    @map("user_id")    // converted user
  tier            Tier                          // tier they converted to
  revenueUsdCents Int       @default(0) @map("revenue_usd_cents")
  commissionCents Int       @default(0) @map("commission_cents")
  convertedAt     DateTime  @default(now()) @map("converted_at")

  @@index([linkId])
  @@map("referral_conversions")
}
```

---

## Review

### Step 11 Complete ✓

**Phase A (DB Tables):** 7 new Prisma models created + migrated: `LlmUsage`, `SystemPrompt`, `SystemPromptHistory`, `AdminConfig`, `DiscountCode`, `ReferralLink`, `ReferralConversion`. Migration: `20260308100152_admin_tables`.

**Phase B (Backend API):** 19 endpoints under `/api/v1/admin/*`, all behind `authMiddleware` + `adminAuthMiddleware`. Real token counts (inputTokens/outputTokens/latencyMs) stored on every `ChatMessage` via Vercel AI SDK `finish` chunk.

**Phase C (Admin Shell):**
- `src/lib/admin-api.ts` — shared fetch wrapper (`adminGet/Post/Put/Patch`) + `checkIsAdmin()`
- `src/components/admin/admin-shell.tsx` — 8-item sidebar, ADMIN MODE topbar, auth guard (non-admin → /dashboard)
- `src/app/[locale]/(admin)/layout.tsx` + `admin/page.tsx` (redirect)

**Phase D (9 Dashboard Pages):**
- `/admin/overview` — metric cards, date presets, signups sparkline (recharts), tier breakdown, failed payments alert
- `/admin/users` — paginated + searchable table, tier/status filters, user detail modal (sessions + usage), inline tier set + suspend actions
- `/admin/usage` — token charts (recharts AreaChart), latency p50/p95/p99 bars, cost by tier table, top 10 heaviest users
- `/admin/revenue` — MRR/subscriber cards, health cards, billing period breakdown, Stripe not-configured banner
- `/admin/prompts` — split-panel: prompt list (left) + textarea editor + version history + restore (right)
- `/admin/config` — per-tier model string inputs, source badge (DB/ENV), quick-fill model chips, hot-reload save
- `/admin/discounts` — table with copy-to-clipboard codes, date filter, create modal (type/value/applies-to/expiry)
- `/admin/referrals` — table with full URL + copy, metric cards, create modal (slug/label/commission)

All TypeScript clean (`tsc --noEmit` passes 0 errors). All pages match Void Prism design system (Space Grotesk, `#0D0010` bg, `#e41aff` primary, `glass-panel` surfaces).
