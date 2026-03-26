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
var embedding_exports = {};
__export(embedding_exports, {
  embedBatch: () => embedBatch,
  embedText: () => embedText
});
module.exports = __toCommonJS(embedding_exports);
var import_ai = require("ai");
var import_openai = require("@ai-sdk/openai");
const EMBEDDING_MODEL = import_openai.openai.embedding("text-embedding-3-small");
const embeddingCache = /* @__PURE__ */ new Map();
async function embedText(text) {
  const cached = embeddingCache.get(text);
  if (cached) return cached;
  const { embedding } = await (0, import_ai.embed)({
    model: EMBEDDING_MODEL,
    value: text
  });
  embeddingCache.set(text, embedding);
  return embedding;
}
async function embedBatch(texts) {
  if (texts.length === 0) return [];
  const uncachedTexts = [];
  const uncachedSet = /* @__PURE__ */ new Set();
  for (const text of texts) {
    if (!embeddingCache.has(text) && !uncachedSet.has(text)) {
      uncachedTexts.push(text);
      uncachedSet.add(text);
    }
  }
  if (uncachedTexts.length > 0) {
    const { embeddings } = await (0, import_ai.embedMany)({
      model: EMBEDDING_MODEL,
      values: uncachedTexts
    });
    for (let i = 0; i < uncachedTexts.length; i++) {
      embeddingCache.set(uncachedTexts[i], embeddings[i]);
    }
  }
  return texts.map((text) => embeddingCache.get(text));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  embedBatch,
  embedText
});
