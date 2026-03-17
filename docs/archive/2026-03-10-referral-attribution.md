# Referral Attribution & Dual-Sided Incentive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the full referral loop: click tracking → user attribution at registration → auto-apply referral discount at checkout → record conversion in Stripe webhook → show per-tier stats in admin dashboard.

**Architecture:** A referral link like `/r/john-blog` on the backend increments click counter then redirects to `https://astrologa.bg?ref=john-blog`. The frontend stores `?ref=` in localStorage on any page load. At registration the slug is sent to the backend and saved on the User. At checkout, if the user's referral link has an optional discount code, it is applied to the Stripe checkout session. After payment, the Stripe webhook creates a `ReferralConversion` record. The admin dashboard shows per-tier conversion breakdowns and the create modal gains a discount code field.

**Tech Stack:** Prisma (schema + migrations), Express (backend routes), TypeScript (backend source), JavaScript (dist — compiled manually), Next.js (frontend)

**CRITICAL — No TypeScript compiler:** NEVER run `tsc` — it crashes with OOM. After editing any `.ts` file in `backend/src/`, you MUST also manually edit the matching `.js` file in `backend/dist/` to keep them in sync. Railway runs the dist files.

**Relevant files:**
- Schema: `prisma/schema.prisma`
- Backend source: `backend/src/controllers/authController.ts`, `backend/src/routes/subscription.ts`, `backend/src/routes/admin.ts`, `backend/src/index.ts`
- Backend dist (mirror of source): `backend/dist/controllers/authController.js`, `backend/dist/routes/subscription.js`, `backend/dist/routes/admin.js`, `backend/dist/index.js`
- Frontend: `frontend/src/app/[locale]/layout.tsx` (or nearest root layout), `frontend/src/app/[locale]/(admin)/admin/referrals/page.tsx`

---

## Task 1: Schema migration — add referral fields

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add `referredBySlug` to User model**

In `prisma/schema.prisma`, find the `User` model. After the `isSuspended` line (around line 36), add:

```prisma
  referredBySlug    String?   @map("referred_by_slug")  // slug of the ReferralLink that referred this user
```

**Step 2: Add `discountCode` to ReferralLink model**

In `prisma/schema.prisma`, find the `ReferralLink` model. After the `isActive` line, add:

```prisma
  discountCode      String?   @map("discount_code")  // optional DiscountCode.code to auto-apply at checkout
```

The ReferralLink model should look like:

```prisma
model ReferralLink {
  id             String    @id @default(uuid())
  slug           String    @unique
  label          String
  commissionRate Float     @default(0.2) @map("commission_rate")
  clicks         Int       @default(0)
  isActive       Boolean   @default(true) @map("is_active")
  discountCode   String?   @map("discount_code")
  createdAt      DateTime  @default(now()) @map("created_at")
  conversions    ReferralConversion[]
  @@map("referral_links")
}
```

**Step 3: Run migration locally**

```bash
cd /home/victor/.openclaw/workspace/astrologaai
npx prisma migrate dev --name add_referral_attribution
```

Expected: Migration file created in `prisma/migrations/`. Prisma client regenerated automatically.

**Step 4: Deploy migration to Railway production**

```bash
DATABASE_URL="postgresql://postgres:TpZWGXvKYPqGxnUQCWPLiJxAJCLiIyAg@yamabiko.proxy.rlwy.net:11442/railway" npx prisma migrate deploy
```

Expected output: `1 migration applied.` (or similar)

**Step 5: Commit**

```bash
cd /home/victor/.openclaw/workspace/astrologaai
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add referredBySlug to User and discountCode to ReferralLink"
```

---

## Task 2: Click tracking redirect endpoint

**Files:**
- Modify: `backend/src/index.ts` (add GET /r/:slug)
- Modify: `backend/dist/index.js` (mirror)

**Step 1: Add prisma import to index.ts**

