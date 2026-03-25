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
var llm_exports = {};
__export(llm_exports, {
  default: () => llm_default
});
module.exports = __toCommonJS(llm_exports);
var import_express = require("express");
var import_llm = require("../services/llm");
const router = (0, import_express.Router)();
router.get("/status", (_req, res) => {
  const providers = (0, import_llm.getAvailableProviders)();
  const health = (0, import_llm.getProviderHealth)();
  const status = (0, import_llm.getOrchestratorStatus)();
  res.json({
    success: true,
    data: {
      overallStatus: "operational",
      activeProvider: status.activeProvider,
      totalProviders: providers.length,
      healthyProviders: providers.length,
      providers: providers.map((name) => ({
        name,
        status: health[name]?.status ?? "healthy",
        latencyMs: health[name]?.latencyMs ?? 0
      }))
    }
  });
});
router.get("/health", (_req, res) => {
  const providers = (0, import_llm.getAvailableProviders)();
  const health = (0, import_llm.getProviderHealth)();
  res.json({
    success: true,
    data: {
      overallStatus: providers.length > 0 ? "operational" : "degraded",
      providers: providers.map((name) => ({
        provider: name,
        status: health[name]?.status ?? "healthy",
        latencyMs: health[name]?.latencyMs ?? 0
      })),
      summary: {
        total: providers.length,
        healthy: providers.length,
        degraded: 0,
        unhealthy: 0
      }
    }
  });
});
router.get("/status", (_req, res) => {
  const status = (0, import_llm.getOrchestratorStatus)();
  res.json({
    success: true,
    data: status
  });
});
var llm_default = router;
