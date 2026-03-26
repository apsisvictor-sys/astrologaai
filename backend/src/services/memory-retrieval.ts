/**
 * Memory Retrieval Service (PIX-169)
 *
 * At Oracle message time, embeds the user's current message and queries
 * `user_memories` by cosine similarity. Returns raw memory rows for
 * injection into the Layer 2 system prompt via buildSystemPrompt().
 *
 * Tier rules (DB-level pre-filter for efficiency):
 *   PREMIUM — top 5, full history
 *   PRO     — top 3, last 30 days
 *   FREE    — skip entirely (returns [])
 *
 * Tier-aware filtering and count limits are also enforced in
 * buildSystemPrompt() so that unit tests can verify them independently.
 */

import { prisma } from '../utils/prisma';
import { embedText } from './embedding';

// ─── types ───────────────────────────────────────────────────────────────────

export interface MemoryRow {
  id: string;
  content: string;
  category: string;
  sourceDate: Date;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function embeddingToSql(embedding: number[]): string {
  return '[' + embedding.join(',') + ']';
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Retrieve relevant memories for Oracle Layer 2 injection.
 *
 * Returns an empty array when:
 *  - tier is FREE
 *  - embedding or DB query fails (non-fatal — Oracle continues without memories)
 *  - user has no stored memories
 */
export async function retrieveOracleMemories(
  userId: string,
  messageText: string,
  tier: string,
): Promise<MemoryRow[]> {
  if (tier === 'FREE') return [];

  let embedding: number[];
  try {
    embedding = await embedText(messageText);
  } catch (err) {
    console.warn('[MemoryRetrieval] Embed failed — skipping memory injection:', err);
    return [];
  }

  const vec = embeddingToSql(embedding);

  let rows: MemoryRow[];
  try {
    if (tier === 'PRO') {
      rows = await prisma.$queryRaw<MemoryRow[]>`
        SELECT id, content, category, source_date AS "sourceDate"
        FROM   user_memories
        WHERE  user_id = ${userId}
          AND  source_date >= NOW() - INTERVAL '30 days'
        ORDER  BY embedding <=> ${vec}::vector
        LIMIT  3
      `;
    } else {
      // PREMIUM — full history, top 5
      rows = await prisma.$queryRaw<MemoryRow[]>`
        SELECT id, content, category, source_date AS "sourceDate"
        FROM   user_memories
        WHERE  user_id = ${userId}
        ORDER  BY embedding <=> ${vec}::vector
        LIMIT  5
      `;
    }
  } catch (err) {
    console.warn('[MemoryRetrieval] Query failed — skipping memory injection:', err);
    return [];
  }

  if (rows.length === 0) return [];

  // Update last_recalled_at for retrieved memories — fire-and-forget
  const ids = rows.map(r => r.id);
  prisma.$executeRaw`
    UPDATE user_memories
    SET    last_recalled_at = NOW()
    WHERE  id = ANY(${ids}::text[])
  `.catch(err =>
    console.warn('[MemoryRetrieval] last_recalled_at update failed (non-fatal):', err),
  );

  return rows;
}