At the top of `backend/src/index.ts`, check if `prisma` is already imported. It is NOT currently imported at the module level (it's only used inline inside some health routes). Add this import near the other imports (around line 33, after the other imports):

```typescript
import { prisma } from './utils/prisma';
```

**Step 2: Add the /r/:slug endpoint in index.ts**

Find this block in `backend/src/index.ts` (around line 102):
```typescript
// Health check endpoint
app.get('/health', ...
```

ADD the following BEFORE the health check block (so it's before any API routes):

```typescript
// GET /r/:slug — Referral click tracking redirect
// Increments click counter and redirects to frontend with ?ref= param
app.get('/r/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    await prisma.referralLink.update({
      where: { slug, isActive: true },
      data: { clicks: { increment: 1 } },
    });
  } catch (_err) {
    // Slug not found or inactive — still redirect gracefully
  }
  const frontendUrl = process.env.FRONTEND_URL || 'https://astrologa.bg';
  res.redirect(302, `${frontendUrl}?ref=${encodeURIComponent(slug)}`);
});
```

**Step 3: Mirror the change to backend/dist/index.js**

Open `backend/dist/index.js`. Add the prisma require near the top (find where other requires/imports are at the top):

```javascript
const { prisma } = require('./utils/prisma');
```

Then add the `/r/:slug` route in the same position (before the health check):

```javascript
// GET /r/:slug — Referral click tracking redirect
app.get('/r/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    await prisma.referralLink.update({
      where: { slug, isActive: true },
      data: { clicks: { increment: 1 } },
    });
  } catch (_err) {
    // Slug not found or inactive — still redirect
  }
  const frontendUrl = process.env.FRONTEND_URL || 'https://astrologa.bg';
  res.redirect(302, `${frontendUrl}?ref=${encodeURIComponent(slug)}`);
});
```

**Step 4: Update admin referrals page — change buildRefUrl to use /r/ endpoint**

In `frontend/src/app/[locale]/(admin)/admin/referrals/page.tsx`, find:

```typescript
const BASE_URL = 'https://astrologaai.com';

function buildRefUrl(slug: string): string {
  return `${BASE_URL}?ref=${slug}`;
}
```

Change to:

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

function buildRefUrl(slug: string): string {
  return `${BACKEND_URL}/r/${slug}`;
}
```

**Step 5: Verify locally**

Start the backend: `cd /home/victor/.openclaw/workspace/astrologaai/backend && node dist/index.js`

Test with curl (use any existing slug from the DB, or create one first):
```bash
curl -I http://localhost:4000/r/test-slug
```
Expected: HTTP 302 redirect to `http://localhost:3003?ref=test-slug` (or frontend URL)

**Step 6: Commit**

```bash
git add backend/src/index.ts backend/dist/index.js frontend/src/app/\[locale\]/\(admin\)/admin/referrals/page.tsx
git commit -m "feat: add GET /r/:slug click tracking redirect"
```

---

## Task 3: Frontend — store referral slug on page load

**Files:**
- Modify: `frontend/src/app/[locale]/layout.tsx` (root layout)

**Step 1: Find the root layout**

Open `frontend/src/app/[locale]/layout.tsx`. This is the root layout wrapping all pages.

**Step 2: Create a ReferralCapture client component inline**

In the layout file, add a new small client component at the top of the file (before the default export):

```typescript
'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function ReferralCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referral_slug', ref);
    }
  }, [searchParams]);
  return null;
}
```

**Step 3: Use ReferralCapture inside the layout**

Inside the layout's JSX (somewhere inside `<body>` or near the root `<Suspense>`), add:

```tsx
<Suspense fallback={null}>
  <ReferralCapture />
</Suspense>
```

Import `Suspense` from React if not already imported (`import { Suspense } from 'react'`).

**Important:** `useSearchParams()` in Next.js requires `<Suspense>` wrapper in the parent layout to avoid a build error. The component must be wrapped.

**Step 4: Commit**

```bash
git add frontend/src/app/\[locale\]/layout.tsx
git commit -m "feat: capture ?ref= referral slug to localStorage on page load"
```

---

## Task 4: Registration — save referral slug on the user

**Files:**
- Modify: `backend/src/controllers/authController.ts`
- Modify: `backend/dist/controllers/authController.js` (mirror)

**Step 1: Read referralSlug in the register function**

In `backend/src/controllers/authController.ts`, find the `register` function (line 76). Inside it, find this line:

```typescript
const { email, password, fullName, language: bodyLanguage } = validationResult.data as RegisterInput & { language?: string };
```

Change to:

```typescript
const { email, password, fullName, language: bodyLanguage, referralSlug } = validationResult.data as RegisterInput & { language?: string; referralSlug?: string };
```

**Step 2: Save referredBySlug on user creation**

Find the `prisma.user.create` call (line 121). In the `data` block, add after `emailVerified: false`:

```typescript
referredBySlug: referralSlug || null,
```

So the user create data block looks like:
```typescript
data: {
  email,
  passwordHash,
  fullName: fullName || null,
  tier: Tier.FREE,
  language: detectedLanguage,
  emailVerified: false,
  referredBySlug: referralSlug || null,
  profile: { create: { ... } },
  ...
}
```

**Step 3: Mirror to dist file**

In `backend/dist/controllers/authController.js`, apply the same two changes:
1. Destructure `referralSlug` from `validationResult.data`
2. Add `referredBySlug: referralSlug || null` to the `prisma.user.create` data block

**Step 4: Send referralSlug from the frontend registration form**

Find the frontend registration form. It is likely at `frontend/src/app/[locale]/register/page.tsx` or `frontend/src/app/[locale]/(auth)/register/page.tsx` or similar.

Locate the `fetch` call that POSTs to `/api/v1/auth/register`. In the request body, add:

```typescript
const referralSlug = localStorage.getItem('referral_slug') || undefined;
// ... in the fetch body:
body: JSON.stringify({
  email,
  password,
  fullName,
  language,
  referralSlug,  // ADD THIS
}),
```

After successful registration, clear the stored slug:
```typescript
localStorage.removeItem('referral_slug');
```

**Step 5: Commit**

```bash
git add backend/src/controllers/authController.ts backend/dist/controllers/authController.js
# Also add the frontend register page
git commit -m "feat: capture referralSlug at registration and save to user.referredBySlug"
```

---

## Task 5: Stripe checkout — auto-apply referral discount code

**Files:**
- Modify: `backend/src/routes/subscription.ts` (POST /checkout)
- Modify: `backend/dist/routes/subscription.js` (mirror)

**Step 1: Add referral discount lookup before checkout session creation**

In `backend/src/routes/subscription.ts`, find the `POST /checkout` handler (line 288).

Find the `const user = await prisma.user.findUnique(...)` call (around line 315). Change the select to also fetch `referredBySlug`:

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { email: true, fullName: true, referredBySlug: true },
});
```

**Step 2: Resolve optional discount from referral**

After the `customerId` resolution block and before the `stripe.checkout.sessions.create()` call, add:

```typescript
// Resolve optional discount from referral link
let discounts: { promotion_code: string }[] | undefined;
if (user?.referredBySlug) {
  try {
    const referralLink = await prisma.referralLink.findUnique({
      where: { slug: user.referredBySlug, isActive: true },
      select: { discountCode: true },
    });
    if (referralLink?.discountCode) {
      const dc = await prisma.discountCode.findUnique({
        where: { code: referralLink.discountCode, isActive: true },
        select: { stripePromotionCodeId: true },
      });
      if (dc?.stripePromotionCodeId) {
        discounts = [{ promotion_code: dc.stripePromotionCodeId }];
      }
    }
  } catch (err) {
    console.warn('[Checkout] Failed to resolve referral discount:', err);
  }
}
```

**Step 3: Pass discounts to stripe.checkout.sessions.create()**

Find the existing `stripe.checkout.sessions.create({...})` call (around line 370). Add `discounts` to the session options:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  ...(discounts ? { discounts } : {}),  // ADD THIS
  success_url: `...`,
  cancel_url: `...`,
  metadata: { userId, tier, billingPeriod },
});
```

