-- =====================================================
-- AstroLogAI — Full Database Reset & Migration
-- Run this in Supabase SQL Editor (one shot)
-- Safe: database is empty (no user data to lose)
-- =====================================================

-- Step 1: Drop existing tables (in dependency order, CASCADE handles FKs)
DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS birth_charts CASCADE;
DROP TABLE IF EXISTS birth_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Drop existing enum types (recreate fresh)
DROP TYPE IF EXISTS "Tier" CASCADE;
DROP TYPE IF EXISTS "SubscriptionStatus" CASCADE;
DROP TYPE IF EXISTS "RelationshipType" CASCADE;
DROP TYPE IF EXISTS "MessageRole" CASCADE;

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('ROMANTIC', 'FRIEND', 'FAMILY', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIALING');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO', 'PREMIUM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "language" TEXT NOT NULL DEFAULT 'bg',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "monthly_query_count" INTEGER NOT NULL DEFAULT 0,
    "daily_query_count" INTEGER NOT NULL DEFAULT 0,
    "last_query_date" TIMESTAMP(3),
    "bonus_queries" INTEGER NOT NULL DEFAULT 0,
    "pending_email" TEXT,
    "pending_email_token" TEXT,
    "oauth_provider" TEXT,
    "oauth_id" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "notification_prefs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "birth_time" TEXT,
    "location_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_unknown_time" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "birth_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_data" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_unknown_time" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "birth_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_charts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "birth_data_id" TEXT,
    "birth_profile_id" TEXT,
    "chart_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "birth_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_history" (
    "id" TEXT NOT NULL,
    "chart_id" TEXT NOT NULL,
    "chart_data" JSONB NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "birth_time" TEXT,
    "location_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "chart_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "birth_profile_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "relationship_type" "RelationshipType" NOT NULL DEFAULT 'ROMANTIC',
    "birth_date" TIMESTAMP(3) NOT NULL,
    "birth_time" TEXT,
    "location_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_unknown_time" BOOLEAN NOT NULL DEFAULT false,
    "chart_summary" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "tier" "Tier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_downgrade" "Tier",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "query_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "daily_horoscope" BOOLEAN NOT NULL DEFAULT true,
    "weekly_forecast" BOOLEAN NOT NULL DEFAULT true,
    "new_reading" BOOLEAN NOT NULL DEFAULT true,
    "partner_updates" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "phone_number" TEXT,
    "unsubscribe_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tier" "Tier" NOT NULL,
    "model" TEXT NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" BIGINT NOT NULL DEFAULT 0,
    "output_tokens" BIGINT NOT NULL DEFAULT 0,
    "total_tokens" BIGINT NOT NULL DEFAULT 0,
    "cost_usd_cents" INTEGER NOT NULL DEFAULT 0,
    "p50_latency_ms" INTEGER NOT NULL DEFAULT 0,
    "p95_latency_ms" INTEGER NOT NULL DEFAULT 0,
    "p99_latency_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_prompts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_prompt_history" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saved_by" TEXT NOT NULL,

    CONSTRAINT "system_prompt_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "admin_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stripe_promotion_code_id" TEXT,
    "discount_type" TEXT NOT NULL DEFAULT 'percent',
    "discount_value" INTEGER NOT NULL,
    "applies_to" TEXT NOT NULL DEFAULT 'ALL',
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_links" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_conversions" (
    "id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "revenue_eur_cents" INTEGER NOT NULL DEFAULT 0,
    "commission_cents" INTEGER NOT NULL DEFAULT 0,
    "converted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_pending_email_key" ON "users"("pending_email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "birth_profiles_user_id_idx" ON "birth_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "birth_data_user_id_key" ON "birth_data"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "birth_charts_user_id_key" ON "birth_charts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "birth_charts_birth_data_id_key" ON "birth_charts"("birth_data_id");

-- CreateIndex
CREATE UNIQUE INDEX "birth_charts_birth_profile_id_key" ON "birth_charts"("birth_profile_id");

-- CreateIndex
CREATE INDEX "chart_history_chart_id_idx" ON "chart_history"("chart_id");

-- CreateIndex
CREATE INDEX "chart_history_archived_at_idx" ON "chart_history"("archived_at");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "partners_user_id_idx" ON "partners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_user_id_month_key" ON "usage_records"("user_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_unsubscribe_token_key" ON "notification_preferences"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "llm_usage_date_idx" ON "llm_usage"("date");

-- CreateIndex
CREATE INDEX "llm_usage_tier_idx" ON "llm_usage"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "llm_usage_date_tier_model_key" ON "llm_usage"("date", "tier", "model");

-- CreateIndex
CREATE UNIQUE INDEX "system_prompts_name_key" ON "system_prompts"("name");

-- CreateIndex
CREATE INDEX "system_prompt_history_prompt_id_idx" ON "system_prompt_history"("prompt_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_config_key_key" ON "admin_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_is_active_idx" ON "discount_codes"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_slug_key" ON "referral_links"("slug");

-- CreateIndex
CREATE INDEX "referral_conversions_link_id_idx" ON "referral_conversions"("link_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_data" ADD CONSTRAINT "birth_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_charts" ADD CONSTRAINT "birth_charts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_charts" ADD CONSTRAINT "birth_charts_birth_data_id_fkey" FOREIGN KEY ("birth_data_id") REFERENCES "birth_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_charts" ADD CONSTRAINT "birth_charts_birth_profile_id_fkey" FOREIGN KEY ("birth_profile_id") REFERENCES "birth_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_history" ADD CONSTRAINT "chart_history_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "birth_charts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_prompt_history" ADD CONSTRAINT "system_prompt_history_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "system_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "referral_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 3: Set up Prisma migrations tracking
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                      VARCHAR(36) NOT NULL,
  "checksum"                VARCHAR(64) NOT NULL,
  "finished_at"             TIMESTAMPTZ,
  "migration_name"          VARCHAR(255) NOT NULL,
  "logs"                    TEXT,
  "rolled_back_at"          TIMESTAMPTZ,
  "started_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES (
  gen_random_uuid()::text,
  'applied_manually',
  now(),
  '20260308100152_admin_tables',
  1
) ON CONFLICT DO NOTHING;

