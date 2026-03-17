# US-11: View Subscription Plans - Implementation Document

**User Story:** As a Free tier user, I want to see available subscription plans so that I can decide whether to upgrade for unlimited access.

**Implementation Date:** 2026-02-27  
**Status:** ✅ Complete

---

## 1. Overview

This document describes the implementation of US-11: View Subscription Plans for the AstroLogAI project. The feature includes a pricing page where users can view available subscription tiers (Free, Pro, Premium) with feature comparison, EUR/BGN pricing, and FAQ section.

## 2. Backend Implementation

### 2.1 API Endpoints

#### GET /api/v1/subscription/plans
Returns all available subscription plans with features and pricing.

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "Безплатен",
        "description": "Започнете своето астрологично пътуване",
        "price": { "monthly": 0, "yearly": 0, "currency": "EUR" },
        "priceBgn": { "monthly": 0, "yearly": 0, "currency": "BGN" },
        "features": ["10 заявки месечно", "Основен хороскоп", ...],
        "notIncluded": ["Неограничени заявки", ...],
        "popular": false,
        "queriesLimit": 10
      },
      {
        "id": "pro",
        "name": "Про",
        "price": { "monthly": 10, "yearly": 96 },
        "priceBgn": { "monthly": 19.6, "yearly": 188 },
        "popular": true,
        "queriesLimit": -1
      },
      {
        "id": "premium",
        "name": "Премиум",
        "price": { "monthly": 20, "yearly": 192 },
        "priceBgn": { "monthly": 39.2, "yearly": 376 },
        "queriesLimit": -1
      }
    ],
    "currentSubscription": { "tier": "FREE", "status": "ACTIVE" },
    "userUsage": { "queriesThisMonth": 5, "queriesLimit": 10 },
    "currency": "BGN",
    "conversionRate": 1.96
  }
}
```

#### GET /api/v1/subscription/status
Returns user's current subscription status with usage information.

**Response:**
```json
{
  "success": true,
  "data": {
    "tier": "PRO",
    "status": "ACTIVE",
    "usage": {
      "queriesThisMonth": 45,
      "queriesLimit": -1,
      "queriesRemaining": -1,
      "resetDate": "2026-03-01T00:00:00Z"
    },
    "features": ["unlimited_queries", "core_astrology", ...],
    "limits": {
      "queries": "unlimited",
      "partners": 10,
      "conversations": "unlimited"
    },
    "billing": {
      "currentPeriodStart": "2026-02-01T00:00:00Z",
      "currentPeriodEnd": "2026-03-01T00:00:00Z",
      "cancelAtPeriodEnd": false
    }
  }
}
```

#### POST /api/v1/subscription/checkout
Creates a Stripe checkout session for subscription upgrade.

**Request:**
```json
{
  "tier": "PRO",
  "billingPeriod": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
    "sessionId": "cs_test_..."
  }
}
```

#### POST /api/v1/subscription/webhook
Handles Stripe webhook events (checkout.session.completed, invoice.paid, customer.subscription.updated, etc.)

#### POST /api/v1/subscription/cancel
Cancels subscription at end of billing period.

#### POST /api/v1/subscription/portal
Creates Stripe customer portal session for billing management.

### 2.2 Database Schema

The Subscription model was already defined in Prisma schema:

```prisma
model Subscription {
  id                String    @id @default(uuid())
  userId            String    @unique @map("user_id")
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeCustomerId  String?   @unique @map("stripe_customer_id")
  stripeSubscriptionId String? @unique @map("stripe_subscription_id")
  tier              Tier
  status            SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime? @map("current_period_start")
  currentPeriodEnd   DateTime? @map("current_period_end")
  cancelAtPeriodEnd Boolean   @default(false) @map("cancel_at_period_end")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
  TRIALING
}

