/**
 * Memory Extraction Cron Service (PIX-168)
 *
 * Nightly job (03:00 UTC) that scans the last 24h of Oracle conversations
 * for PRO/PREMIUM users, extracts 1–3 memorable facts per user using Claude
 * Haiku, embeds them, deduplicates against existing memories via cosine
 * similarity (pgvector), and inserts novel facts into `user_memories`.
 *
 * PRO users: extraction runs the same way; retrieval enforces a 30-day window
 * (that logic lives in the retrieval layer, not here).
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { prisma } from '../utils/prisma';
import { getPrismaVector } from '../utils/prisma-vector';
import { embedText } from './embedding';

// ─── types ───────────────────────────────────────────────────────────────────

type MemoryCategory =
  | 'career'
  | 'love'
  | 'health'
  | 'fears'
  | 'growth'
  | 'high_impact'
  | 'other';

interface ExtractedFact {
  content: string;
  category: MemoryCategory;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function embeddingToSql(embedding: number[]): string {
  return '[' + embedding.join(',') + ']';
}

// ─── dedup check ─────────────────────────────────────────────────────────────

/**
 * Returns true if an identical (or near-duplicate) memory already exists
 * for this user. Uses cosine distance threshold of 0.15.
 */
async function isDuplicate(userId: string, embedding: number[]): Promise<boolean> {
  try {
    const vec = embeddingToSql(embedding);
    const rows = await getPrismaVector().$queryRaw<Array<{ found: number }>>`
      SELECT 1 AS found
      FROM   user_memories
      WHERE  user_id = ${userId}
        AND  (embedding <=> ${vec}::vector) < 0.15
      LIMIT  1
    `;
    return rows.length > 0;
  } catch (err) {
    // If pgvector check fails, allow insert (better to have a near-dup than lose a real memory)
    console.warn('[MemoryCron] Dedup check failed, allowing insert:', err);
    return false;
  }
}

// ─── Haiku extraction ─────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>([
  'career', 'love', 'health', 'fears', 'growth', 'high_impact', 'other',
]);

function isValidCategory(cat: string): cat is MemoryCategory {
  return VALID_CATEGORIES.has(cat);
}

/**
 * Call Claude Haiku to extract 1–3 memorable personal facts from a conversation.
 * Only facts the user *explicitly stated* — not observations or inferences.
 * Returns a parsed array; throws on Haiku or parse failure.
 */