**Note:** Stripe does not allow `allow_promotion_codes` and `discounts` to coexist. Since we're setting `discounts` programmatically, do NOT add `allow_promotion_codes: true`.

**Step 4: Mirror to dist/routes/subscription.js**

Apply the same three changes to `backend/dist/routes/subscription.js`:
1. Add `referredBySlug: true` to the user findUnique select
2. Add the discount resolution block
3. Add `...(discounts ? { discounts } : {})` to the checkout session

**Step 5: Commit**

```bash
git add backend/src/routes/subscription.ts backend/dist/routes/subscription.js
git commit -m "feat: auto-apply referral discount code at Stripe checkout"
```

---

## Task 6: Stripe webhook — record ReferralConversion on payment

**Files:**
- Modify: `backend/src/routes/subscription.ts` (webhook handler)
- Modify: `backend/dist/routes/subscription.js` (mirror)

**Step 1: Add ReferralConversion creation in checkout.session.completed handler**

In `backend/src/routes/subscription.ts`, find the `checkout.session.completed` handler (around line 826).

After the `await prisma.user.update(...)` call (line 860), ADD:

```typescript
// Record referral conversion if this user was referred
try {
  const referredUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredBySlug: true },
  });
  if (referredUser?.referredBySlug) {
    const referralLink = await prisma.referralLink.findUnique({
      where: { slug: referredUser.referredBySlug },
      select: { id: true, commissionRate: true },
    });
    if (referralLink) {
      // Get amount from session (in smallest currency unit, e.g. cents)
      const amountTotal = (session as any).amount_total ?? 0;
      const commissionCents = Math.round(amountTotal * referralLink.commissionRate);
      await prisma.referralConversion.create({
        data: {
          linkId: referralLink.id,
          userId,
          tier: tier as any,
          revenueEurCents: amountTotal,
          commissionCents,
        },
      });
      console.log(`[Webhook] ReferralConversion created for user ${userId} via slug ${referredUser.referredBySlug}`);
    }
  }
} catch (err) {
  console.error('[Webhook] Failed to record referral conversion:', err);
  // Non-fatal — don't fail the webhook
}
```