enum Tier {
  FREE
  PRO
  PREMIUM
}
```

### 2.3 Environment Variables

Added to `.env`:
```bash
STRIPE_PRO_PRICE_ID_MONTHLY="price_pro_monthly"
STRIPE_PRO_PRICE_ID_YEARLY="price_pro_yearly"
STRIPE_PREMIUM_PRICE_ID_MONTHLY="price_premium_monthly"
STRIPE_PREMIUM_PRICE_ID_YEARLY="price_premium_yearly"
FRONTEND_URL="http://localhost:3000"
```

## 3. Frontend Implementation

### 3.1 Pricing Page

Created `/app/pricing/page.tsx` with:

- **Header:** Title and subtitle with cosmic gradient background
- **Usage Counter:** Shows remaining queries for Free tier users
- **Billing Toggle:** Monthly/Yearly toggle with 20% savings badge
- **Pricing Cards:** Three tiers (Free, Pro, Premium) with:
  - Plan name and description
  - Price in EUR and BGN
  - Query limit indicator
  - Feature list with checkmarks
  - CTA button (Get Started/Upgrade/Current)
- **FAQ Section:** Expandable accordion with 6 common questions

### 3.2 Design System

Applied the design specifications from 06-ux-ui-design.md:

| Element | Value |
|---------|-------|
| Background | #050510 (Cosmic Black) |
| Surface | #0A0A1F (Nebula Dark) |
| Primary | #8B5CF6 (Stellar Purple) |
| Secondary | #EC4899 (Nebula Pink) |
| Text Primary | #F8FAFC |
| Text Secondary | #CBD5E1 |
| Gradient | linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%) |
| Border Radius | 12px-16px |
| Typography | Inter |

### 3.3 Translations

Updated `messages/bg.json` and `messages/en.json` with:
- Page title and subtitle
- Plan names and descriptions
- Feature lists
- FAQ questions and answers
- Button labels
- Error messages

## 4. Key Features

### 4.1 Pricing Tiers

| Feature | Free | Pro (€10/mo) | Premium (€20/mo) |
|--------|------|--------------|------------------|
| Monthly Queries | 10 | Unlimited | Unlimited |
| Core Astrology | ✓ | ✓ | ✓ |
| Vedic Astrology | ✗ | ✓ | ✓ |
| Relationship Analysis | ✗ | ✓ | ✓ |
| Daily Forecasts | ✗ | ✓ | ✓ |
| Weekly Forecasts | ✗ | ✓ | ✓ |
| Business Astrology | ✗ | ✗ | ✓ |
| Tarot Readings | ✗ | ✗ | ✓ |
| Numerology | ✗ | ✗ | ✓ |
| Priority Support | ✗ | ✗ | ✓ |

### 4.2 EUR/BGN Pricing

- Conversion rate: 1 EUR = 1.96 BGN
- Free: €0 / 0 лв.
- Pro: €10 / 19.60 лв. per month (€96 / 188 лв. yearly - save 20%)
- Premium: €20 / 39.20 лв. per month (€192 / 376 лв. yearly - save 20%)

### 4.3 User Experience

- Free tier users see remaining query counter
- Upgrade button visible when query limit reached
- Current plan highlighted with "Current" badge
- FAQ accordion for common questions
- Language-aware pricing display (BGN for Bulgarian users)

## 5. Acceptance Criteria Verification

| Criteria | Status | Notes |
|----------|--------|-------|
| Pricing page shows Free, Pro (€10/mo), Premium (€20/mo) tiers | ✅ | Implemented in pricing page |
| Feature comparison table clearly differentiates tiers | ✅ | Features and not-included lists |
| Free tier shows remaining queries counter | ✅ | Usage bar with counter |
| Pricing displayed in EUR and BGN | ✅ | Dual pricing in cards |
| FAQ section addresses common questions | ✅ | 6 FAQ items with accordion |
| "Upgrade" button visible when query limit reached | ✅ | Shown when limit reached |

## 6. Files Changed

### Backend
- `/backend/src/routes/subscription.ts` - Complete rewrite with full subscription logic

### Frontend
- `/frontend/src/app/pricing/page.tsx` - New pricing page
- `/frontend/src/messages/bg.json` - Added translations
- `/frontend/src/messages/en.json` - Added translations

### Configuration
- `/backend/.env` - Added Stripe price IDs

## 7. Dependencies

- `stripe` (v14.25.0) - Already installed
- `express` - Already installed
- `prisma` - Already installed

## 8. Next Steps

1. Configure Stripe with actual price IDs in production
2. Add webhook endpoint for production
3. Implement customer portal for subscription management
4. Add more sophisticated usage tracking
5. Consider adding a trial period

---

**Implementation Complete**
