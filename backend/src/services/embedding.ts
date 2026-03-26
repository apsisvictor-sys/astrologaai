/**
 * Embedding Service
 * Wraps OpenAI text-embedding-3-small (1536 dims) via Vercel AI SDK.
 * Abstracted so callers can be swapped to a different provider later.
 */

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');

/**
 * Per-invocation in-memory cache.
 * Avoids re-embedding identical strings within a single process lifecycle.
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Embed a single text string.
 * Returns a 1536-element float array.
 */
export async function embedText(text: string): Promise<number[]> {
  const cached = embeddingCache.get(text);
  if (cached) return cached;

  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });

  embeddingCache.set(text, embedding);
  return embedding;
}

/**
 * Embed multiple texts in a single API call.
 * Deduplicates identical strings before sending.
 * Returns embeddings in the same order as the input array.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Separate cached from uncached, preserving order
  const uncachedTexts: string[] = [];
  const uncachedSet = new Set<string>();

  for (const text of texts) {
    if (!embeddingCache.has(text) && !uncachedSet.has(text)) {
      uncachedTexts.push(text);
      uncachedSet.add(text);
    }
  }

  if (uncachedTexts.length > 0) {
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: uncachedTexts,
    });

    for (let i = 0; i < uncachedTexts.length; i++) {
      embeddingCache.set(uncachedTexts[i], embeddings[i]);
    }
  }

  return texts.map((text) => embeddingCache.get(text)!);
}
