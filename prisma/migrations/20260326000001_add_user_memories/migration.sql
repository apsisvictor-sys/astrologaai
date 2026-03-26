-- Migration: add_user_memories (FUTURE-02 / PIX-166)
-- Requires: pgvector extension enabled on the server (PIX-165)
-- Adds user_memories table for long-term personal memory with vector similarity search.

-- Enable pgvector extension (idempotent — safe to re-run)
CREATE EXTENSION IF NOT EXISTS vector;

-- user_memories table
CREATE TABLE "user_memories" (
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
CREATE INDEX "user_memories_embedding_idx"
    ON "user_memories" USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Composite index for category-filtered user lookups
CREATE INDEX "user_memories_user_id_category_idx"
    ON "user_memories"("user_id", "category");

-- Foreign key: cascade delete when user is removed
ALTER TABLE "user_memories"
    ADD CONSTRAINT "user_memories_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
