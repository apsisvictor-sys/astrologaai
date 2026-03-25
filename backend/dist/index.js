"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var Sentry = __toESM(require("@sentry/node"));
var import_express = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_helmet = __toESM(require("helmet"));
var import_express_rate_limit = __toESM(require("express-rate-limit"));
var import_dotenv = require("dotenv");
var import_runtime = require("./config/runtime");
var import_envValidation = require("./config/envValidation");
var import_prisma = require("./utils/prisma");
var import_auth = __toESM(require("./routes/auth"));
var import_user = __toESM(require("./routes/user"));
var import_chat = __toESM(require("./routes/chat"));
var import_birthChart = __toESM(require("./routes/birthChart"));
var import_birthData = __toESM(require("./routes/birthData"));
var import_locations = __toESM(require("./routes/locations"));
var import_forecasts = __toESM(require("./routes/forecasts"));
var import_partners = __toESM(require("./routes/partners"));
var import_subscription = __toESM(require("./routes/subscription"));
var import_language = __toESM(require("./routes/language"));
var import_llm = __toESM(require("./routes/llm"));
var import_compatibility = __toESM(require("./routes/compatibility"));
var import_cron = __toESM(require("./routes/cron"));
var import_astrology = __toESM(require("./routes/astrology"));
var import_admin = __toESM(require("./routes/admin"));
var import_guestChat = __toESM(require("./routes/guestChat"));
var import_transits = __toESM(require("./routes/transits"));
var import_credits = __toESM(require("./routes/credits"));
var import_rateLimitHeaders = require("./middleware/rateLimitHeaders");
var import_chart_regeneration = require("./services/chart-regeneration");
var import_admin_defaults = require("./services/admin-defaults");
var import_forecast_cron = require("./services/forecast-cron");
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
  tracesSampleRate: 0.1
});
(0, import_dotenv.config)({ override: true });
const app = (0, import_express.default)();
const PORT = import_runtime.runtimeConfig.port;
app.set("trust proxy", 1);
app.use((0, import_helmet.default)());
app.use((0, import_cors.default)({
  origin: (origin, callback) => {
    const allowed = (0, import_runtime.isOriginAllowed)(origin);
    if (!allowed) {
      console.warn(`[CORS] Blocked origin: ${origin || "unknown"}`);
    }
    return callback(null, allowed);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept-Language", "X-Requested-With"],
  optionsSuccessStatus: 204
}));
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true }));
const generalLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(generalLimiter);
app.use(import_rateLimitHeaders.rateLimitHeadersMiddleware);
app.use(import_rateLimitHeaders.fetchRateLimitStatus);
app.get("/r/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    await import_prisma.prisma.referralLink.update({
      where: { slug, isActive: true },
      data: { clicks: { increment: 1 } }
    });
  } catch (_err) {
    console.warn("[Referral] Click increment failed for slug:", slug, _err);
  }
  const frontendUrl = process.env.FRONTEND_URL || "https://astrologa.bg";
  res.redirect(302, `${frontendUrl}?ref=${encodeURIComponent(slug)}`);
});
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: "1.0.0"
  });
});
app.get("/health/db", async (req, res) => {
  try {
    await import_prisma.prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});
app.get("/health/redis", async (req, res) => {
  try {
    const { redisClient } = await import("./utils/redis");
    await redisClient.ping();
    res.json({ status: "ok", redis: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", redis: "disconnected" });
  }
});
app.get("/health/astrology", async (req, res) => {
  try {
    const { getAstrologyOrchestrator } = await import("./services/astrology/astrology-orchestrator");
    const orchestrator = getAstrologyOrchestrator();
    const health = await orchestrator.checkAllHealth();
    const status = orchestrator.getStatus();
    const isHealthy = health.some((h) => h.status === "healthy");
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "ok" : "degraded",
      astrology: {
        activeProvider: status.activeProvider
      }
    });
  } catch (error) {
    res.status(503).json({ status: "error", astrology: "unavailable" });
  }
});
app.use("/api/v1/auth", import_auth.default);
app.use("/api/v1/user", import_user.default);
app.use("/api/v1/chat/guest", import_guestChat.default);
app.use("/api/v1/chat", import_chat.default);
app.use("/api/v1/birth-chart", import_birthChart.default);
app.use("/api/v1/birth-data", import_birthData.default);
app.use("/api/v1/locations", import_locations.default);
app.use("/api/v1/forecasts", import_forecasts.default);
app.use("/api/v1/partners", import_partners.default);
app.use("/api/v1/subscription", import_subscription.default);
app.use("/api/v1/language", import_language.default);
app.use("/api/v1/llm", import_llm.default);
app.use("/api/v1/providers", import_llm.default);
app.use("/api/v1/compatibility", import_compatibility.default);
app.use("/api/v1/cron", import_cron.default);
app.use("/api/v1/astrology", import_astrology.default);
app.use("/api/v1/admin", import_admin.default);
app.use("/api/v1/transits", import_transits.default);
app.use("/api/v1/credits", import_credits.default);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});
Sentry.setupExpressErrorHandler(app);
app.use((err, req, res, _next) => {
  console.error("[Error]", err.stack);
  const message = err.message || String(err);
  const isInfraError = /\b(connect|connection|database|prisma|timeout|pool|P1001|P1002|P1017|ECONNREFUSED)\b/i.test(message);
  if (isInfraError) {
    console.error("[Error] Infrastructure error detected:", message);
    res.status(503).json({
      success: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: process.env.NODE_ENV === "production" ? "Service temporarily unavailable" : message
      }
    });
    return;
  }
  if (message.includes("JWT_SECRET")) {
    console.error("[Error] JWT configuration error:", message);
    res.status(503).json({
      success: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: process.env.NODE_ENV === "production" ? "Service temporarily unavailable" : "JWT not configured"
      }
    });
    return;
  }
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message
    }
  });
});
app.listen(PORT, () => {
  const envReport = (0, import_envValidation.getEnvValidationReport)();
  console.log(`\u{1F680} AstroLogAI API running on port ${PORT}`);
  console.log(`\u{1F4DA} Health check: http://localhost:${PORT}/health`);
  console.log(`\u{1F510} Auth endpoints: http://localhost:${PORT}/api/v1/auth`);
  console.log(`\u{1F310} Allowed origins: ${import_runtime.runtimeConfig.allowedOrigins.join(", ") || "(none configured)"}`);
  if (!envReport.ok) {
    console.warn(`\u26A0\uFE0F Missing required env vars: ${envReport.missingRequired.join(", ")}`);
  }
  (0, import_chart_regeneration.startRegenerationProcessor)();
  console.log(`\u26A1 Chart regeneration processor started`);
  (0, import_forecast_cron.ensureDailyForecastTable)().then(() => {
    (0, import_forecast_cron.startForecastCron)();
    console.log(`\u26A1 Nightly forecast cron started (runs daily at 02:00 UTC)`);
  }).catch((err) => console.error("[Startup] Failed to start forecast cron:", err));
  (0, import_admin_defaults.seedAdminDefaults)().catch((err) => console.error("[Startup] Failed to seed admin defaults:", err));
});
var index_default = app;
