/**
 * Vector DB Prisma Client (PIX-166)
 *
 * Second PrismaClient instance pointing to DATABASE_VECTOR_URL
 * (the postgres-vector Railway service — separate from the main DB).
 *
 * Used exclusively for raw SQL operations against user_memories:
 *   - pgvector cosine similarity search
 *   - memory insertion / dedup checks
 *   - last_recalled_at updates
 *
 * All user_memories operations MUST use this client, not `prisma`.
 * Cross-DB referential integrity (user_id → users.id) is enforced at
 * the application layer, not by FK constraints.
 *
 * Lazy-initialised: throws on first use if DATABASE_VECTOR_URL is not set.
 * Callers already wrap vector ops in try/catch with graceful fallback.
 */

import { PrismaClient } from '@prisma/client';

let _vectorClient: PrismaClient | null = null;

/**
 * Returns the PrismaClient connected to the vector DB.
 * Throws if DATABASE_VECTOR_URL is not configured.
 */
export function getPrismaVector(): PrismaClient {
  if (_vectorClient) return _vectorClient;

  const url = process.env.DATABASE_VECTOR_URL;
  if (!url) {
    throw new Error(
      '[VectorDB] DATABASE_VECTOR_URL is not set — vector memory unavailable. ' +
      'Blocked on PIX-165 (postgres-vector Railway service provisioning).',
    );
  }

  _vectorClient = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return _vectorClient;
}
