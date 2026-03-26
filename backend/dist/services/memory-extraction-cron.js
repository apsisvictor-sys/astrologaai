"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var memory_extraction_cron_exports = {};
__export(memory_extraction_cron_exports, {
  runMemoryExtractionJob: () => runMemoryExtractionJob
});
module.exports = __toCommonJS(memory_extraction_cron_exports);
var import_ai = require("ai");
var import_anthropic = require("@ai-sdk/anthropic");
var import_prisma = require("../utils/prisma");
var import_prisma_vector = require("../utils/prisma-vector");
var import_embedding = require("./embedding");
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function embeddingToSql(embedding) {
  return "[" + embedding.join(",") + "]";
}
async function isDuplicate(userId, embedding) {
  try {
    const vec = embeddingToSql(embedding);
    const rows = await (0, import_prisma_vector.getPrismaVector)().$queryRaw`
      SELECT 1 AS found
      FROM   user_memories
      WHERE  user_id = ${userId}
        AND  (embedding <=> ${vec}::vector) < 0.15
      LIMIT  1
    `;
    return rows.length > 0;
  } catch (err) {
    console.warn("[MemoryCron] Dedup check failed, allowing insert:", err);
    return false;
  }
}
const VALID_CATEGORIES = /* @__PURE__ */ new Set([
  "career",
  "love",
  "health",
  "fears",
  "growth",
  "high_impact",
  "other"
]);
function isValidCategory(cat) {
  return VALID_CATEGORIES.has(cat);
}
async function extractFacts(messages) {
  const transcript = messages.map((m) => `${m.role === "USER" ? "User" : "Oracle"}: ${m.content}`).join("\n");
  const prompt = `You are a memory curator for an astrological AI. Review this Oracle conversation and extract 1-3 memorable personal facts that the user EXPLICITLY shared about themselves.

RULES:
- Only extract facts the user directly stated (not inferences or observations)
- Skip generic astrological discussion, questions, or greetings
- If there are no extractable personal facts, return an empty array
- Classify each fact into exactly one category: career, love, health, fears, growth, high_impact, other
- high_impact: life-changing events, major decisions, traumas, breakthroughs
- Keep each fact concise (1-2 sentences max), written in third person about the user

Return ONLY valid JSON \u2014 no markdown, no explanation:
[{"content": "...", "category": "..."}]

Conversation:
${transcript}`;
  const result = await (0, import_ai.generateText)({
    model: (0, import_anthropic.anthropic)("claude-haiku-4-5-20251001"),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    maxTokens: 512
  });
  const text = result.text.trim();
  const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Haiku returned non-JSON: ${jsonText.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Haiku returned non-array: ${jsonText.slice(0, 200)}`);
  }
  const facts = [];
  for (const item of parsed) {
    if (typeof item === "object" && item !== null && typeof item.content === "string" && typeof item.category === "string" && isValidCategory(item.category)) {
      facts.push({ content: item.content, category: item.category });
    }
  }
  return facts.slice(0, 3);
}
async function extractAspects(messages) {
  const oracleMessages = messages.filter((m) => m.role !== "USER").map((m) => `Oracle: ${m.content}`).join("\n");
  if (!oracleMessages.trim()) return [];
  const prompt = `You are reviewing an Oracle AI astrology conversation. Look ONLY at the Oracle's messages below.
Identify up to 3 astrological aspects (planet-to-planet relationships) that the Oracle led with, opened a response with, or discussed at length across multiple turns.

An astrological aspect is a specific relationship between two planets \u2014 e.g., "Sun conjunct Moon", "Saturn square Venus", "Jupiter trine Mars", "Pluto opposite Sun".

Rules:
- Only include aspects the Oracle CLEARLY EMPHASIZED \u2014 led a response with, or returned to repeatedly
- Skip generic discussion, sign placements, or house placements (those are not aspects)
- If no specific aspects were emphasized, return an empty array
- Assign cooldownLevel based on prominence:
  - 2 = Oracle opened a major response with this aspect OR featured it across multiple messages
  - 1 = Oracle mentioned it once as a notable point
- Do NOT include level 0 aspects

Return ONLY valid JSON \u2014 no markdown, no explanation:
[{"aspect": "Sun conjunct Moon", "cooldownLevel": 2}]

Oracle messages:
${oracleMessages}`;
  const result = await (0, import_ai.generateText)({
    model: (0, import_anthropic.anthropic)("claude-haiku-4-5-20251001"),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    maxTokens: 256
  });
  const text = result.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const aspects = [];
  for (const item of parsed) {
    if (typeof item === "object" && item !== null && typeof item.aspect === "string" && item.aspect.trim().length > 0 && (item.cooldownLevel === 1 || item.cooldownLevel === 2)) {
      aspects.push({
        aspect: item.aspect.trim(),
        cooldownLevel: item.cooldownLevel
      });
    }
  }
  return aspects.slice(0, 3);
}
async function processUser(userId, sessionIds, sourceDate) {
  const messages = await import_prisma.prisma.chatMessage.findMany({
    where: {
      sessionId: { in: sessionIds },
      role: { in: ["USER", "ASSISTANT"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1e3) }
    },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true }
  });
  if (messages.length === 0) return { inserted: 0, skipped: 0 };
  let facts;
  try {
    facts = await extractFacts(messages.map((m) => ({ role: m.role, content: m.content })));
  } catch (err) {
    console.warn(`[MemoryCron] Extraction failed for user ${userId}:`, err);
    return { inserted: 0, skipped: 0 };
  }
  let inserted = 0;
  let skipped = 0;
  for (const fact of facts) {
    let embedding;
    try {
      embedding = await (0, import_embedding.embedText)(fact.content);
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
    try {
      const vec = embeddingToSql(embedding);
      const sourceDateStr = sourceDate.toISOString().split("T")[0];
      await (0, import_prisma_vector.getPrismaVector)().$executeRaw`
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
  let aspects = [];
  try {
    aspects = await extractAspects(messages.map((m) => ({ role: m.role, content: m.content })));
  } catch (err) {
    console.warn(`[MemoryCron] Aspect extraction failed for user ${userId}:`, err);
  }
  for (const aspect of aspects) {
    try {
      const sourceDateStr = sourceDate.toISOString().split("T")[0];
      const content = JSON.stringify({ aspect: aspect.aspect, cooldownLevel: aspect.cooldownLevel });
      await (0, import_prisma_vector.getPrismaVector)().$executeRaw`
        INSERT INTO user_memories (id, user_id, content, category, source_date, chat_ids, created_at)
        VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${content},
          'aspect_cooldown',
          ${sourceDateStr}::date,
          ${sessionIds}::text[],
          now()
        )
      `;
      inserted++;
    } catch (err) {
      console.warn(`[MemoryCron] Aspect insert failed for user ${userId}:`, err);
      skipped++;
    }
  }
  return { inserted, skipped };
}
async function runMemoryExtractionJob() {
  console.log("[MemoryCron] Starting nightly memory extraction");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1e3);
  const today = /* @__PURE__ */ new Date();
  let activeRows;
  try {
    activeRows = await import_prisma.prisma.$queryRaw`
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
    console.error("[MemoryCron] Failed to query active users:", err);
    return { usersProcessed: 0, totalInserted: 0, totalSkipped: 0 };
  }
  const userSessionMap = /* @__PURE__ */ new Map();
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
    await delay(1500);
  }
  console.log(
    `[MemoryCron] Done \u2014 ${usersProcessed} users, ${totalInserted} inserted, ${totalSkipped} skipped`
  );
  return { usersProcessed, totalInserted, totalSkipped };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runMemoryExtractionJob
});
