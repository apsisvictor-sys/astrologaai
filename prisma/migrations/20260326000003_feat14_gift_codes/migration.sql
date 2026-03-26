-- Migration: feat14_gift_codes (PIX-209)
-- FEAT-14: Gift Subscriptions
-- Adds GiftCodeStatus enum, gift_codes table, and gift fields on subscriptions.

-- 1. GiftCodeStatus enum
CREATE TYPE "GiftCodeStatus" AS ENUM (
    'PENDING_PAYMENT',
    'ACTIVE',
    'REDEEMED',
    'EXPIRED',
    'CANCELLED'
);

-- 2. gift_codes table
CREATE TABLE "gift_codes" (
    "id"                        TEXT NOT NULL,
    "code"                      TEXT NOT NULL,
    "purchaser_email"           TEXT NOT NULL,
    "purchaser_id"              TEXT,
    "recipient_email"           TEXT,
    "tier"                      "Tier" NOT NULL DEFAULT 'PREMIUM',
    "duration_months"           INTEGER NOT NULL,
    "stripe_session_id"         TEXT,
    "stripe_payment_intent_id"  TEXT,
    "amount_paid_cents"         INTEGER NOT NULL,
    "currency"                  TEXT NOT NULL DEFAULT 'EUR',
    "status"                    "GiftCodeStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "claim_expires_at"          TIMESTAMP(3) NOT NULL,
    "redeemed_at"               TIMESTAMP(3),
    "redeemed_by_user_id"       TEXT,
    "subscription_ends_at"      TIMESTAMP(3),
    "created_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_codes_pkey" PRIMARY KEY ("id")
);

-- 3. Unique constraints
CREATE UNIQUE INDEX "gift_codes_code_key" ON "gift_codes"("code");
CREATE UNIQUE INDEX "gift_codes_stripe_session_id_key" ON "gift_codes"("stripe_session_id");
CREATE UNIQUE INDEX "gift_codes_stripe_payment_intent_id_key" ON "gift_codes"("stripe_payment_intent_id");

-- 4. Indexes
CREATE INDEX "gift_codes_code_idx" ON "gift_codes"("code");
CREATE INDEX "gift_codes_stripe_session_id_idx" ON "gift_codes"("stripe_session_id");
CREATE INDEX "gift_codes_redeemed_by_user_id_idx" ON "gift_codes"("redeemed_by_user_id");

-- 5. FK: redeemed_by_user_id → users.id
ALTER TABLE "gift_codes"
    ADD CONSTRAINT "gift_codes_redeemed_by_user_id_fkey"
    FOREIGN KEY ("redeemed_by_user_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Add gift fields to subscriptions
ALTER TABLE "subscriptions"
    ADD COLUMN "is_gift_subscription" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "gift_code_id"         TEXT;
