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
var forecast_cron_exports = {};
__export(forecast_cron_exports, {
  ensureDailyForecastTable: () => ensureDailyForecastTable,
  getStoredForecast: () => getStoredForecast,
  getStoredForecasts: () => getStoredForecasts,
  runNightlyForecastJob: () => runNightlyForecastJob,
  startForecastCron: () => startForecastCron,
  storeForecast: () => storeForecast
});
module.exports = __toCommonJS(forecast_cron_exports);
var import_ai = require("ai");
var import_anthropic = require("@ai-sdk/anthropic");
var import_prisma = require("../utils/prisma");
var import_forecast = require("./forecast");
function todayString() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function ensureDailyForecastTable() {
  try {
    await import_prisma.prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS daily_forecasts (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date         TEXT NOT NULL,
        horoscope    JSONB,
        forecast     JSONB,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, date)
      )
    `;
    await import_prisma.prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS daily_forecasts_date_idx ON daily_forecasts(date)
    `;
    console.log("[ForecastCron] daily_forecasts table ready");
  } catch (err) {
    console.error("[ForecastCron] Failed to ensure table:", err);
  }
}
async function getStoredForecast(userId, date) {
  try {
    const rows = await import_prisma.prisma.$queryRaw`
      SELECT horoscope, forecast
      FROM   daily_forecasts
      WHERE  user_id = ${userId}
      AND    date    = ${date}
      LIMIT  1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
async function storeForecast(userId, date, horoscope, forecast) {
  try {
    await import_prisma.prisma.$executeRaw`
      INSERT INTO daily_forecasts (id, user_id, date, horoscope, forecast, generated_at)
      VALUES (gen_random_uuid()::text, ${userId}, ${date}, ${horoscope}::jsonb, ${forecast}::jsonb, now())
      ON CONFLICT (user_id, date) DO UPDATE
        SET horoscope    = EXCLUDED.horoscope,
            forecast     = EXCLUDED.forecast,
            generated_at = now()
    `;
  } catch (err) {
    console.error(`[ForecastCron] Failed to store forecast for ${userId}:`, err);
  }
}
async function getStoredForecasts(userId, dateFrom, dateTo) {
  try {
    return await import_prisma.prisma.$queryRaw`
      SELECT date, horoscope, forecast
      FROM   daily_forecasts
      WHERE  user_id = ${userId}
      AND    date >= ${dateFrom}
      AND    date <= ${dateTo}
      ORDER BY date ASC
    `;
  } catch {
    return [];
  }
}
function addDays(dateStr, days) {
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}
function toBirthData(user) {
  if (!user.birthProfile) return null;
  const birthDate = new Date(user.birthProfile.birthDate);
  const [hour, minute] = (user.birthProfile.birthTime || "12:00").split(":").map(Number);
  return {
    year: birthDate.getFullYear(),
    month: birthDate.getMonth() + 1,
    day: birthDate.getDate(),
    hour: hour || 12,
    minute: minute || 0,
    latitude: user.birthProfile.latitude,
    longitude: user.birthProfile.longitude,
    timezone: user.birthProfile.timezone || "UTC"
  };
}
async function generateForUser(user) {
  if (!user.birthProfile) return;
  const date = todayString();
  const existing = await getStoredForecast(user.id, date);
  if (existing?.horoscope && existing?.forecast) {
    if (user.tier === "PREMIUM") {
      const existingForecast = existing.forecast;
      if (!existingForecast?.oracleInsight) {
        const insight = await generateOracleInsight(existingForecast, user.language);
        if (insight) {
          await storeForecast(user.id, date, existing.horoscope, { ...existingForecast, oracleInsight: insight });
        }
      }
    }
    return;
  }
  const birthData = toBirthData(user);
  let horoscope = null;
  let forecast = null;
  try {
    horoscope = await (0, import_forecast.getPersonalDailyHoroscope)(user.id, birthData);
  } catch (err) {
    console.warn(`[ForecastCron] Horoscope failed for ${user.id}:`, err);
  }
  try {
    forecast = await (0, import_forecast.generateDailyForecast)(user.id, birthData, user.language);
  } catch (err) {
    console.warn(`[ForecastCron] Forecast failed for ${user.id}:`, err);
  }
  if (user.tier === "PREMIUM" && forecast) {
    try {
      const insight = await generateOracleInsight(forecast, user.language);
      if (insight) forecast = { ...forecast, oracleInsight: insight };
    } catch (err) {
      console.warn(`[ForecastCron] Oracle Insight failed for ${user.id}:`, err);
    }
  }
  if (horoscope || forecast) {
    await storeForecast(user.id, date, horoscope, forecast);
    console.log(`[ForecastCron] Generated for user ${user.id}${user.tier === "PREMIUM" ? " (+ Oracle Insight)" : ""}`);
  }
}
const LOOKAHEAD_DAYS = 7;
async function generateLookaheadForUser(user) {
  if (!user.birthProfile) return;
  const birthData = toBirthData(user);
  const today = todayString();
  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset++) {
    const dateStr = addDays(today, offset);
    const existing = await getStoredForecast(user.id, dateStr);
    if (existing?.horoscope) {
      if (user.tier === "PREMIUM") {
        const h = existing.horoscope;
        if (!h.oracleCommentary) {
          const commentary = await generateOracleCommentary(h, user.language);
          if (commentary) {
            await storeForecast(user.id, dateStr, { ...h, oracleCommentary: commentary }, existing.forecast);
          }
        }
      }
      continue;
    }
    try {
      const horoscope = await (0, import_forecast.getPersonalDailyHoroscope)(user.id, birthData, dateStr);
      if (user.tier === "PREMIUM") {
        const commentary = await generateOracleCommentary(horoscope, user.language);
        if (commentary) {
          horoscope.oracleCommentary = commentary;
        }
      }
      await storeForecast(user.id, dateStr, horoscope, null);
      console.log(`[ForecastCron] Lookahead ${dateStr} generated for ${user.id}`);
    } catch (err) {
      console.warn(`[ForecastCron] Lookahead ${dateStr} failed for ${user.id}:`, err);
    }
    await delay(1e3);
  }
}
async function generateOracleInsight(forecast, language) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const moonPhase = forecast?.moonPhase?.phase || forecast?.moonPhase?.phaseBg || "current moon phase";
  const energy = forecast?.energy || "moderate";
  const topTransit = forecast?.transits?.[0];
  const transitDesc = topTransit ? `${topTransit.planet} in ${topTransit.sign}` : "current transits";
  const prompt = language === "bg" ? `\u0422\u0438 \u0441\u0438 \u043C\u044A\u0434\u044A\u0440 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u043D \u043E\u0440\u0430\u043A\u0443\u043B. \u041D\u0430\u043F\u0438\u0448\u0438 \u0422\u041E\u0427\u041D\u041E \u0415\u0414\u041D\u041E \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u0435 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 25 \u0434\u0443\u043C\u0438) \u2014 \u0434\u044A\u043B\u0431\u043E\u043A\u043E, \u043F\u043E\u0435\u0442\u0438\u0447\u043D\u043E \u043F\u043E\u0441\u043B\u0430\u043D\u0438\u0435 \u0437\u0430 \u0434\u0435\u043D\u044F, \u0432\u0434\u044A\u0445\u043D\u043E\u0432\u0435\u043D\u043E \u043E\u0442: \u043B\u0443\u043D\u0430 ${moonPhase}, \u0435\u043D\u0435\u0440\u0433\u0438\u044F ${energy}, ${transitDesc}. \u0421\u0430\u043C\u043E \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u0435\u0442\u043E, \u0431\u0435\u0437 \u0432\u0441\u0442\u044A\u043F\u043B\u0435\u043D\u0438\u0435.` : `You are a wise astrological Oracle. Write EXACTLY ONE sentence (max 25 words) \u2014 a deep, poetic message for today inspired by: ${moonPhase} moon, ${energy} energy, ${transitDesc}. Just the sentence, no preamble.`;
  try {
    const result = await (0, import_ai.generateText)({
      model: (0, import_anthropic.anthropic)("claude-haiku-4-5-20251001"),
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      maxTokens: 80
    });
    return result.text.trim().replace(/^["']|["']$/g, "");
  } catch (err) {
    console.warn("[ForecastCron] Oracle Insight generation error:", err);
    return null;
  }
}
async function generateOracleCommentary(horoscope, language) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const areas = (horoscope?.lifeAreas ?? []).map((a) => `${a.area}: ${a.rating}/5`).join(", ");
  const topInfluence = horoscope?.planetaryInfluences?.[0];
  const transitDesc = topInfluence ? `${topInfluence.planet} ${topInfluence.aspectType} ${topInfluence.natalPlanet}` : "current transits";
  const prompt = language === "bg" ? `\u0422\u0438 \u0441\u0438 \u043C\u044A\u0434\u044A\u0440 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u043D \u043E\u0440\u0430\u043A\u0443\u043B. \u041D\u0430\u043F\u0438\u0448\u0438 2-3 \u043A\u0440\u0430\u0442\u043A\u0438 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F (\u043C\u0430\u043A\u0441 50 \u0434\u0443\u043C\u0438) \u2014 \u043F\u043E\u0435\u0442\u0438\u0447\u043D\u043E \u043F\u043E\u0441\u043B\u0430\u043D\u0438\u0435 \u0437\u0430 \u0434\u0435\u043D\u044F. \u041E\u0431\u043B\u0430\u0441\u0442\u0438: ${areas}. \u041A\u043B\u044E\u0447\u043E\u0432 \u0442\u0440\u0430\u043D\u0437\u0438\u0442: ${transitDesc}. \u0421\u0430\u043C\u043E \u0442\u0435\u043A\u0441\u0442\u0430, \u0431\u0435\u0437 \u0432\u0441\u0442\u044A\u043F\u043B\u0435\u043D\u0438\u0435.` : `You are a wise astrological Oracle. Write 2-3 short sentences (max 50 words) \u2014 a poetic daily message. Areas: ${areas}. Key transit: ${transitDesc}. Just the text, no preamble.`;
  try {
    const result = await (0, import_ai.generateText)({
      model: (0, import_anthropic.anthropic)("claude-haiku-4-5-20251001"),
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      maxTokens: 120
    });
    return result.text.trim().replace(/^["']|["']$/g, "");
  } catch (err) {
    console.warn("[ForecastCron] Oracle Commentary generation error:", err);
    return null;
  }
}
let lastRunDate = "";
async function runNightlyForecastJob() {
  const date = todayString();
  if (lastRunDate === date) {
    console.log("[ForecastCron] Already ran today, skipping");
    return;
  }
  console.log(`[ForecastCron] Starting nightly generation for ${date}`);
  lastRunDate = date;
  let users;
  try {
    const rawUsers = await import_prisma.prisma.user.findMany({
      where: {
        tier: { in: ["PRO", "PREMIUM"] },
        birthProfiles: { some: {} },
        isSuspended: false
      },
      select: {
        id: true,
        language: true,
        tier: true,
        birthProfiles: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { birthDate: true, birthTime: true, latitude: true, longitude: true, timezone: true }
        }
      }
    });
    users = rawUsers.map((u) => ({
      id: u.id,
      language: u.language,
      tier: u.tier,
      birthProfile: u.birthProfiles[0] ?? null
    }));
  } catch (err) {
    console.error("[ForecastCron] Failed to fetch users:", err);
    lastRunDate = "";
    return;
  }
  console.log(`[ForecastCron] Processing ${users.length} paid users`);
  for (const user of users) {
    try {
      await generateForUser(user);
    } catch (err) {
      console.error(`[ForecastCron] Unexpected error for user ${user.id}:`, err);
    }
    await delay(2e3);
  }
  console.log(`[ForecastCron] Starting 7-day lookahead for ${users.length} users`);
  for (const user of users) {
    try {
      await generateLookaheadForUser(user);
    } catch (err) {
      console.error(`[ForecastCron] Lookahead error for user ${user.id}:`, err);
    }
    await delay(2e3);
  }
  console.log(`[ForecastCron] Done for ${date} (today + ${LOOKAHEAD_DAYS}-day lookahead)`);
}
function startForecastCron() {
  console.log("[ForecastCron] Scheduler started \u2014 will run daily at 02:00 UTC");
  const checkAndRun = () => {
    const now = /* @__PURE__ */ new Date();
    const hourUtc = now.getUTCHours();
    if (hourUtc === 2) {
      runNightlyForecastJob().catch(
        (err) => console.error("[ForecastCron] Job error:", err)
      );
    }
  };
  setInterval(checkAndRun, 60 * 60 * 1e3);
  checkAndRun();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ensureDailyForecastTable,
  getStoredForecast,
  getStoredForecasts,
  runNightlyForecastJob,
  startForecastCron,
  storeForecast
});
