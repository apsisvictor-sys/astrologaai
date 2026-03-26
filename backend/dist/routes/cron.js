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
var cron_exports = {};
__export(cron_exports, {
  default: () => cron_default
});
module.exports = __toCommonJS(cron_exports);
var import_express = require("express");
var import_cron = require("../utils/cron");
var import_lifecycle = require("../services/email/lifecycle");
var import_streakService = require("../services/streakService");
var import_forecast_cron = require("../services/forecast-cron");
var import_transits = require("../services/transits");
var import_horoscope_email = require("../services/email/horoscope-email");
var import_morning_briefing_email = require("../services/email/morning-briefing-email");
var import_memory_extraction_cron = require("../services/memory-extraction-cron");
const router = (0, import_express.Router)();
router.post("/email-lifecycle", async (req, res) => {
  try {
    const configuredSecret = (0, import_cron.getCronSecret)();
    if (!configuredSecret) {
      return res.status(503).json({
        success: false,
        error: {
          code: "CRON_NOT_CONFIGURED",
          message: "Cron secret is not configured on this environment"
        }
      });
    }
    const cronSecret = req.headers["x-cron-secret"];
    if (cronSecret !== configuredSecret) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or missing cron secret"
        }
      });
    }
    const result = await (0, import_lifecycle.runLifecycleCron)();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[Cron] email-lifecycle error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "CRON_ERROR",
        message: "Lifecycle cron failed"
      }
    });
  }
});
router.post("/streak-maintenance", async (req, res) => {
  try {
    const configuredSecret = (0, import_cron.getCronSecret)();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: "CRON_NOT_CONFIGURED", message: "Cron secret is not configured" } });
    }
    if (req.headers["x-cron-secret"] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } });
    }
    const reverted = await (0, import_streakService.revertExpiredTrials)();
    return res.json({ success: true, data: { trialsReverted: reverted } });
  } catch (error) {
    console.error("[Cron] streak-maintenance error:", error);
    return res.status(500).json({ success: false, error: { code: "CRON_ERROR", message: "Streak maintenance failed" } });
  }
});
router.post("/daily-transits", async (req, res) => {
  try {
    const configuredSecret = (0, import_cron.getCronSecret)();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: "CRON_NOT_CONFIGURED", message: "Cron secret is not configured" } });
    }
    if (req.headers["x-cron-secret"] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } });
    }
    const result = await (0, import_transits.warmDailyTransitsCache)();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[Cron] daily-transits error:", error);
    return res.status(500).json({ success: false, error: { code: "CRON_ERROR", message: "Daily transits warm-up failed" } });
  }
});
router.post("/daily-forecasts", async (req, res) => {
  try {
    const configuredSecret = (0, import_cron.getCronSecret)();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: "CRON_NOT_CONFIGURED", message: "Cron secret is not configured" } });
    }
    if (req.headers["x-cron-secret"] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } });
    }
    (0, import_forecast_cron.runNightlyForecastJob)().catch((err) => console.error("[Cron] daily-forecasts job error:", err));
    return res.json({ success: true, message: "Forecast generation started" });
  } catch (error) {
    console.error("[Cron] daily-forecasts error:", error);
    return res.status(500).json({ success: false, error: { code: "CRON_ERROR", message: "Daily forecasts cron failed" } });
  }
});
router.post("/daily-horoscope-emails", async (req, res) => {
  try {
    const configuredSecret = (0, import_cron.getCronSecret)();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: "CRON_NOT_CONFIGURED", message: "Cron secret is not configured" } });
    }
    if (req.headers["x-cron-secret"] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } });
    }
    const result = await (0, import_horoscope_email.sendDailyHoroscopeEmails)();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[Cron] daily-horoscope-emails error:", error);
    return res.status(500).json({ success: false, error: { code: "CRON_ERROR", message: "Daily horoscope emails cron failed" } });
  }
});
router.post("/morning-briefing-emails", async (req, res) => {
  try {
    const configuredSecret = (0, import_cron.getCronSecret)();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: "CRON_NOT_CONFIGURED", message: "Cron secret is not configured" } });
    }
    if (req.headers["x-cron-secret"] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } });
    }
    const result = await (0, import_morning_briefing_email.sendMorningBriefingEmails)();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[Cron] morning-briefing-emails error:", error);
    return res.status(500).json({ success: false, error: { code: "CRON_ERROR", message: "Morning briefing emails cron failed" } });
  }
});
router.post("/memory-extraction", async (req, res) => {
  try {
    const configuredSecret = (0, import_cron.getCronSecret)();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: "CRON_NOT_CONFIGURED", message: "Cron secret is not configured" } });
    }
    if (req.headers["x-cron-secret"] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } });
    }
    (0, import_memory_extraction_cron.runMemoryExtractionJob)().catch((err) => console.error("[Cron] memory-extraction job error:", err));
    return res.json({ success: true, message: "Memory extraction started" });
  } catch (error) {
    console.error("[Cron] memory-extraction error:", error);
    return res.status(500).json({ success: false, error: { code: "CRON_ERROR", message: "Memory extraction cron failed" } });
  }
});
var cron_default = router;
