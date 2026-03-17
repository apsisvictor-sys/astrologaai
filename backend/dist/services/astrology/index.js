"use strict";
/**
 * Astrology Service - US-33: Astrology API Fallback Strategy
 *
 * Main entry point for astrology calculations with automatic failover
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAstrologyOrchestrator = exports.getAstrologyOrchestrator = exports.AstrologyOrchestrator = exports.createAstrologyAPIProvider = exports.AstrologyAPIProvider = exports.CircuitState = exports.AstrologyProviderStatus = exports.AstrologyProviderType = void 0;
exports.calculateNatalChart = calculateNatalChart;
exports.checkAstrologyApiHealth = checkAstrologyApiHealth;
exports.getProviderHealth = getProviderHealth;
exports.getOrchestratorStatus = getOrchestratorStatus;
exports.getSwitchHistory = getSwitchHistory;
// Export types
var astrology_provider_interface_1 = require("./astrology-provider.interface");
// Enums
Object.defineProperty(exports, "AstrologyProviderType", { enumerable: true, get: function () { return astrology_provider_interface_1.AstrologyProviderType; } });
Object.defineProperty(exports, "AstrologyProviderStatus", { enumerable: true, get: function () { return astrology_provider_interface_1.AstrologyProviderStatus; } });
Object.defineProperty(exports, "CircuitState", { enumerable: true, get: function () { return astrology_provider_interface_1.CircuitState; } });
// Export providers
var astrology_api_provider_1 = require("./astrology-api-provider");
Object.defineProperty(exports, "AstrologyAPIProvider", { enumerable: true, get: function () { return astrology_api_provider_1.AstrologyAPIProvider; } });
Object.defineProperty(exports, "createAstrologyAPIProvider", { enumerable: true, get: function () { return astrology_api_provider_1.createAstrologyAPIProvider; } });
// Export orchestrator
var astrology_orchestrator_1 = require("./astrology-orchestrator");
Object.defineProperty(exports, "AstrologyOrchestrator", { enumerable: true, get: function () { return astrology_orchestrator_1.AstrologyOrchestrator; } });
Object.defineProperty(exports, "getAstrologyOrchestrator", { enumerable: true, get: function () { return astrology_orchestrator_1.getAstrologyOrchestrator; } });
Object.defineProperty(exports, "resetAstrologyOrchestrator", { enumerable: true, get: function () { return astrology_orchestrator_1.resetAstrologyOrchestrator; } });
/**
 * Calculate natal chart with automatic failover
 * Convenience function that wraps the orchestrator
 */
async function calculateNatalChart(birthData) {
    const { getAstrologyOrchestrator: getOrchestrator } = await Promise.resolve().then(() => __importStar(require('./astrology-orchestrator')));
    const orchestrator = getOrchestrator();
    return orchestrator.calculateNatalChart(birthData);
}
/**
 * Check if astrology API is available
 */
async function checkAstrologyApiHealth() {
    const { getAstrologyOrchestrator: getOrchestrator } = await Promise.resolve().then(() => __importStar(require('./astrology-orchestrator')));
    const orchestrator = getOrchestrator();
    const health = await orchestrator.checkAllHealth();
    return health.some((h) => h.status === 'healthy');
}
/**
 * Get provider health status
 */
async function getProviderHealth() {
    const { getAstrologyOrchestrator: getOrchestrator } = await Promise.resolve().then(() => __importStar(require('./astrology-orchestrator')));
    const orchestrator = getOrchestrator();
    const metrics = orchestrator.getAllMetrics();
    const result = {};
    for (const m of metrics) {
        result[m.providerName] = {
            status: m.health.status,
            latencyMs: m.health.latencyMs,
        };
    }
    return result;
}
/**
 * Get orchestrator status summary
 */
async function getOrchestratorStatus() {
    const { getAstrologyOrchestrator: getOrchestrator } = await Promise.resolve().then(() => __importStar(require('./astrology-orchestrator')));
    const orchestrator = getOrchestrator();
    const status = orchestrator.getStatus();
    return {
        ...status,
        lastSwitch: status.lastSwitch ? {
            timestamp: status.lastSwitch.timestamp,
            fromProvider: status.lastSwitch.fromProvider,
            toProvider: status.lastSwitch.toProvider,
            reason: status.lastSwitch.reason,
        } : undefined,
    };
}
/**
 * Get provider switch history
 */
async function getSwitchHistory(limit = 10) {
    const { getAstrologyOrchestrator: getOrchestrator } = await Promise.resolve().then(() => __importStar(require('./astrology-orchestrator')));
    const orchestrator = getOrchestrator();
    return orchestrator.getSwitchHistory().slice(-limit);
}
exports.default = {
    calculateNatalChart,
    checkAstrologyApiHealth,
    getProviderHealth,
    getOrchestratorStatus,
    getSwitchHistory,
};
//# sourceMappingURL=index.js.map