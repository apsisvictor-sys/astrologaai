/**
 * Vector DB Migration Script (PIX-166)
 *
 * Idempotent DDL migration for the postgres-vector Railway service.
 * Runs as the backend's preDeployCommand on every deploy.
 *
 * Usage: node dist/scripts/migrate-vector.js
 * Requires: DATABASE_VECTOR_URL set in the environment.
 */

import { getPrismaVector } from '../utils/prisma-vector';

async function main() {
  console.log('[VectorMigrate] Connecting to vector DB...');
  const pv = getPrismaVector();

  console.log('[VectorMigrate] Enabling pgvector extension...');
  await pv.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);

  console.log('[VectorMigrate] Creating user_memories table...');
  await pv.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "user_memories" (
      "id"               TEXT NOT NULL,
      "user_id"          TEXT NOT NULL,
      "content"          TEXT NOT NULL,
      "embedding"        vector(1536),
      "category"         TEXT NOT NULL,
      "source_date"      DATE NOT NULL,
      "chat_ids"         TEXT[] NOT NULL DEFAULT '{}',
      "created_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "last_recalled_at" TIMESTAMPTZ,
      CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id")
    )
  `);

  console.log('[VectorMigrate] Creating IVFFlat cosine similarity index...');
  await pv.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "user_memories_embedding_idx"
    ON "user_memories" USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `);

  console.log('[VectorMigrate] Creating user_id + category composite index...');
  await pv.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "user_memories_user_id_category_idx"
    ON "user_memories"("user_id", "category")
  `);

  console.log('[VectorMigrate] Done ✓ — user_memories table is ready');
  await pv.$disconnect();
}

main().catch(err => {
  console.error('[VectorMigrate] FAILED:', err);
  process.exit(1);
});
