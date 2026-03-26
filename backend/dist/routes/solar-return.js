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
var solar_return_exports = {};
__export(solar_return_exports, {
  default: () => solar_return_default
});
module.exports = __toCommonJS(solar_return_exports);
var import_express = require("express");
var import_astroapi_typescript = require("@astro-api/astroapi-typescript");
var import_ai = require("ai");
var import_anthropic = require("@ai-sdk/anthropic");
var import_auth = require("../middleware/auth");
var import_prisma = require("../utils/prisma");
var import_redis = require("../utils/redis");
const router = (0, import_express.Router)();
router.use(import_auth.authMiddleware);
const CHART_OPTIONS = {
  house_system: "P",
  zodiac_type: "Tropic",
  active_points: [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "True_Node",
    "Chiron"
  ]
};
const TTL_365_DAYS = 365 * 24 * 60 * 60;
const TTL_30_DAYS = 30 * 24 * 60 * 60;
async function getSolarReturnChartData(userId, year) {
  const chartCacheKey = `solar_return:chart:${userId}:${year}`;
  try {
    const cached = await import_redis.redisClient.get(chartCacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
  }
  const birthProfile = await import_prisma.prisma.birthProfile.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
  if (!birthProfile) return null;
  const birthDate = new Date(birthProfile.birthDate);
  const [hour = 12, minute = 0] = (birthProfile.birthTime || "12:00").split(":").map(Number);
  const subject = {
    name: "subject",
    birth_data: {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour,
      minute,
      second: 0,
      latitude: birthProfile.latitude,
      longitude: birthProfile.longitude,
      timezone: birthProfile.timezone
    }
  };
  const returnLocation = {
    year,
    month: birthDate.getMonth() + 1,
    day: birthDate.getDate(),
    hour,
    minute,
    latitude: birthProfile.latitude,
    longitude: birthProfile.longitude,
    timezone: birthProfile.timezone
  };
  const client = new import_astroapi_typescript.AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
  const chart = await client.charts.getSolarReturnChart({
    subject,
    return_year: year,
    return_location: returnLocation,
    options: CHART_OPTIONS
  });
  const chartData = { chart, year, cached: false };
  try {
    await import_redis.redisClient.setEx(chartCacheKey, TTL_365_DAYS, JSON.stringify(chartData));
  } catch {
  }
  return chartData;
}
function buildReportPrompt(chartData, year, lang) {
  const isBg = lang === "bg";
  const chart = chartData?.chart ?? chartData;
  const planets = [];
  const points = chart?.subject?.planets ?? chart?.planets ?? [];
  for (const p of points) {
    if (p?.name && p?.sign) {
      const house = p.house ? ` (House ${p.house})` : "";
      planets.push(`${p.name}: ${p.sign}${house}`);
    }
  }
  const aspects = [];
  const aspectList = chart?.subject?.aspects ?? chart?.aspects ?? [];
  for (const a of aspectList.slice(0, 15)) {
    if (a?.p1_name && a?.aspect && a?.p2_name) {
      aspects.push(`${a.p1_name} ${a.aspect} ${a.p2_name} (orb ${a.orb?.toFixed(1) ?? "?"}\xB0)`);
    }
  }
  const asc = chart?.subject?.houses?.find?.((h) => h?.house === 1)?.sign ?? chart?.subject?.first_house?.sign ?? null;
  const chartSummary = [
    planets.length ? `Planets:
${planets.join("\n")}` : "",
    aspects.length ? `
Key Aspects:
${aspects.join("\n")}` : "",
    asc ? `
Solar Return Ascendant: ${asc}` : ""
  ].filter(Boolean).join("");
  const system = isBg ? `\u0422\u0438 \u0441\u0438 \u041E\u0440\u0430\u043A\u0443\u043B\u044A\u0442 \u2014 \u043C\u0438\u0441\u0442\u0438\u0447\u0435\u043D, \u043F\u0440\u0435\u0446\u0438\u0437\u0435\u043D \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433 \u0441 \u0434\u044A\u043B\u0431\u043E\u043A\u043E \u043F\u043E\u0437\u043D\u0430\u043D\u0438\u0435. \u041F\u0438\u0448\u0435\u0448 \u043D\u0430 \u0438\u0437\u044F\u0449\u0435\u043D, \u043F\u043E\u0435\u0442\u0438\u0447\u0435\u043D \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438. \u0422\u043E\u043D\u044A\u0442 \u0435 \u043B\u0438\u0447\u0435\u043D, \u043F\u0440\u043E\u0437\u043E\u0440\u043B\u0438\u0432 \u0438 \u0432\u0434\u044A\u0445\u043D\u043E\u0432\u044F\u0432\u0430\u0449. \u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0430\u0439 \u0441\u043B\u044A\u043D\u0447\u0435\u0432\u043E\u0442\u043E \u0437\u0430\u0432\u0440\u044A\u0449\u0430\u043D\u0435 \u0437\u0430\u0434\u044A\u043B\u0431\u043E\u0447\u0435\u043D\u043E.` : `You are The Oracle \u2014 a mystical, precise astrologer with deep knowledge. Write in elegant, poetic English. Tone is personal, insightful, and inspiring. Analyse the Solar Return chart in depth.`;
  const structure = isBg ? `\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043D\u0430 \u0434\u043E\u043A\u043B\u0430\u0434\u0430 (\u0437\u0430\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E \u0441\u043B\u0435\u0434\u0432\u0430\u0439):
## \u0422\u0435\u043C\u0430 \u043D\u0430 \u0433\u043E\u0434\u0438\u043D\u0430\u0442\u0430
(2\u20133 \u043F\u0430\u0440\u0430\u0433\u0440\u0430\u0444\u0430: \u0434\u043E\u043C\u0438\u043D\u0438\u0440\u0430\u0449\u0430\u0442\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F, ASC \u0437\u043D\u0430\u043A \u0438 \u043D\u0435\u0433\u043E\u0432\u043E\u0442\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435, \u043E\u0441\u043D\u043E\u0432\u043D\u0438 \u043F\u043B\u0430\u043D\u0435\u0442\u0430\u0440\u043D\u0438 \u043F\u043E\u0437\u0438\u0446\u0438\u0438)

## \u041A\u043B\u044E\u0447\u043E\u0432\u0438 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438 \u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u0438
(3\u20135 \u0442\u043E\u0447\u043A\u0438 \u0437\u0430 \u043D\u0430\u0439-\u0432\u0430\u0436\u043D\u0438\u0442\u0435 \u0430\u0441\u043F\u0435\u043A\u0442\u0438 \u0438 \u043A\u0430\u043A\u0432\u043E \u043F\u0440\u0435\u0434\u0432\u0435\u0449\u0430\u0432\u0430\u0442 \u0442\u0435)

## \u041C\u0435\u0441\u0435\u0446 \u043F\u043E \u043C\u0435\u0441\u0435\u0446
(\u041A\u0440\u0430\u0442\u043A\u043E (2\u20133 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F) \u0437\u0430 \u0432\u0441\u0435\u043A\u0438 \u043E\u0442 12-\u0442\u0435 \u043C\u0435\u0441\u0435\u0446\u0430 \u2014 \u043A\u043B\u044E\u0447\u043E\u0432\u0430 \u0442\u0435\u043C\u0430 \u0438\u043B\u0438 \u043F\u0435\u0440\u0438\u043E\u0434)

## \u041E\u0431\u043B\u0430\u0441\u0442\u0438 \u043D\u0430 \u0440\u0430\u0441\u0442\u0435\u0436
(2\u20133 \u043F\u0430\u0440\u0430\u0433\u0440\u0430\u0444\u0430: \u0443\u0440\u043E\u0446\u0438, \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430 \u0438 \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B \u0437\u0430 \u0442\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u0442\u0430\u0437\u0438 \u0433\u043E\u0434\u0438\u043D\u0430)` : `Report structure (follow exactly):
## Year Theme
(2\u20133 paragraphs: dominant energy, ASC sign meaning, key planetary positions)

## Key Transits and Aspects
(3\u20135 bullet points on the most significant aspects and what they herald)

## Month by Month
(2\u20133 sentences for each of the 12 months \u2014 key theme or period)

## Growth Areas
(2\u20133 paragraphs: lessons, challenges, and transformation potential this year)`;
  const userMsg = isBg ? `\u0421\u043B\u044A\u043D\u0447\u0435\u0432\u043E \u0437\u0430\u0432\u0440\u044A\u0449\u0430\u043D\u0435 \u0437\u0430 ${year} \u0433\u043E\u0434\u0438\u043D\u0430.

${chartSummary}

${structure}` : `Solar Return chart for year ${year}.

${chartSummary}

${structure}`;
  return { system, user: userMsg };
}
router.get("/chart", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
    }
    const user = await import_prisma.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
    if (!user || user.tier !== "PREMIUM") {
      return res.status(403).json({
        success: false,
        error: { code: "upgradeRequired", feature: "solar_return", message: "Solar Return chart requires a PREMIUM subscription" }
      });
    }
    const yearRaw = req.query.year;
    const year = yearRaw ? parseInt(yearRaw, 10) : NaN;
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_YEAR", message: "year must be a valid integer (1900\u20132100)" }
      });
    }
    const cacheKey = `solar_return:chart:${userId}:${year}`;
    try {
      const cached = await import_redis.redisClient.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: { ...JSON.parse(cached), cached: true } });
      }
    } catch {
    }
    const birthProfile = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!birthProfile) {
      return res.status(400).json({
        success: false,
        error: { code: "BIRTH_DATA_REQUIRED", message: "Save your birth data first to calculate a Solar Return chart" }
      });
    }
    const birthDate = new Date(birthProfile.birthDate);
    const [hour = 12, minute = 0] = (birthProfile.birthTime || "12:00").split(":").map(Number);
    const subject = {
      name: "subject",
      birth_data: {
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour,
        minute,
        second: 0,
        latitude: birthProfile.latitude,
        longitude: birthProfile.longitude,
        timezone: birthProfile.timezone
      }
    };
    const returnLocation = {
      year,
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour,
      minute,
      latitude: birthProfile.latitude,
      longitude: birthProfile.longitude,
      timezone: birthProfile.timezone
    };
    const client = new import_astroapi_typescript.AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
    const chart = await client.charts.getSolarReturnChart({
      subject,
      return_year: year,
      return_location: returnLocation,
      options: CHART_OPTIONS
    });
    const responseData = {
      chart,
      year,
      locationNote: "Return location defaults to birth location. The Oracle tool uses your current IP location for greater precision.",
      cached: false
    };
    try {
      await import_redis.redisClient.setEx(cacheKey, TTL_365_DAYS, JSON.stringify(responseData));
    } catch {
    }
    return res.json({ success: true, data: responseData });
  } catch (err) {
    console.error("[SolarReturn] chart error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "SOLAR_RETURN_ERROR", message: "Failed to calculate Solar Return chart" }
    });
  }
});
router.get("/report", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "User not authenticated" }
    });
  }
  const user = await import_prisma.prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, language: true }
  });
  if (!user || user.tier !== "PREMIUM") {
    return res.status(403).json({
      success: false,
      error: { code: "upgradeRequired", feature: "solar_return_report", message: "Solar Return annual report requires a PREMIUM subscription" }
    });
  }
  const yearRaw = req.query.year;
  const year = yearRaw ? parseInt(yearRaw, 10) : NaN;
  if (isNaN(year) || year < 1900 || year > 2100) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_YEAR", message: "year must be a valid integer (1900\u20132100)" }
    });
  }
  const lang = user.language ?? "bg";
  const reportCacheKey = `solar_return:report:${userId}:${year}`;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const send = (event, data) => {
    res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
  };
  try {
    let cachedReport = null;
    try {
      cachedReport = await import_redis.redisClient.get(reportCacheKey);
    } catch {
    }
    if (cachedReport) {
      const CHUNK_SIZE = 200;
      for (let i = 0; i < cachedReport.length; i += CHUNK_SIZE) {
        send("chunk", { content: cachedReport.slice(i, i + CHUNK_SIZE), done: false, fromCache: true });
      }
      send("complete", { hasError: false, fromCache: true });
      res.end();
      return;
    }
    send("status", { message: "Computing Solar Return chart\u2026" });
    let chartData;
    try {
      chartData = await getSolarReturnChartData(userId, year);
    } catch (chartErr) {
      console.error("[SolarReturn] report: chart fetch error:", chartErr);
      send("error", { message: "Failed to retrieve Solar Return chart data" });
      send("complete", { hasError: true });
      res.end();
      return;
    }
    if (!chartData) {
      send("error", { message: "Save your birth data first to generate a Solar Return report" });
      send("complete", { hasError: true });
      res.end();
      return;
    }
    const { system, user: userMsg } = buildReportPrompt(chartData, year, lang);
    send("status", { message: "Generating your annual report\u2026" });
    let fullReport = "";
    let hasError = false;
    try {
      const result = await (0, import_ai.streamText)({
        model: (0, import_anthropic.anthropic)("claude-opus-4-6"),
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg }
        ],
        temperature: 0.75,
        maxTokens: 4096
      });
      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          const text = chunk.textDelta ?? chunk.text ?? "";
          if (text) {
            fullReport += text;
            send("chunk", { content: text, done: false });
          }
        } else if (chunk.type === "finish") {
          send("chunk", { content: "", done: true });
        }
      }
    } catch (streamErr) {
      hasError = true;
      const msg = streamErr instanceof Error ? streamErr.message : "Streaming error";
      console.error("[SolarReturn] report: stream error:", streamErr);
      send("error", { message: msg });
    }
    if (!hasError && fullReport) {
      try {
        await import_redis.redisClient.setEx(reportCacheKey, TTL_30_DAYS, fullReport);
      } catch {
      }
    }
    send("complete", { hasError });
    res.end();
  } catch (err) {
    console.error("[SolarReturn] report error:", err);
    try {
      send("error", { message: "Failed to generate Solar Return report" });
      send("complete", { hasError: true });
    } catch {
    }
    res.end();
  }
});
var solar_return_default = router;