**Step 2: Mirror to dist/routes/subscription.js**

Apply the same block to the `checkout.session.completed` handler in `backend/dist/routes/subscription.js`.

**Step 3: Commit**

```bash
git add backend/src/routes/subscription.ts backend/dist/routes/subscription.js
git commit -m "feat: create ReferralConversion in Stripe webhook on checkout.session.completed"
```

---

## Task 7: Admin dashboard — per-tier stats, discountCode field, fix bugs

**Files:**
- Modify: `backend/src/routes/admin.ts` (GET and POST /admin/referrals)
- Modify: `backend/dist/routes/admin.js` (mirror)
- Modify: `frontend/src/app/[locale]/(admin)/admin/referrals/page.tsx`

### Backend changes

**Step 1: Fix GET /admin/referrals and add per-tier stats**

In `backend/src/routes/admin.ts`, replace the entire `GET /referrals` handler (lines 855–893) with:

```typescript
router.get('/referrals', async (_req: Request, res: Response) => {
  try {
    const links = await prisma.referralLink.findMany({
      include: {
        conversions: {
          select: { id: true, tier: true, revenueEurCents: true, commissionCents: true, convertedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = links.map(l => {
      const byTier = { FREE: 0, PRO: 0, PREMIUM: 0 };
      l.conversions.forEach(c => {
        if (c.tier in byTier) byTier[c.tier as keyof typeof byTier]++;
      });
      return {
        id: l.id,
        slug: l.slug,
        label: l.label,
        commissionRate: l.commissionRate,
        discountCode: l.discountCode ?? null,
        clicks: l.clicks,
        isActive: l.isActive,
        createdAt: l.createdAt,
        totalConversions: l.conversions.length,
        conversionsByTier: byTier,
        revenueEurCents: l.conversions.reduce((s, c) => s + c.revenueEurCents, 0),
        totalCommissionCents: l.conversions.reduce((s, c) => s + c.commissionCents, 0),
      };
    });

    const totals = {
      activeLinks: formatted.filter(l => l.isActive).length,
      totalClicks: formatted.reduce((s, l) => s + l.clicks, 0),
      totalConversions: formatted.reduce((s, l) => s + l.totalConversions, 0),
      totalCommissionEur: (formatted.reduce((s, l) => s + l.totalCommissionCents, 0) / 100).toFixed(2),
    };

    res.json({ success: true, data: { links: formatted, totals } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});
```

**Step 2: Update POST /admin/referrals to accept discountCode**

In `backend/src/routes/admin.ts`, find the `POST /referrals` handler (lines 895–915). Change:

```typescript
const { slug, label, commissionRate = 0.2 } = req.body;
```

to:

```typescript
const { slug, label, commissionRate = 0.2, discountCode } = req.body;
```

And change the `prisma.referralLink.create` data:

```typescript
const link = await prisma.referralLink.create({
  data: {
    slug: slug.toLowerCase().replace(/\s+/g, '-'),
    label,
    commissionRate: parseFloat(commissionRate),
    discountCode: discountCode?.trim() || null,
  },
});
```

**Step 3: Mirror both changes to backend/dist/routes/admin.js**

Apply the same GET and POST changes to `backend/dist/routes/admin.js`.

