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
var astrology_exports = {};
__export(astrology_exports, {
  default: () => astrology_default
});
module.exports = __toCommonJS(astrology_exports);
var import_express = require("express");
var import_astrology_orchestrator = require("../services/astrology/astrology-orchestrator");
var import_auth = __toESM(require("../middleware/auth"));
const router = (0, import_express.Router)();
router.get("/health", async (req, res) => {
  try {
    const orchestrator = (0, import_astrology_orchestrator.getAstrologyOrchestrator)();
    const health = await orchestrator.checkAllHealth();
    const status = orchestrator.getStatus();
    const isHealthy = health.some((h) => h.status === "healthy");
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? "healthy" : "degraded",
        activeProvider: status.activeProvider,
        providers: health.map((h) => ({
          name: h.status,
          status: h.status,
          latencyMs: h.latencyMs,
          lastCheck: h.lastCheck,
          errorCount: h.errorCount,
          lastError: h.lastError
        })),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("[Astrology Health] Error:", error);
    res.status(503).json({
      success: false,
      error: {
        code: "ASTROLOGY_UNAVAILABLE",
        message: "Astrology service unavailable"
      }
    });
  }
});
router.get("/status", import_auth.default, async (req, res) => {
  try {
    const orchestrator = (0, import_astrology_orchestrator.getAstrologyOrchestrator)();
    const metrics = orchestrator.getAllMetrics();
    const status = orchestrator.getStatus();
    const switchHistory = orchestrator.getSwitchHistory().slice(-10);
    res.json({
      success: true,
      data: {
        activeProvider: status.activeProvider,
        manualOverride: status.manualOverride,
        overrideReason: status.overrideReason,
        lastSwitch: status.lastSwitch,
        providers: metrics.map((m) => ({
          name: m.providerName,
          type: m.type,
          health: m.health,
          totalRequests: m.totalRequests,
          successfulRequests: m.successfulRequests,
          failedRequests: m.failedRequests,
          averageLatencyMs: m.averageLatencyMs,
          circuitBreaker: orchestrator.getAllProviders().find((p) => p.name === m.providerName)?.getCircuitBreakerState()
        })),
        switchHistory
      }
    });
  } catch (error) {
    console.error("[Astrology Status] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get astrology status"
      }
    });
  }
});
router.post("/health/refresh", import_auth.default, async (req, res) => {
  try {
    const orchestrator = (0, import_astrology_orchestrator.getAstrologyOrchestrator)();
    const health = await orchestrator.forceRefreshHealth();
    res.json({
      success: true,
      data: {
        message: "Health status refreshed",
        providers: health,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("[Astrology Refresh] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to refresh health status"
      }
    });
  }
});
router.post("/override", import_auth.default, async (req, res) => {
  try {
    const { provider, reason } = req.body;
    if (!provider || !reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Provider name and reason are required"
        }
      });
    }
    const orchestrator = (0, import_astrology_orchestrator.getAstrologyOrchestrator)();
    const providers = orchestrator.getAllProviders();
    const targetProvider = providers.find((p) => p.name === provider);
    if (!targetProvider) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Provider '${provider}' not found`,
          availableProviders: providers.map((p) => p.name)
        }
      });
    }
    orchestrator.setActiveProvider(provider, reason);
    res.json({
      success: true,
      data: {
        message: `Active provider set to ${provider}`,
        activeProvider: orchestrator.getActiveProvider().name,
        reason,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("[Astrology Override] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to set provider override"
      }
    });
  }
});
router.delete("/override", import_auth.default, async (req, res) => {
  try {
    const orchestrator = (0, import_astrology_orchestrator.getAstrologyOrchestrator)();
    orchestrator.clearOverride();
    res.json({
      success: true,
      data: {
        message: "Manual override cleared",
        activeProvider: orchestrator.getActiveProvider().name,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("[Astrology Override Clear] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to clear override"
      }
    });
  }
});
router.post("/circuit-breaker/reset", import_auth.default, async (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Provider name is required"
        }
      });
    }
    const orchestrator = (0, import_astrology_orchestrator.getAstrologyOrchestrator)();
    const providers = orchestrator.getAllProviders();
    const targetProvider = providers.find((p) => p.name === provider);
    if (!targetProvider) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Provider '${provider}' not found`
        }
      });
    }
    targetProvider.resetCircuitBreaker();
    res.json({
      success: true,
      data: {
        message: `Circuit breaker reset for ${provider}`,
        provider: targetProvider.name,
        circuitBreaker: targetProvider.getCircuitBreakerState(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("[Circuit Breaker Reset] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to reset circuit breaker"
      }
    });
  }
});
router.get("/failures", import_auth.default, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const orchestrator = (0, import_astrology_orchestrator.getAstrologyOrchestrator)();
    const logs = await orchestrator.getFailureLogs?.(limit) || [];
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("[Astrology Failures] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get failure logs"
      }
    });
  }
});
var astrology_default = router;
