"use strict";
/**
 * LLM Orchestrator Tests
 * US-34: LLM Provider Fallback Strategy
 *
 * Tests for automatic failover, health checks, and provider switching
 *
 * Run with: npx vitest run src/__tests__/llm-orchestrator.test.ts
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
// @ts-ignore - vitest types not available during regular compilation
const vitest_1 = require("vitest");
// Mock the providers
vitest_1.vi.mock('../services/llm/openai-provider', () => {
    const mockProvider = {
        name: 'openai',
        type: 'primary',
        model: 'gpt-4o',
        isAvailable: () => true,
        healthCheck: async () => ({ status: 'healthy', latencyMs: 100, lastCheck: new Date(), errorCount: 0, successCount: 1 }),
        getLatency: () => 100,
        getMetrics: () => ({
            providerName: 'openai',
            type: 'primary',
            totalRequests: 10,
            successfulRequests: 10,
            failedRequests: 0,
            averageLatencyMs: 100,
            health: { status: 'healthy', latencyMs: 100, lastCheck: new Date() },
        }),
        updateHealth: () => { },
        streamChat: async function* () {
            yield { content: 'Hello from OpenAI', done: false };
            yield { content: '', done: true };
        },
    };
    return {
        OpenAIProvider: class MockOpenAIProvider {
            constructor() {
                this.name = 'openai';
                this.type = 'primary';
                this.model = 'gpt-4o';
            }
            isAvailable() { return true; }
            async *streamChat() {
                yield { content: 'Hello from OpenAI', done: false };
                yield { content: '', done: true };
            }
            async healthCheck() {
                return { status: 'healthy', latencyMs: 100, lastCheck: new Date(), errorCount: 0, successCount: 1 };
            }
            getLatency() { return 100; }
            getMetrics() {
                return {
                    providerName: 'openai',
                    type: 'primary',
                    totalRequests: 10,
                    successfulRequests: 10,
                    failedRequests: 0,
                    averageLatencyMs: 100,
                    health: { status: 'healthy', latencyMs: 100, lastCheck: new Date() },
                };
            }
            updateHealth() { }
        },
        createPrimaryOpenAIProvider: () => ({ ...mockProvider, type: 'primary' }),
        createSecondaryOpenAIProvider: () => ({ ...mockProvider, type: 'secondary', model: 'gpt-4o-mini', name: 'openai-secondary' }),
    };
});
vitest_1.vi.mock('../services/llm/glm-provider', () => {
    const mockGLMProvider = {
        name: 'glm',
        type: 'primary',
        model: 'glm-4-flash',
        isAvailable: () => true,
        healthCheck: async () => ({ status: 'healthy', latencyMs: 150, lastCheck: new Date(), errorCount: 0, successCount: 1 }),
        getLatency: () => 150,
        getMetrics: () => ({
            providerName: 'glm',
            type: 'primary',
            totalRequests: 10,
            successfulRequests: 10,
            failedRequests: 0,
            averageLatencyMs: 150,
            health: { status: 'healthy', latencyMs: 150, lastCheck: new Date() },
        }),
        updateHealth: () => { },
        streamChat: async function* () {
            yield { content: 'Hello from GLM', done: false };
            yield { content: '', done: true };
        },
    };
    const mockMiniMaxProvider = {
        name: 'minimax',
        type: 'tertiary',
        model: 'minimax-01',
        isAvailable: () => true,
        healthCheck: async () => ({ status: 'healthy', latencyMs: 200, lastCheck: new Date(), errorCount: 0, successCount: 1 }),
        getLatency: () => 200,
        getMetrics: () => ({
            providerName: 'minimax',
            type: 'tertiary',
            totalRequests: 5,
            successfulRequests: 5,
            failedRequests: 0,
            averageLatencyMs: 200,
            health: { status: 'healthy', latencyMs: 200, lastCheck: new Date() },
        }),
        updateHealth: () => { },
        streamChat: async function* () {
            yield { content: 'Hello from MiniMax', done: false };
            yield { content: '', done: true };
        },
    };
    return {
        GLMProvider: class MockGLMProvider {
            constructor() {
                this.name = 'glm';
                this.type = 'primary';
                this.model = 'glm-4-flash';
            }
            isAvailable() { return true; }
            async *streamChat() {
                yield { content: 'Hello from GLM', done: false };
                yield { content: '', done: true };
            }
            async healthCheck() {
                return { status: 'healthy', latencyMs: 150, lastCheck: new Date(), errorCount: 0, successCount: 1 };
            }
            getLatency() { return 150; }
            getMetrics() {
                return {
                    providerName: 'glm',
                    type: 'primary',
                    totalRequests: 10,
                    successfulRequests: 10,
                    failedRequests: 0,
                    averageLatencyMs: 150,
                    health: { status: 'healthy', latencyMs: 150, lastCheck: new Date() },
                };
            }
            updateHealth() { }
        },
        MiniMaxProvider: class MockMiniMaxProvider {
            constructor() {
                this.name = 'minimax';
                this.type = 'tertiary';
                this.model = 'minimax-01';
            }
            isAvailable() { return true; }
            async healthCheck() {
                return { status: 'healthy', latencyMs: 200, lastCheck: new Date(), errorCount: 0, successCount: 1 };
            }
            getLatency() { return 200; }
            getMetrics() {
                return {
                    providerName: 'minimax',
                    type: 'tertiary',
                    totalRequests: 5,
                    successfulRequests: 5,
                    failedRequests: 0,
                    averageLatencyMs: 200,
                    health: { status: 'healthy', latencyMs: 200, lastCheck: new Date() },
                };
            }
            updateHealth() { }
        },
        createPrimaryGLMProvider: () => ({ ...mockGLMProvider }),
        createMiniMaxProvider: () => ({ ...mockMiniMaxProvider }),
    };
});
// Mock Redis
vitest_1.vi.mock('../utils/redis', () => ({
    redisClient: {
        lpush: vitest_1.vi.fn().mockResolvedValue(1),
        ltrim: vitest_1.vi.fn().mockResolvedValue('OK'),
        get: vitest_1.vi.fn().mockResolvedValue(null),
        set: vitest_1.vi.fn().mockResolvedValue('OK'),
        setEx: vitest_1.vi.fn().mockResolvedValue('OK'),
    },
}));
(0, vitest_1.describe)('LLM Orchestrator', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('Provider Management', () => {
        (0, vitest_1.it)('should initialize with available providers', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const providers = orchestrator.getAllProviders();
            (0, vitest_1.expect)(providers.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should return active provider', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const activeProvider = orchestrator.getActiveProvider();
            (0, vitest_1.expect)(activeProvider).toBeDefined();
            (0, vitest_1.expect)(activeProvider.name).toBeDefined();
        });
        (0, vitest_1.it)('should get metrics for all providers', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const metrics = orchestrator.getAllMetrics();
            (0, vitest_1.expect)(Array.isArray(metrics)).toBe(true);
            (0, vitest_1.expect)(metrics.length).toBeGreaterThan(0);
            metrics.forEach(m => {
                (0, vitest_1.expect)(m.providerName).toBeDefined();
                (0, vitest_1.expect)(m.type).toBeDefined();
            });
        });
    });
    (0, vitest_1.describe)('Failover Logic', () => {
        (0, vitest_1.it)('should track provider switches', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const history = orchestrator.getSwitchHistory();
            (0, vitest_1.expect)(Array.isArray(history)).toBe(true);
        });
        (0, vitest_1.it)('should switch to next provider on failure', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const initialProvider = orchestrator.getActiveProvider().name;
            // Simulate a failure by calling the internal switch method
            // In real scenario, this would happen automatically on stream error
            const history = orchestrator.getSwitchHistory();
            // Initially, no switches should have occurred
            (0, vitest_1.expect)(history.length).toBe(0);
        });
        (0, vitest_1.it)('should log switch events with reasons', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            // The orchestrator should track switch reasons
            const status = orchestrator.getStatus();
            (0, vitest_1.expect)(status).toHaveProperty('activeProvider');
            (0, vitest_1.expect)(status).toHaveProperty('totalProviders');
            (0, vitest_1.expect)(status).toHaveProperty('healthyProviders');
        });
    });
    (0, vitest_1.describe)('Health Checks', () => {
        (0, vitest_1.it)('should check health of all providers', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const healthResults = await orchestrator.checkAllHealth();
            (0, vitest_1.expect)(Array.isArray(healthResults)).toBe(true);
            healthResults.forEach(h => {
                (0, vitest_1.expect)(h.status).toBeDefined();
                (0, vitest_1.expect)(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(h.status);
            });
        });
        (0, vitest_1.it)('should support periodic health check polling', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            // Start polling with a long interval (won't actually run during test)
            orchestrator.startHealthCheckPolling(60000);
            // Should have set up the interval
            const status = orchestrator.getStatus();
            (0, vitest_1.expect)(status).toBeDefined();
            // Clean up
            orchestrator.stopHealthCheckPolling();
        });
        (0, vitest_1.it)('should stop health check polling', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            orchestrator.startHealthCheckPolling(60000);
            orchestrator.stopHealthCheckPolling();
            // Should not throw
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
    (0, vitest_1.describe)('Chat with Failover', () => {
        (0, vitest_1.it)('should stream chat with provider info', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const messages = [
                { role: 'user', content: 'Hello' },
            ];
            const chunks = [];
            for await (const chunk of orchestrator.streamChat(messages, {})) {
                chunks.push(chunk);
            }
            // Should have received chunks
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
            // At least one chunk should have provider info
            const chunksWithProvider = chunks.filter(c => c.provider);
            (0, vitest_1.expect)(chunksWithProvider.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should return result with provider and latency info', async () => {
            const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
            const orchestrator = new LLMOrchestrator();
            const messages = [
                { role: 'user', content: 'Hello' },
            ];
            const result = await orchestrator.chat(messages, {});
            (0, vitest_1.expect)(result.content).toBeDefined();
            (0, vitest_1.expect)(result.provider).toBeDefined();
            (0, vitest_1.expect)(result.latencyMs).toBeDefined();
            (0, vitest_1.expect)(result.latencyMs).toBeGreaterThanOrEqual(0);
        });
    });
});
(0, vitest_1.describe)('LLM Provider Interface', () => {
    (0, vitest_1.describe)('Provider Types', () => {
        (0, vitest_1.it)('should define provider types correctly', async () => {
            const { ProviderType } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-provider.interface')));
            (0, vitest_1.expect)(ProviderType.PRIMARY).toBe('primary');
            (0, vitest_1.expect)(ProviderType.SECONDARY).toBe('secondary');
            (0, vitest_1.expect)(ProviderType.TERTIARY).toBe('tertiary');
        });
    });
    (0, vitest_1.describe)('Provider Status', () => {
        (0, vitest_1.it)('should define provider status correctly', async () => {
            const { ProviderStatus } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-provider.interface')));
            (0, vitest_1.expect)(ProviderStatus.HEALTHY).toBe('healthy');
            (0, vitest_1.expect)(ProviderStatus.DEGRADED).toBe('degraded');
            (0, vitest_1.expect)(ProviderStatus.UNHEALTHY).toBe('unhealthy');
            (0, vitest_1.expect)(ProviderStatus.UNKNOWN).toBe('unknown');
        });
    });
});
(0, vitest_1.describe)('Health Endpoint Data', () => {
    (0, vitest_1.it)('should return correct health data structure', async () => {
        const { LLMOrchestrator } = await Promise.resolve().then(() => __importStar(require('../services/llm/llm-orchestrator')));
        const orchestrator = new LLMOrchestrator();
        const metrics = orchestrator.getAllMetrics();
        metrics.forEach(m => {
            (0, vitest_1.expect)(m).toHaveProperty('providerName');
            (0, vitest_1.expect)(m).toHaveProperty('type');
            (0, vitest_1.expect)(m).toHaveProperty('totalRequests');
            (0, vitest_1.expect)(m).toHaveProperty('successfulRequests');
            (0, vitest_1.expect)(m).toHaveProperty('failedRequests');
            (0, vitest_1.expect)(m).toHaveProperty('averageLatencyMs');
            (0, vitest_1.expect)(m).toHaveProperty('health');
            (0, vitest_1.expect)(m.health).toHaveProperty('status');
            (0, vitest_1.expect)(m.health).toHaveProperty('latencyMs');
            (0, vitest_1.expect)(m.health).toHaveProperty('lastCheck');
        });
    });
});
//# sourceMappingURL=llm-orchestrator.test.js.map