async function extractFacts(
  messages: Array<{ role: string; content: string }>,
): Promise<ExtractedFact[]> {
  const transcript = messages
    .map(m => `${m.role === 'USER' ? 'User' : 'Oracle'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a memory curator for an astrological AI. Review this Oracle conversation and extract 1-3 memorable personal facts that the user EXPLICITLY shared about themselves.

RULES:
- Only extract facts the user directly stated (not inferences or observations)
- Skip generic astrological discussion, questions, or greetings
- If there are no extractable personal facts, return an empty array
- Classify each fact into exactly one category: career, love, health, fears, growth, high_impact, other
- high_impact: life-changing events, major decisions, traumas, breakthroughs
- Keep each fact concise (1-2 sentences max), written in third person about the user

Return ONLY valid JSON — no markdown, no explanation:
[{"content": "...", "category": "..."}]

Conversation:
${transcript}`;

  const result = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    maxTokens: 512,
  });

  const text = result.text.trim();

  // Strip markdown code fences if Haiku added them
  const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Haiku returned non-JSON: ${jsonText.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Haiku returned non-array: ${jsonText.slice(0, 200)}`);
  }

  const facts: ExtractedFact[] = [];
  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as any).content === 'string' &&
      typeof (item as any).category === 'string' &&
      isValidCategory((item as any).category)
    ) {
      facts.push({ content: (item as any).content, category: (item as any).category });
    }
  }

  return facts.slice(0, 3); // enforce max 3
}

// ─── per-user extraction ──────────────────────────────────────────────────────

async function processUser(
  userId: string,
  sessionIds: string[],
  sourceDate: Date,
): Promise<{ inserted: number; skipped: number }> {
  // Fetch messages for these sessions from the last 24h
  const messages = await prisma.chatMessage.findMany({
    where: {
      sessionId: { in: sessionIds },
      role: { in: ['USER', 'ASSISTANT'] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });

  if (messages.length === 0) return { inserted: 0, skipped: 0 };

  // Extract facts via Haiku
  let facts: ExtractedFact[];
  try {
    facts = await extractFacts(messages.map(m => ({ role: m.role, content: m.content })));
  } catch (err) {
    console.warn(`[MemoryCron] Extraction failed for user ${userId}:`, err);
    return { inserted: 0, skipped: 0 };
  }

  if (facts.length === 0) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const fact of facts) {
    let embedding: number[];
    try {
      embedding = await embedText(fact.content);
    } catch (err) {
      console.warn(`[MemoryCron] Embed failed for user ${userId}, fact: "${fact.content.slice(0, 50)}":`, err);
      skipped++;
      continue;
    }

    const dup = await isDuplicate(userId, embedding);
    if (dup) {
      skipped++;
      continue;
    }

    // Insert via raw SQL (pgvector::vector cast) — targets vector DB
    try {
      const vec = embeddingToSql(embedding);
      const sourceDateStr = sourceDate.toISOString().split('T')[0];
      await getPrismaVector().$executeRaw`
        INSERT INTO user_memories (id, user_id, content, embedding, category, source_date, chat_ids, created_at)
        VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${fact.content},
          ${vec}::vector,
          ${fact.category},
          ${sourceDateStr}::date,
          ${sessionIds}::text[],
          now()
        )
      `;
      inserted++;
    } catch (err) {
      console.warn(`[MemoryCron] Insert failed for user ${userId}:`, err);
      skipped++;
    }
  }

  return { inserted, skipped };
}

// ─── nightly job ─────────────────────────────────────────────────────────────

export async function runMemoryExtractionJob(): Promise<{
  usersProcessed: number;
  totalInserted: number;
  totalSkipped: number;
}> {
  console.log('[MemoryCron] Starting nightly memory extraction');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const today = new Date();

  // Find PRO/PREMIUM users with chat messages in the last 24h
  let activeRows: Array<{ userId: string; sessionId: string }>;
  try {
    activeRows = await prisma.$queryRaw<Array<{ userId: string; sessionId: string }>>`
      SELECT DISTINCT cs.user_id AS "userId", cs.id AS "sessionId"
      FROM   chat_sessions cs
      JOIN   chat_messages cm ON cm.session_id = cs.id
      JOIN   users u ON u.id = cs.user_id
      WHERE  cm.created_at >= ${since}
        AND  cm.role IN ('USER', 'ASSISTANT')
        AND  u.tier IN ('PRO', 'PREMIUM')
        AND  u.is_suspended = false
        AND  u.memory_enabled = true
    `;
  } catch (err) {
    console.error('[MemoryCron] Failed to query active users:', err);
    return { usersProcessed: 0, totalInserted: 0, totalSkipped: 0 };
  }

  // Group session IDs by user
  const userSessionMap = new Map<string, string[]>();
  for (const row of activeRows) {
    const sessions = userSessionMap.get(row.userId) ?? [];
    sessions.push(row.sessionId);
    userSessionMap.set(row.userId, sessions);
  }

  console.log(`[MemoryCron] ${userSessionMap.size} active PRO/PREMIUM users to process`);

  let usersProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [userId, sessionIds] of userSessionMap) {
    try {
      const result = await processUser(userId, sessionIds, today);
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
      usersProcessed++;
      if (result.inserted > 0) {
        console.log(`[MemoryCron] User ${userId}: +${result.inserted} memories, ${result.skipped} skipped`);
      }
    } catch (err) {
      console.error(`[MemoryCron] Unexpected error for user ${userId}:`, err);
    }
    // Pace requests — Haiku + OpenAI embeddings rate limits
    await delay(1500);
  }

  console.log(
    `[MemoryCron] Done — ${usersProcessed} users, ${totalInserted} inserted, ${totalSkipped} skipped`,
  );
  return { usersProcessed, totalInserted, totalSkipped };
}
