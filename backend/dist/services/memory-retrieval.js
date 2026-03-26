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
var memory_retrieval_exports = {};
__export(memory_retrieval_exports, {
  getAspectCooldowns: () => getAspectCooldowns,
  retrieveOracleMemories: () => retrieveOracleMemories
});
module.exports = __toCommonJS(memory_retrieval_exports);
var import_prisma_vector = require("../utils/prisma-vector");
var import_embedding = require("./embedding");
function embeddingToSql(embedding) {
  return "[" + embedding.join(",") + "]";
}
async function retrieveOracleMemories(userId, messageText, tier) {
  if (tier === "FREE") return [];
  let embedding;
  try {
    embedding = await (0, import_embedding.embedText)(messageText);
  } catch (err) {
    console.warn("[MemoryRetrieval] Embed failed \u2014 skipping memory injection:", err);
    return [];
  }
  const vec = embeddingToSql(embedding);
  let rows;
  try {
    const pv = (0, import_prisma_vector.getPrismaVector)();
    if (tier === "PRO") {
      rows = await pv.$queryRaw`
        SELECT id, content, category, source_date AS "sourceDate"
        FROM   user_memories
        WHERE  user_id = ${userId}
          AND  source_date >= NOW() - INTERVAL '30 days'
          AND  category != 'aspect_cooldown'
        ORDER  BY embedding <=> ${vec}::vector
        LIMIT  3
      `;
    } else {
      rows = await pv.$queryRaw`
        SELECT id, content, category, source_date AS "sourceDate"
        FROM   user_memories
        WHERE  user_id = ${userId}
          AND  category != 'aspect_cooldown'
        ORDER  BY embedding <=> ${vec}::vector
        LIMIT  5
      `;
    }
  } catch (err) {
    console.warn("[MemoryRetrieval] Query failed \u2014 skipping memory injection:", err);
    return [];
  }
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  (0, import_prisma_vector.getPrismaVector)().$executeRaw`
    UPDATE user_memories
    SET    last_recalled_at = NOW()
    WHERE  id = ANY(${ids}::text[])
  `.catch(
    (err) => console.warn("[MemoryRetrieval] last_recalled_at update failed (non-fatal):", err)
  );
  return rows;
}
async function getAspectCooldowns(userId) {
  try {
    const pv = (0, import_prisma_vector.getPrismaVector)();
    const rows = await pv.$queryRaw`
      SELECT content, source_date
      FROM   user_memories
      WHERE  user_id = ${userId}
        AND  category = 'aspect_cooldown'
        AND  source_date >= NOW() - INTERVAL '7 days'
      ORDER  BY source_date DESC
      LIMIT  20
    `;
    const cooldowns = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.content);
        if (typeof parsed === "object" && parsed !== null && typeof parsed.aspect === "string" && (parsed.cooldownLevel === 1 || parsed.cooldownLevel === 2)) {
          cooldowns.push({
            aspect: parsed.aspect,
            cooldownLevel: parsed.cooldownLevel,
            featuredAt: row.source_date
          });
        }
      } catch {
      }
    }
    return cooldowns;
  } catch (err) {
    console.warn("[MemoryRetrieval] getAspectCooldowns failed (non-fatal):", err);
    return [];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAspectCooldowns,
  retrieveOracleMemories
});
