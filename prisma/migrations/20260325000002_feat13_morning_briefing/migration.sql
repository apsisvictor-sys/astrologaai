-- PIX-134: FEAT-13 Morning Astrological Briefing
-- Add morning_briefing notification preference column

ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "morning_briefing" BOOLEAN NOT NULL DEFAULT false;
