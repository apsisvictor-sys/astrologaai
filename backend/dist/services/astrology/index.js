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
  AstrologyAPIProvider: () => import_astrology_api_provider.AstrologyAPIProvider,
  AstrologyOrchestrator: () => import_astrology_orchestrator.AstrologyOrchestrator,
  AstrologyProviderStatus: () => import_astrology_provider.AstrologyProviderStatus,
  AstrologyProviderType: () => import_astrology_provider.AstrologyProviderType,
  CircuitState: () => import_astrology_provider.CircuitState,
  calculateNatalChart: () => calculateNatalChart,
  checkAstrologyApiHealth: () => checkAstrologyApiHealth,
  createAstrologyAPIProvider: () => import_astrology_api_provider.createAstrologyAPIProvider,
  default: () => index_default,
  getAstrologyOrchestrator: () => import_astrology_orchestrator.getAstrologyOrchestrator,
  getOrchestratorStatus: () => getOrchestratorStatus,
  getProviderHealth: () => getProviderHealth,
  getSwitchHistory: () => getSwitchHistory,
  resetAstrologyOrchestrator: () => import_astrology_orchestrator.resetAstrologyOrchestrator
});
module.exports = __toCommonJS(index_exports);
var import_astrology_provider = require("./astrology-provider.interface");
var import_astrology_api_provider = require("./astrology-api-provider");
var import_astrology_orchestrator = require("./astrology-orchestrator");
async function calculateNatalChart(birthData) {
  const { getAstrologyOrchestrator: getOrchestrator } = await import("./astrology-orchestrator");
  const orchestrator = getOrchestrator();
  return orchestrator.calculateNatalChart(birthData);
}
async function checkAstrologyApiHealth() {
  const { getAstrologyOrchestrator: getOrchestrator } = await import("./astrology-orchestrator");
  const orchestrator = getOrchestrator();
  const health = await orchestrator.checkAllHealth();
  return health.some((h) => h.status === "healthy");
}
async function getProviderHealth() {
  const { getAstrologyOrchestrator: getOrchestrator } = await import("./astrology-orchestrator");
  const orchestrator = getOrchestrator();
  const metrics = orchestrator.getAllMetrics();
  const result = {};
  for (const m of metrics) {
    result[m.providerName] = {
      status: m.health.status,
      latencyMs: m.health.latencyMs
    };
  }
  return result;
}
async function getOrchestratorStatus() {
  const { getAstrologyOrchestrator: getOrchestrator } = await import("./astrology-orchestrator");
  const orchestrator = getOrchestrator();
  const status = orchestrator.getStatus();
  return {
    ...status,
    lastSwitch: status.lastSwitch ? {
      timestamp: status.lastSwitch.timestamp,
      fromProvider: status.lastSwitch.fromProvider,
      toProvider: status.lastSwitch.toProvider,
      reason: status.lastSwitch.reason
    } : void 0
  };
}
async function getSwitchHistory(limit = 10) {
  const { getAstrologyOrchestrator: getOrchestrator } = await import("./astrology-orchestrator");
  const orchestrator = getOrchestrator();
  return orchestrator.getSwitchHistory().slice(-limit);
}
var index_default = {
  calculateNatalChart,
  checkAstrologyApiHealth,
  getProviderHealth,
  getOrchestratorStatus,
  getSwitchHistory
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AstrologyAPIProvider,
  AstrologyOrchestrator,
  AstrologyProviderStatus,
  AstrologyProviderType,
  CircuitState,
  calculateNatalChart,
  checkAstrologyApiHealth,
  createAstrologyAPIProvider,
  getAstrologyOrchestrator,
  getOrchestratorStatus,
  getProviderHealth,
  getSwitchHistory,
  resetAstrologyOrchestrator
});
