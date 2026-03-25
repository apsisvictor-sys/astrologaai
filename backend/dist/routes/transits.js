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
var transits_exports = {};
__export(transits_exports, {
  default: () => transits_default
});
module.exports = __toCommonJS(transits_exports);
var import_express = require("express");
var import_astrological_events = require("../config/astrological-events");
var import_redis = require("../utils/redis");
var import_auth = require("../middleware/auth");
var import_prisma = require("../utils/prisma");
var import_ai = require("ai");
var import_anthropic = require("@ai-sdk/anthropic");
var import_llm = require("../services/llm");
var import_transits = require("../services/transits");
const router = (0, import_express.Router)();
router.get("/current-events", async (req, res) => {
  try {
    const cacheKey = `transits:current_events:${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });
    const events = (0, import_astrological_events.getCurrentEvents)();
    await import_redis.redisClient.setEx(cacheKey, 60 * 60, JSON.stringify(events));
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error("[Transits] current-events error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to get current events" } });
  }
});
router.get("/commentary", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
    const tier = req.user?.tier ?? "FREE";
    const lang = req.user?.language ?? "bg";
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const cacheKey = `transit:commentary:${userId}:${dateStr}`;
    try {
      const cached = await import_redis.redisClient.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached) });
      }
    } catch {
    }
    const birthChart = await import_prisma.prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!birthChart?.chartData) {
      return res.status(400).json({
        success: false,
        error: { code: "CHART_NOT_FOUND", message: "Natal chart not computed yet. Save your birth data first." }
      });
    }
    const { aspectsToNatal } = await (0, import_transits.getActiveTransitsForUser)(birthChart.chartData);
    const PLANET_RANK = {
      pluto: 0,
      neptune: 1,
      uranus: 2,
      chiron: 3,
      saturn: 4,
      jupiter: 5,
      mars: 6,
      venus: 7,
      mercury: 8,
      sun: 9,
      moon: 10,
      northNode: 11,
      southNode: 12
    };
    const ranked = [...aspectsToNatal].sort((a, b) => {
      const rankDiff = (PLANET_RANK[a.transitPlanet] ?? 99) - (PLANET_RANK[b.transitPlanet] ?? 99);
      if (rankDiff !== 0) return rankDiff;
      return a.orb - b.orb;
    });
    const topCount = tier === "FREE" ? 3 : tier === "PRO" ? 5 : ranked.length;
    const topAspects = ranked.slice(0, topCount);
    const isBg = lang === "bg";
    const depthInstruction = tier === "PREMIUM" ? isBg ? "\u041D\u0430\u043F\u0438\u0448\u0438 \u0437\u0430\u0434\u044A\u043B\u0431\u043E\u0447\u0435\u043D \u0430\u043D\u0430\u043B\u0438\u0437 \u0432 3-4 \u043F\u0430\u0440\u0430\u0433\u0440\u0430\u0444\u0430, \u043F\u043E\u043A\u0440\u0438\u0432\u0430\u0439\u043A\u0438 \u0432\u0441\u0438\u0447\u043A\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u0438 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438." : "Write a deep analysis in 3-4 paragraphs covering all active transits." : isBg ? "\u041D\u0430\u043F\u0438\u0448\u0438 \u043A\u0440\u0430\u0442\u043A\u043E \u0442\u044A\u043B\u043A\u0443\u0432\u0430\u043D\u0435 \u0432 2 \u043F\u0430\u0440\u0430\u0433\u0440\u0430\u0444\u0430." : "Write a concise interpretation in 2 paragraphs.";
    const aspectLines = topAspects.map(
      (a) => `${a.transitPlanetBg} ${a.aspectBg} natal ${a.natalPlanetBg} (orb ${a.orb}\xB0, ${a.influence})`
    ).join("\n");
    const systemPrompt = isBg ? `\u0422\u0438 \u0441\u0438 \u041E\u0440\u0430\u043A\u0443\u043B\u044A\u0442 \u2014 \u043C\u0438\u0441\u0442\u0438\u0447\u0435\u043D, \u043F\u0440\u0435\u0446\u0438\u0437\u0435\u043D \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433 \u0441 \u0434\u044A\u043B\u0431\u043E\u043A\u043E \u043F\u043E\u0437\u043D\u0430\u043D\u0438\u0435. \u041F\u0438\u0448\u0435\u0448 \u043D\u0430 \u0438\u0437\u044F\u0449\u0435\u043D \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438. \u0422\u043E\u043D\u044A\u0442 \u0435 \u043F\u043E\u0435\u0442\u0438\u0447\u0435\u043D, \u043B\u0438\u0447\u0435\u043D \u0438 \u043F\u0440\u043E\u0437\u043E\u0440\u043B\u0438\u0432.` : `You are The Oracle \u2014 a mystical, precise astrologer with deep knowledge. Write in elegant English. Tone is poetic, personal, and insightful.`;
    const userPrompt = isBg ? `\u0410\u043A\u0442\u0438\u0432\u043D\u0438 \u043F\u043B\u0430\u043D\u0435\u0442\u0430\u0440\u043D\u0438 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438 \u043A\u044A\u043C natal \u043A\u0430\u0440\u0442\u0430\u0442\u0430 \u0437\u0430 ${dateStr}:
${aspectLines}

${depthInstruction}

\u0412\u044A\u0440\u043D\u0438 \u0421\u0410\u041C\u041E \u0432\u0430\u043B\u0438\u0434\u0435\u043D JSON (\u0431\u0435\u0437 markdown):
{"headline":"<1 \u0440\u0435\u0434, \u0437\u0430\u0432\u043B\u0430\u0434\u044F\u0432\u0430\u0449\u043E \u0440\u0435\u0437\u044E\u043C\u0435>","body":"<\u043E\u0441\u043D\u043E\u0432\u0435\u043D \u0442\u0435\u043A\u0441\u0442>","significantAspects":["<\u043A\u0440\u0430\u0442\u043A\u043E \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0430 \u0430\u0441\u043F\u0435\u043A\u0442>","..."]}` : `Active planetary transits to natal chart for ${dateStr}:
${aspectLines}

${depthInstruction}

Return ONLY valid JSON (no markdown):
{"headline":"<1-line compelling summary>","body":"<main text>","significantAspects":["<brief aspect description>","..."]}`;
    const modelId = (0, import_llm.getModelIdForTier)(tier);
    const model = modelId.startsWith("claude-") ? (0, import_anthropic.anthropic)(modelId) : (0, import_anthropic.anthropic)("claude-haiku-4-5-20251001");
    const result = await (0, import_ai.generateText)({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7
    });
    const text = result.text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("[Commentary] No JSON in LLM response");
    const parsed = JSON.parse(match[0]);
    const commentary = {
      headline: parsed.headline ?? "",
      body: parsed.body ?? "",
      significantAspects: Array.isArray(parsed.significantAspects) ? parsed.significantAspects : [],
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      await import_redis.redisClient.setEx(cacheKey, 26 * 60 * 60, JSON.stringify(commentary));
    } catch {
    }
    return res.json({ success: true, data: commentary });
  } catch (err) {
    console.error("[Transits] Commentary error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "COMMENTARY_ERROR", message: "Failed to generate transit commentary" }
    });
  }
});
var transits_default = router;