### Frontend changes

**Step 4: Update ReferralLink interface in page.tsx**

In `frontend/src/app/[locale]/(admin)/admin/referrals/page.tsx`, update the `ReferralLink` interface:

```typescript
interface ReferralLink {
  id: string;
  slug: string;
  label: string;
  commissionRate: number;
  discountCode: string | null;
  clicks: number;
  isActive: boolean;
  conversionsByTier: { FREE: number; PRO: number; PREMIUM: number };
  totalConversions: number;
  totalCommissionCents: number;
  createdAt: string;
}
```

**Step 5: Add discountCode field to CreateModal**

In the `CreateModal` component, add state and input for discount code.

After the `commissionPct` state, add:
```typescript
const [discountCode, setDiscountCode] = useState('');
```

In the form, after the Commission Rate field and before the error/submit, add:

```tsx
{/* Discount Code (optional) */}
<div>
  <label className="block text-xs text-text-muted mb-1">
    Discount Code <span className="text-text-muted">(optional — DiscountCode from admin)</span>
  </label>
  <input
    type="text"
    placeholder="e.g. LAUNCH50"
    value={discountCode}
    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors font-mono"
  />
  <p className="mt-1 text-[11px] text-text-muted">
    If set, referred users will have this discount auto-applied at checkout.
  </p>
</div>
```

In the `adminPost('/referrals', {...})` call, add `discountCode`:

```typescript
await adminPost('/referrals', {
  label: label.trim(),
  slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
  commissionRate: pct / 100,
  discountCode: discountCode.trim() || undefined,
});
```

**Step 6: Update table to show discountCode and per-tier conversion breakdown**

In the table header, ADD after the `Conversions` column:

```tsx
<th className="px-4 py-3 font-medium">By Tier</th>
<th className="px-4 py-3 font-medium">Discount Code</th>
```

In the table rows (inside `links.map`), ADD after the existing Conversions `<td>`:

```tsx
{/* Per-tier breakdown */}
<td className="px-4 py-3 text-text-secondary text-xs">
  <span className="text-text-muted">F:</span>{link.conversionsByTier.FREE}{' '}
  <span className="text-text-muted">P:</span>{link.conversionsByTier.PRO}{' '}
  <span className="text-text-muted">Pr:</span>{link.conversionsByTier.PREMIUM}
</td>

{/* Discount Code */}
<td className="px-4 py-3">
  {link.discountCode ? (
    <span className="font-mono text-xs text-[#00f0ff]">{link.discountCode}</span>
  ) : (
    <span className="text-text-muted text-xs">—</span>
  )}
</td>
```

Update `colSpan` from `8` to `10` in the empty state row.

**Step 7: Commit**

```bash
git add backend/src/routes/admin.ts backend/dist/routes/admin.js frontend/src/app/\[locale\]/\(admin\)/admin/referrals/page.tsx
git commit -m "feat: admin referrals — per-tier stats, discountCode field, fix totals bugs"
```

---

## Execution Order

Tasks must be done in order (each depends on the previous):

1. Task 1 — Schema migration (foundation)
2. Task 2 — Click tracking redirect
3. Task 3 — Frontend referral capture
4. Task 4 — Registration attribution
5. Task 5 — Checkout discount
6. Task 6 — Webhook conversion
7. Task 7 — Admin dashboard enhancements

## Testing Checklist (manual UAT)

After all tasks complete:

1. **Click tracking**: Visit `http://localhost:4000/r/<valid-slug>` → should redirect to frontend with `?ref=` param → click counter in admin should increment
2. **localStorage capture**: Visit `http://localhost:3003?ref=test-slug` → open DevTools → `localStorage.getItem('referral_slug')` should return `'test-slug'`
3. **Registration attribution**: Register a new test user while localStorage has referral_slug → query DB: `SELECT referred_by_slug FROM users WHERE email = 'test@test.com'` → should show the slug
4. **Admin create with discount**: In admin → Referral Links → Create → fill discount code → save → should appear in the table
5. **Discount at checkout**: Log in as referred user → go to checkout → the Stripe session should have the promo code applied (visible in Stripe dashboard test mode)
6. **Conversion recording**: Complete a test checkout in Stripe test mode → webhook fires → check `referral_conversions` table for new record
7. **Per-tier stats**: Check admin dashboard after a conversion — `By Tier` column should show correct counts
