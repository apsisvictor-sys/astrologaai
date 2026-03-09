-- Fix columns cascade-dropped when we ran DROP TYPE ... CASCADE
-- chat_messages.role was dropped (MessageRole enum was dropped + recreated)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "role" "MessageRole" NOT NULL DEFAULT 'ASSISTANT';

-- llm_usage.tier was dropped (Tier enum was dropped + recreated)  
ALTER TABLE llm_usage ADD COLUMN IF NOT EXISTS "tier" "Tier" NOT NULL DEFAULT 'FREE';

-- referral_conversions.tier was dropped (Tier enum was dropped + recreated)
ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS "tier" "Tier" NOT NULL DEFAULT 'FREE';

-- Remove the wrong DEFAULT we just set (the schema requires these to be NOT NULL with no default)
-- They are empty tables so this is safe
ALTER TABLE chat_messages ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE llm_usage ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE referral_conversions ALTER COLUMN "tier" DROP DEFAULT;

-- Ensure _prisma_migrations tracking is in place
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
