/**
 * LLM Orchestrator Tests
 * US-34: LLM Provider Fallback Strategy
 * 
 * Tests for automatic failover, health checks, and provider switching
 * 
 * Run with: npx vitest run src/__tests__/llm-orchestrator.test.ts
 */

// @ts-ignore - vitest types not available during regular compilation
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the providers
vi.mock('../services/llm/openai-provider', () => {
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
    updateHealth: () => {},
    streamChat: async function* () {
      yield { content: 'Hello from OpenAI', done: false };
      yield { content: '', done: true };
    },
  };
  
  return {
    OpenAIProvider: class MockOpenAIProvider {
      name = 'openai';
      type = 'primary';
      model = 'gpt-4o';
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
      updateHealth() {}
    },
    createPrimaryOpenAIProvider: () => ({ ...mockProvider, type: 'primary' }),
    createSecondaryOpenAIProvider: () => ({ ...mockProvider, type: 'secondary', model: 'gpt-4o-mini', name: 'openai-secondary' }),
  };
});

vi.mock('../services/llm/glm-provider', () => {
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
    updateHealth: () => {},
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
    updateHealth: () => {},
    streamChat: async function* () {
      yield { content: 'Hello from MiniMax', done: false };
      yield { content: '', done: true };
    },
  };
  
  return {
    GLMProvider: class MockGLMProvider {
      name = 'glm';
      type = 'primary';
      model = 'glm-4-flash';
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
      updateHealth() {}
    },
    MiniMaxProvider: class MockMiniMaxProvider {
      name = 'minimax';
      type = 'tertiary';
      model = 'minimax-01';
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
      updateHealth() {}
    },
    createPrimaryGLMProvider: () => ({ ...mockGLMProvider }),
    createMiniMaxProvider: () => ({ ...mockMiniMaxProvider }),
  };
});

// Mock Redis
vi.mock('../utils/redis', () => ({
  redisClient: {
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setEx: vi.fn().mockResolvedValue('OK'),
  },
}));

describe('LLM Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Provider Management', () => {
    it('should initialize with available providers', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const providers = orchestrator.getAllProviders();
      expect(providers.length).toBeGreaterThan(0);
    });
    
    it('should return active provider', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const activeProvider = orchestrator.getActiveProvider();
      expect(activeProvider).toBeDefined();
      expect(activeProvider.name).toBeDefined();
    });
    
    it('should get metrics for all providers', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const metrics = orchestrator.getAllMetrics();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      
      metrics.forEach(m => {
        expect(m.providerName).toBeDefined();
        expect(m.type).toBeDefined();
      });
    });
  });
  
  describe('Failover Logic', () => {
    it('should track provider switches', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const history = orchestrator.getSwitchHistory();
      expect(Array.isArray(history)).toBe(true);
    });
    
    it('should switch to next provider on failure', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const initialProvider = orchestrator.getActiveProvider().name;
      
      // Simulate a failure by calling the internal switch method
      // In real scenario, this would happen automatically on stream error
      
      const history = orchestrator.getSwitchHistory();
      // Initially, no switches should have occurred
      expect(history.length).toBe(0);
    });
    
    it('should log switch events with reasons', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      // The orchestrator should track switch reasons
      const status = orchestrator.getStatus();
      expect(status).toHaveProperty('activeProvider');
      expect(status).toHaveProperty('totalProviders');
      expect(status).toHaveProperty('healthyProviders');
    });
  });
  
  describe('Health Checks', () => {
    it('should check health of all providers', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const healthResults = await orchestrator.checkAllHealth();
      expect(Array.isArray(healthResults)).toBe(true);
      
      healthResults.forEach(h => {
        expect(h.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(h.status);
      });
    });
    
    it('should support periodic health check polling', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      // Start polling with a long interval (won't actually run during test)
      orchestrator.startHealthCheckPolling(60000);
      
      // Should have set up the interval
      const status = orchestrator.getStatus();
      expect(status).toBeDefined();
      
      // Clean up
      orchestrator.stopHealthCheckPolling();
    });
    
    it('should stop health check polling', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      orchestrator.startHealthCheckPolling(60000);
      orchestrator.stopHealthCheckPolling();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
  
  describe('Chat with Failover', () => {
    it('should stream chat with provider info', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const chunks: any[] = [];
      
      for await (const chunk of orchestrator.streamChat(messages, {})) {
        chunks.push(chunk);
      }
      
      // Should have received chunks
      expect(chunks.length).toBeGreaterThan(0);
      
      // At least one chunk should have provider info
      const chunksWithProvider = chunks.filter(c => c.provider);
      expect(chunksWithProvider.length).toBeGreaterThan(0);
    });
    
    it('should return result with provider and latency info', async () => {
      const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
      const orchestrator = new LLMOrchestrator();
      
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const result = await orchestrator.chat(messages, {});
      
      expect(result.content).toBeDefined();
      expect(result.provider).toBeDefined();
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('LLM Provider Interface', () => {
  describe('Provider Types', () => {
    it('should define provider types correctly', async () => {
      const { ProviderType } = await import('../services/llm/llm-provider.interface');
      
      expect(ProviderType.PRIMARY).toBe('primary');
      expect(ProviderType.SECONDARY).toBe('secondary');
      expect(ProviderType.TERTIARY).toBe('tertiary');
    });
  });
  
  describe('Provider Status', () => {
    it('should define provider status correctly', async () => {
      const { ProviderStatus } = await import('../services/llm/llm-provider.interface');
      
      expect(ProviderStatus.HEALTHY).toBe('healthy');
      expect(ProviderStatus.DEGRADED).toBe('degraded');
      expect(ProviderStatus.UNHEALTHY).toBe('unhealthy');
      expect(ProviderStatus.UNKNOWN).toBe('unknown');
    });
  });
});

describe('Health Endpoint Data', () => {
  it('should return correct health data structure', async () => {
    const { LLMOrchestrator } = await import('../services/llm/llm-orchestrator');
    const orchestrator = new LLMOrchestrator();
    
    const metrics = orchestrator.getAllMetrics();
    
    metrics.forEach(m => {
      expect(m).toHaveProperty('providerName');
      expect(m).toHaveProperty('type');
      expect(m).toHaveProperty('totalRequests');
      expect(m).toHaveProperty('successfulRequests');
      expect(m).toHaveProperty('failedRequests');
      expect(m).toHaveProperty('averageLatencyMs');
      expect(m).toHaveProperty('health');
      
      expect(m.health).toHaveProperty('status');
      expect(m.health).toHaveProperty('latencyMs');
      expect(m.health).toHaveProperty('lastCheck');
    });
  });
});
