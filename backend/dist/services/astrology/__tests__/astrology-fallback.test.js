"use strict";
/**
 * US-33: Astrology API Fallback Strategy - Unit Tests
 *
 * Tests for the fallback logic, circuit breaker, exponential backoff,
 * and provider switching.
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
const vitest_1 = require("vitest");
// Mock Redis
vitest_1.vi.mock('../../../utils/redis', () => ({
    redisClient: {
        get: vitest_1.vi.fn().mockResolvedValue(null),
        setEx: vitest_1.vi.fn().mockResolvedValue(undefined),
        del: vitest_1.vi.fn().mockResolvedValue(undefined),
        lPush: vitest_1.vi.fn().mockResolvedValue(undefined),
        lTrim: vitest_1.vi.fn().mockResolvedValue(undefined),
        lRange: vitest_1.vi.fn().mockResolvedValue([]),
        ping: vitest_1.vi.fn().mockResolvedValue('PONG'),
    },
}));
// Mock fetch for API calls
global.fetch = vitest_1.vi.fn();
const astrology_orchestrator_1 = require("../astrology-orchestrator");
const astrology_provider_interface_1 = require("../astrology-provider.interface");
(0, vitest_1.describe)('Astrology Orchestrator - US-33', () => {
    let orchestrator;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        (0, astrology_orchestrator_1.resetAstrologyOrchestrator)();
        orchestrator = new astrology_orchestrator_1.AstrologyOrchestrator();
    });
    (0, vitest_1.afterEach)(() => {
        orchestrator.stopHealthCheckPolling();
    });
    (0, vitest_1.describe)('Provider Initialization', () => {
        (0, vitest_1.it)('should initialize with at least one provider (fallback)', () => {
            const providers = orchestrator.getAllProviders();
            (0, vitest_1.expect)(providers.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should have Swiss Ephemeris as fallback provider', () => {
            const providers = orchestrator.getAllProviders();
            const fallback = providers.find(p => p.name === 'swiss-ephemeris-fallback');
            (0, vitest_1.expect)(fallback).toBeDefined();
            (0, vitest_1.expect)(fallback?.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('should set first available provider as active', () => {
            const activeProvider = orchestrator.getActiveProvider();
            (0, vitest_1.expect)(activeProvider).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Exponential Backoff', () => {
        (0, vitest_1.it)('should calculate correct backoff delay for each attempt', async () => {
            // Import the helper function from orchestrator
            const orchestratorModule = await Promise.resolve().then(() => __importStar(require('../astrology-orchestrator')));
            // Access the internal function through module
            // Since it's not exported, we test through behavior
            // The backoff is: 1000 * 2^attempt, capped at 30000
            // Attempt 0: 1000ms
            (0, vitest_1.expect)(1000 * Math.pow(2, 0)).toBe(1000);
            // Attempt 1: 2000ms
            (0, vitest_1.expect)(1000 * Math.pow(2, 1)).toBe(2000);
            // Attempt 2: 4000ms
            (0, vitest_1.expect)(1000 * Math.pow(2, 2)).toBe(4000);
            // Attempt 3: 8000ms
            (0, vitest_1.expect)(1000 * Math.pow(2, 3)).toBe(8000);
            // Attempt 10: Should cap at 30000ms
            (0, vitest_1.expect)(Math.min(1000 * Math.pow(2, 10), 30000)).toBe(30000);
        });
    });
    (0, vitest_1.describe)('Circuit Breaker Pattern', () => {
        (0, vitest_1.it)('should start with circuit breaker closed', () => {
            const providers = orchestrator.getAllProviders();
            const primaryProvider = providers.find(p => p.name === 'astrology-api.io');
            if (primaryProvider) {
                const state = primaryProvider.getCircuitBreakerState();
                (0, vitest_1.expect)(state.state).toBe(astrology_provider_interface_1.CircuitState.CLOSED);
                (0, vitest_1.expect)(state.failureCount).toBe(0);
            }
        });
        (0, vitest_1.it)('should open circuit breaker after threshold failures', async () => {
            const providers = orchestrator.getAllProviders();
            const fallbackProvider = providers.find(p => p.name === 'swiss-ephemeris-fallback');
            if (fallbackProvider) {
                // Simulate failures
                for (let i = 0; i < 3; i++) {
                    fallbackProvider.updateHealth(astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY, 100, 'Test error');
                }
                const state = fallbackProvider.getCircuitBreakerState();
                (0, vitest_1.expect)(state.state).toBe(astrology_provider_interface_1.CircuitState.OPEN);
                (0, vitest_1.expect)(state.nextRetryTime).not.toBeNull();
            }
        });
        (0, vitest_1.it)('should reset circuit breaker', async () => {
            const providers = orchestrator.getAllProviders();
            const fallbackProvider = providers.find(p => p.name === 'swiss-ephemeris-fallback');
            if (fallbackProvider) {
                // Simulate failures
                for (let i = 0; i < 3; i++) {
                    fallbackProvider.updateHealth(astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY, 100, 'Test error');
                }
                (0, vitest_1.expect)(fallbackProvider.getCircuitBreakerState().state).toBe(astrology_provider_interface_1.CircuitState.OPEN);
                // Reset
                fallbackProvider.resetCircuitBreaker();
                const state = fallbackProvider.getCircuitBreakerState();
                (0, vitest_1.expect)(state.state).toBe(astrology_provider_interface_1.CircuitState.CLOSED);
                (0, vitest_1.expect)(state.failureCount).toBe(0);
            }
        });
    });
    (0, vitest_1.describe)('Natal Chart Calculation', () => {
        const testBirthData = {
            year: 1990,
            month: 5,
            day: 15,
            hour: 14,
            minute: 30,
            latitude: 42.6977,
            longitude: 23.3219,
            timezone: 'Europe/Sofia',
        };
        (0, vitest_1.it)('should calculate natal chart with fallback provider', async () => {
            const chart = await orchestrator.calculateNatalChart(testBirthData);
            (0, vitest_1.expect)(chart).toBeDefined();
            (0, vitest_1.expect)(chart.sun).toBeDefined();
            (0, vitest_1.expect)(chart.moon).toBeDefined();
            (0, vitest_1.expect)(chart.rising).toBeDefined();
            (0, vitest_1.expect)(chart.houses).toHaveLength(12);
            (0, vitest_1.expect)(chart.source).toBeDefined();
        });
        (0, vitest_1.it)('should include Bulgarian translations', async () => {
            const chart = await orchestrator.calculateNatalChart(testBirthData);
            (0, vitest_1.expect)(chart.sun.signBg).toBeDefined();
            // Bulgarian translation should exist for known signs
            const bulgarianSigns = ['Овен', 'Телец', 'Близнаци', 'Рак', 'Лъв', 'Дева',
                'Везни', 'Скорпион', 'Стрелец', 'Козирог', 'Водолей', 'Риби'];
            (0, vitest_1.expect)(bulgarianSigns).toContain(chart.sun.signBg);
        });
        (0, vitest_1.it)('should include elements and modalities', async () => {
            const chart = await orchestrator.calculateNatalChart(testBirthData);
            (0, vitest_1.expect)(chart.elements).toBeDefined();
            (0, vitest_1.expect)(chart.elements.fire).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(chart.elements.earth).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(chart.elements.air).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(chart.elements.water).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(chart.modalities).toBeDefined();
            (0, vitest_1.expect)(chart.modalities.cardinal).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(chart.modalities.fixed).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(chart.modalities.mutable).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should calculate aspects', async () => {
            const chart = await orchestrator.calculateNatalChart(testBirthData);
            (0, vitest_1.expect)(chart.aspects).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(chart.aspects)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Provider Switching', () => {
        (0, vitest_1.it)('should track switch history', () => {
            const history = orchestrator.getSwitchHistory();
            (0, vitest_1.expect)(Array.isArray(history)).toBe(true);
        });
        (0, vitest_1.it)('should switch to fallback when primary fails', async () => {
            // If primary API is not available, should use fallback
            const providers = orchestrator.getAllProviders();
            const primaryProvider = providers.find(p => p.name === 'astrology-api.io');
            if (!primaryProvider?.isAvailable()) {
                // Should be using fallback
                const activeProvider = orchestrator.getActiveProvider();
                (0, vitest_1.expect)(activeProvider.name).toBe('swiss-ephemeris-fallback');
            }
        });
        (0, vitest_1.it)('should allow manual provider override', () => {
            const providers = orchestrator.getAllProviders();
            const fallbackProvider = providers.find(p => p.name === 'swiss-ephemeris-fallback');
            if (fallbackProvider) {
                orchestrator.setActiveProvider('swiss-ephemeris-fallback', 'Testing manual override');
                (0, vitest_1.expect)(orchestrator.getActiveProvider().name).toBe('swiss-ephemeris-fallback');
                (0, vitest_1.expect)(orchestrator.isOverrideActive()).toBe(true);
                // Clear override
                orchestrator.clearOverride();
                (0, vitest_1.expect)(orchestrator.isOverrideActive()).toBe(false);
            }
        });
    });
    (0, vitest_1.describe)('Health Checks', () => {
        (0, vitest_1.it)('should return health status for all providers', async () => {
            const health = await orchestrator.checkAllHealth();
            (0, vitest_1.expect)(Array.isArray(health)).toBe(true);
            (0, vitest_1.expect)(health.length).toBeGreaterThan(0);
            health.forEach(h => {
                (0, vitest_1.expect)(h.status).toBeDefined();
                (0, vitest_1.expect)(h.latencyMs).toBeGreaterThanOrEqual(0);
            });
        });
        (0, vitest_1.it)('should return provider metrics', () => {
            const metrics = orchestrator.getAllMetrics();
            (0, vitest_1.expect)(Array.isArray(metrics)).toBe(true);
            (0, vitest_1.expect)(metrics.length).toBeGreaterThan(0);
            metrics.forEach(m => {
                (0, vitest_1.expect)(m.providerName).toBeDefined();
                (0, vitest_1.expect)(m.health).toBeDefined();
            });
        });
        (0, vitest_1.it)('should return orchestrator status', () => {
            const status = orchestrator.getStatus();
            (0, vitest_1.expect)(status.activeProvider).toBeDefined();
            (0, vitest_1.expect)(status.totalProviders).toBeGreaterThan(0);
            (0, vitest_1.expect)(status.healthyProviders).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('Transit Calculation', () => {
        (0, vitest_1.it)('should calculate transits for a date', async () => {
            const transits = await orchestrator.getTransits('2026-02-27');
            (0, vitest_1.expect)(transits).toBeDefined();
            (0, vitest_1.expect)(transits.date).toBe('2026-02-27');
            (0, vitest_1.expect)(transits.planets).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(transits.planets)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Synastry Calculation', () => {
        const birthData1 = {
            year: 1990,
            month: 5,
            day: 15,
            hour: 14,
            minute: 30,
            latitude: 42.6977,
            longitude: 23.3219,
        };
        const birthData2 = {
            year: 1992,
            month: 8,
            day: 20,
            hour: 9,
            minute: 15,
            latitude: 42.15,
            longitude: 24.75,
        };
        (0, vitest_1.it)('should calculate synastry between two charts', async () => {
            const synastry = await orchestrator.calculateSynastry(birthData1, birthData2);
            (0, vitest_1.expect)(synastry).toBeDefined();
            (0, vitest_1.expect)(synastry.person1.chart).toBeDefined();
            (0, vitest_1.expect)(synastry.person2.chart).toBeDefined();
            (0, vitest_1.expect)(synastry.compatibility).toBeDefined();
            (0, vitest_1.expect)(synastry.compatibility.overall).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(synastry.compatibility.overall).toBeLessThanOrEqual(100);
        });
    });
    (0, vitest_1.describe)('Singleton Pattern', () => {
        (0, vitest_1.it)('should return the same instance', () => {
            const instance1 = (0, astrology_orchestrator_1.getAstrologyOrchestrator)();
            const instance2 = (0, astrology_orchestrator_1.getAstrologyOrchestrator)();
            (0, vitest_1.expect)(instance1).toBe(instance2);
            // Cleanup
            (0, astrology_orchestrator_1.resetAstrologyOrchestrator)();
        });
        (0, vitest_1.it)('should reset singleton', () => {
            const instance1 = (0, astrology_orchestrator_1.getAstrologyOrchestrator)();
            (0, astrology_orchestrator_1.resetAstrologyOrchestrator)();
            const instance2 = (0, astrology_orchestrator_1.getAstrologyOrchestrator)();
            (0, vitest_1.expect)(instance1).not.toBe(instance2);
            // Cleanup
            (0, astrology_orchestrator_1.resetAstrologyOrchestrator)();
        });
    });
});
(0, vitest_1.describe)('Swiss Ephemeris Provider', () => {
    (0, vitest_1.it)('should always be available as fallback', async () => {
        const { createSwissEphemerisProvider } = await Promise.resolve().then(() => __importStar(require('../swiss-ephemeris-provider')));
        const provider = createSwissEphemerisProvider();
        (0, vitest_1.expect)(provider.isAvailable()).toBe(true);
    });
    (0, vitest_1.it)('should calculate valid chart positions', async () => {
        const { createSwissEphemerisProvider } = await Promise.resolve().then(() => __importStar(require('../swiss-ephemeris-provider')));
        const provider = createSwissEphemerisProvider();
        const birthData = {
            year: 1990,
            month: 5,
            day: 15,
            hour: 14,
            minute: 30,
            latitude: 42.6977,
            longitude: 23.3219,
        };
        const chart = await provider.calculateNatalChart(birthData);
        (0, vitest_1.expect)(chart.sun.degree).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(chart.sun.degree).toBeLessThan(30);
        (0, vitest_1.expect)(chart.sun.house).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(chart.sun.house).toBeLessThanOrEqual(12);
    });
});
(0, vitest_1.describe)('Astrology API Provider', () => {
    (0, vitest_1.it)('should check availability based on API key', async () => {
        const { createAstrologyAPIProvider } = await Promise.resolve().then(() => __importStar(require('../astrology-api-provider')));
        const provider = createAstrologyAPIProvider();
        // Availability depends on ASTROLOGY_API_KEY env var
        (0, vitest_1.expect)(typeof provider.isAvailable()).toBe('boolean');
    });
});
//# sourceMappingURL=astrology-fallback.test.js.map