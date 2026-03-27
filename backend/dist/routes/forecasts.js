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
var forecasts_exports = {};
__export(forecasts_exports, {
  default: () => forecasts_default
});
module.exports = __toCommonJS(forecasts_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_queryLimit = require("../middleware/queryLimit");
var import_forecast = require("../services/forecast");
var import_forecast_cron = require("../services/forecast-cron");
var import_transits = require("../services/transits");
var import_prisma = require("../utils/prisma");
const router = (0, import_express.Router)();
router.use(import_auth.authMiddleware);
router.get("/daily", import_queryLimit.queryLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "\u041D\u0435\u043E\u0442\u043E\u0440\u0438\u0437\u0438\u0440\u0430\u043D \u0434\u043E\u0441\u0442\u044A\u043F"
        }
      });
    }
    const lang = req.query.lang || req.user?.language || "bg";
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BIRTH_DATA_MISSING",
          message: "Please add your birth data first to get personalized forecasts"
        }
      });
    }
    const birthDate = new Date(profile.birthDate);
    const [bHour, bMin] = (profile.birthTime || "12:00").split(":").map(Number);
    const birthData = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: bHour || 12,
      minute: bMin || 0,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone || "UTC"
    };
    const storedChart = await import_prisma.prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { chartData: true }
    });
    const precomputedChart = storedChart?.chartData;
    const forecast = await (0, import_forecast.getDailyForecast)(userId, birthData, lang, precomputedChart);
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error("[Forecast] Daily forecast error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "FORECAST_ERROR",
        message: "Failed to generate daily forecast"
      }
    });
  }
});
router.get("/weekly", import_queryLimit.queryLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "\u041D\u0435\u043E\u0442\u043E\u0440\u0438\u0437\u0438\u0440\u0430\u043D \u0434\u043E\u0441\u0442\u044A\u043F"
        }
      });
    }
    const lang = req.query.lang || req.user?.language || "bg";
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BIRTH_DATA_MISSING",
          message: "Please add your birth data first to get personalized forecasts"
        }
      });
    }
    const birthDate = new Date(profile.birthDate);
    const [bHour, bMin] = (profile.birthTime || "12:00").split(":").map(Number);
    const birthData = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: bHour || 12,
      minute: bMin || 0,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone || "UTC"
    };
    const storedChart = await import_prisma.prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { chartData: true }
    });
    const precomputedChart = storedChart?.chartData;
    const forecast = await (0, import_forecast.getWeeklyForecast)(userId, birthData, lang, precomputedChart);
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error("[Forecast] Weekly forecast error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "FORECAST_ERROR",
        message: "Failed to generate weekly forecast"
      }
    });
  }
});
router.get("/transits", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "\u041D\u0435\u043E\u0442\u043E\u0440\u0438\u0437\u0438\u0440\u0430\u043D \u0434\u043E\u0441\u0442\u044A\u043F"
        }
      });
    }
    const birthChart = await import_prisma.prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!birthChart?.chartData) {
      return res.status(400).json({
        success: false,
        error: {
          code: "CHART_NOT_FOUND",
          message: "Natal chart not computed yet. Save your birth data first."
        }
      });
    }
    const transitData = await (0, import_transits.getActiveTransitsForUser)(birthChart.chartData);
    res.json({
      success: true,
      data: {
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        skyPositions: transitData.skyPositions,
        aspectsToNatal: transitData.aspectsToNatal,
        moonPhase: transitData.moonPhase,
        generatedAt: transitData.generatedAt
      }
    });
  } catch (error) {
    console.error("[Forecast] Transits error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "TRANSITS_ERROR",
        message: "Failed to get transits"
      }
    });
  }
});
router.get("/horoscope", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: { code: "BIRTH_DATA_MISSING", message: "Add your birth data first to get your daily horoscope" }
      });
    }
    const birthDate = new Date(profile.birthDate);
    const [hour, minute] = (profile.birthTime || "12:00").split(":").map(Number);
    const birthData = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: hour || 12,
      minute: minute || 0,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone || "UTC"
    };
    const horoscope = await (0, import_forecast.getPersonalDailyHoroscope)(userId, birthData);
    res.json({ success: true, data: horoscope });
  } catch (error) {
    console.error("[Forecast] Horoscope error:", error);
    res.status(500).json({
      success: false,
      error: { code: "HOROSCOPE_ERROR", message: "Failed to generate your daily horoscope" }
    });
  }
});
router.get("/best-days", async (req, res) => {
  try {
    const userId = req.user?.id;
    const tier = req.user?.tier ?? "FREE";
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
    const month = req.query.month;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_MONTH", message: 'Query param "month" required in YYYY-MM format' }
      });
    }
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const mon = parseInt(monthStr, 10);
    const firstDay = `${month}-01`;
    const lastDay = new Date(year, mon, 0).toISOString().split("T")[0];
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let dateFrom = firstDay;
    let dateTo = lastDay;
    if (tier === "FREE") {
      const weekEnd = /* @__PURE__ */ new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      dateFrom = today;
      dateTo = weekEnd.toISOString().split("T")[0];
      if (dateFrom < firstDay) dateFrom = firstDay;
      if (dateTo > lastDay) dateTo = lastDay;
      if (dateFrom > lastDay || dateTo < firstDay) {
        return res.json({ success: true, data: { month, days: [] } });
      }
    }
    const forecasts = await (0, import_forecast_cron.getStoredForecasts)(userId, dateFrom, dateTo);
    const forecastMap = /* @__PURE__ */ new Map();
    for (const f of forecasts) {
      forecastMap.set(f.date, f);
    }
    const days = [];
    const cursor = /* @__PURE__ */ new Date(dateFrom + "T00:00:00Z");
    const end = /* @__PURE__ */ new Date(dateTo + "T00:00:00Z");
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0];
      const stored = forecastMap.get(dateStr);
      const horoscope = stored?.horoscope;
      if (!horoscope || !horoscope.lifeAreas) {
        days.push({
          date: dateStr,
          love: null,
          career: null,
          health: null,
          money: null,
          composite: null,
          color: null,
          transits: [],
          oracleCommentary: null
        });
      } else {
        const areaMap = /* @__PURE__ */ new Map();
        for (const a of horoscope.lifeAreas) {
          areaMap.set(a.area, a.rating);
        }
        const love = areaMap.get("love") ?? null;
        const careerRaw = areaMap.get("career");
        const commRaw = areaMap.get("communication");
        const career = careerRaw != null && commRaw != null ? (careerRaw + commRaw) / 2 : careerRaw ?? commRaw ?? null;
        const healthRaw = areaMap.get("health");
        const identityRaw = areaMap.get("identity");
        const health = healthRaw != null && identityRaw != null ? (healthRaw + identityRaw) / 2 : healthRaw ?? identityRaw ?? null;
        const money = areaMap.get("finance") ?? null;
        const scores = [love, career, health, money].filter((s) => s != null);
        const composite = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 2) / 2 : null;
        const color = composite == null ? null : composite >= 3.5 ? "green" : composite >= 2.5 ? "yellow" : "red";
        const transits = (horoscope.planetaryInfluences ?? []).map((p) => ({
          planet: p.planet,
          aspect: p.aspectType,
          natalPlanet: p.natalPlanet,
          influence: p.strength >= 4 ? "positive" : p.strength <= 2 ? "challenging" : "neutral",
          description: p.description
        }));
        const entry = { date: dateStr, composite, color, transits };
        if (tier === "FREE") {
          entry.love = love;
          entry.career = career;
          entry.health = null;
          entry.money = null;
          entry.transits = [];
          entry.oracleCommentary = null;
        } else {
          entry.love = love;
          entry.career = career;
          entry.health = health;
          entry.money = money;
          if (tier === "PREMIUM") {
            entry.oracleCommentary = horoscope.oracleCommentary ?? null;
          } else {
            entry.oracleCommentary = null;
          }
        }
        days.push(entry);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    res.json({ success: true, data: { month, days } });
  } catch (error) {
    console.error("[Forecast] Best-days error:", error);
    res.status(500).json({
      success: false,
      error: { code: "BEST_DAYS_ERROR", message: "Failed to generate best days calendar" }
    });
  }
});
var forecasts_default = router;
