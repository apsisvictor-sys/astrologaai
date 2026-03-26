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

import { getPrismaVector } from '../utils/prisma-vector';
import { embedText } from './embedding';

// ─── types ───────────────────────────────────────────────────────────────────

export interface MemoryRow {
  id: string;
  content: string;
  category: string;
  sourceDate: Date;
}

export interface AspectCooldown {
  aspect: string;
  /** 1 = avoid leading, 2 = deprioritize */
  cooldownLevel: 1 | 2;
  /** Date the Oracle featured this aspect */
  featuredAt: Date;
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
    const pv = getPrismaVector();
    if (tier === 'PRO') {
      rows = await pv.$queryRaw<MemoryRow[]>`
        SELECT id, content, category, source_date AS "sourceDate"
        FROM   user_memories
        WHERE  user_id = ${userId}
          AND  source_date >= NOW() - INTERVAL '30 days'
        ORDER  BY embedding <=> ${vec}::vector
        LIMIT  3
      `;
    } else {
      // PREMIUM — full history, top 5
      rows = await pv.$queryRaw<MemoryRow[]>`
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
  getPrismaVector().$executeRaw`
    UPDATE user_memories
    SET    last_recalled_at = NOW()
    WHERE  id = ANY(${ids}::text[])
  `.catch(err =>
    console.warn('[MemoryRetrieval] last_recalled_at update failed (non-fatal):', err),
  );

  return rows;
}

/**
 * Retrieve aspect cooldown records for Oracle Layer 2 ASPECT ROTATION GUIDANCE
 * injection (PIX-179).
 *
 * Queries `user_memories` for records with category = 'aspect_cooldown' from
 * the last 7 days. Returns up to 20 records, most recent first.
 * Returns [] on failure (non-fatal — Oracle continues without rotation guidance).
 */
export async function getAspectCooldowns(userId: string): Promise<AspectCooldown[]> {
  try {
    const pv = getPrismaVector();
    const rows = await pv.$queryRaw<Array<{ content: string; source_date: Date }>>`
      SELECT content, source_date
      FROM   user_memories
      WHERE  user_id = ${userId}
        AND  category = 'aspect_cooldown'
        AND  source_date >= NOW() - INTERVAL '7 days'
      ORDER  BY source_date DESC
      LIMIT  20
    `;

    const cooldowns: AspectCooldown[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.content);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          typeof parsed.aspect === 'string' &&
          (parsed.cooldownLevel === 1 || parsed.cooldownLevel === 2)
        ) {
          cooldowns.push({
            aspect: parsed.aspect,
            cooldownLevel: parsed.cooldownLevel,
            featuredAt: row.source_date,
          });
        }
      } catch {
        // malformed row — skip
      }
    }

    return cooldowns;
  } catch (err) {
    console.warn('[MemoryRetrieval] getAspectCooldowns failed (non-fatal):', err);
    return [];
  }
}
