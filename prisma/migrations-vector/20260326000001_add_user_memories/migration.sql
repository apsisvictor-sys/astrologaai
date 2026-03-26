-- Migration: add_user_memories (FUTURE-02 / PIX-166)
-- Target: DATABASE_VECTOR_URL (postgres-vector Railway service — separate from main DB)
-- Apply with: psql "$DATABASE_VECTOR_URL" -f this-file.sql
--          or: DATABASE_URL=$DATABASE_VECTOR_URL npx prisma migrate deploy --schema prisma/vector-schema.prisma
--
-- Requires: pgvector enabled on this Postgres instance (PIX-165)
-- NOTE: No foreign key to users — cross-DB referential integrity is enforced at application level.

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- user_memories table
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
);

-- IVFFlat index for cosine similarity vector search
-- lists=100 is suitable for up to ~1M rows; tune upward as data grows
CREATE INDEX IF NOT EXISTS "user_memories_embedding_idx"
    ON "user_memories" USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Composite index for category-filtered user lookups
CREATE INDEX IF NOT EXISTS "user_memories_user_id_category_idx"
    ON "user_memories"("user_id", "category");
