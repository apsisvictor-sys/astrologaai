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
var solar_return_default = router;
