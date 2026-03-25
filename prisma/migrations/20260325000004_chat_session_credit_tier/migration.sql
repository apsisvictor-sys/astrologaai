-- Migration: chat_session_credit_tier (FEAT-10)
-- Adds credit_tier column to chat_sessions to track credit-unlocked effective tier.
-- NULL = standard subscription tier; 'PRO'|'PREMIUM' = session started with credits.

ALTER TABLE "chat_sessions" ADD COLUMN "credit_tier" TEXT;
