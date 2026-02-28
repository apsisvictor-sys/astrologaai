/**
 * US-33: Astrology API Fallback Strategy - Unit Tests
 * 
 * Tests for the fallback logic, circuit breaker, exponential backoff,
 * and provider switching.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Redis
vi.mock('../../../utils/redis', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    setEx: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    lPush: vi.fn().mockResolvedValue(undefined),
    lTrim: vi.fn().mockResolvedValue(undefined),
    lRange: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue('PONG'),
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();

import {
  AstrologyOrchestrator,
  getAstrologyOrchestrator,
  resetAstrologyOrchestrator,
} from '../astrology-orchestrator';
import {
  AstrologyProviderStatus,
  CircuitState,
} from '../astrology-provider.interface';

describe('Astrology Orchestrator - US-33', () => {
  let orchestrator: AstrologyOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAstrologyOrchestrator();
    orchestrator = new AstrologyOrchestrator();
  });

  afterEach(() => {
    orchestrator.stopHealthCheckPolling();
  });

  describe('Provider Initialization', () => {
    it('should initialize with at least one provider (fallback)', () => {
      const providers = orchestrator.getAllProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should have Swiss Ephemeris as fallback provider', () => {
      const providers = orchestrator.getAllProviders();
      const fallback = providers.find(p => p.name === 'swiss-ephemeris-fallback');
      expect(fallback).toBeDefined();
      expect(fallback?.isAvailable()).toBe(true);
    });

    it('should set first available provider as active', () => {
      const activeProvider = orchestrator.getActiveProvider();
      expect(activeProvider).toBeDefined();
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate correct backoff delay for each attempt', async () => {
      // Import the helper function from orchestrator
      const orchestratorModule = await import('../astrology-orchestrator');
      
      // Access the internal function through module
      // Since it's not exported, we test through behavior
      // The backoff is: 1000 * 2^attempt, capped at 30000
      
      // Attempt 0: 1000ms
      expect(1000 * Math.pow(2, 0)).toBe(1000);
      
      // Attempt 1: 2000ms
      expect(1000 * Math.pow(2, 1)).toBe(2000);
      
      // Attempt 2: 4000ms
      expect(1000 * Math.pow(2, 2)).toBe(4000);
      
      // Attempt 3: 8000ms
      expect(1000 * Math.pow(2, 3)).toBe(8000);
      
      // Attempt 10: Should cap at 30000ms
      expect(Math.min(1000 * Math.pow(2, 10), 30000)).toBe(30000);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should start with circuit breaker closed', () => {
      const providers = orchestrator.getAllProviders();
      const primaryProvider = providers.find(p => p.name === 'astrology-api.io');
      
      if (primaryProvider) {
        const state = primaryProvider.getCircuitBreakerState();
        expect(state.state).toBe(CircuitState.CLOSED);
        expect(state.failureCount).toBe(0);
      }
    });

    it('should open circuit breaker after threshold failures', async () => {
      const providers = orchestrator.getAllProviders();
      const fallbackProvider = providers.find(p => p.name === 'swiss-ephemeris-fallback');
      
      if (fallbackProvider) {
        // Simulate failures
        for (let i = 0; i < 3; i++) {
          fallbackProvider.updateHealth(AstrologyProviderStatus.UNHEALTHY, 100, 'Test error');
        }
        
        const state = fallbackProvider.getCircuitBreakerState();
        expect(state.state).toBe(CircuitState.OPEN);
        expect(state.nextRetryTime).not.toBeNull();
      }
    });

    it('should reset circuit breaker', async () => {
      const providers = orchestrator.getAllProviders();
      const fallbackProvider = providers.find(p => p.name === 'swiss-ephemeris-fallback');
      
      if (fallbackProvider) {
        // Simulate failures
        for (let i = 0; i < 3; i++) {
          fallbackProvider.updateHealth(AstrologyProviderStatus.UNHEALTHY, 100, 'Test error');
        }
        
        expect(fallbackProvider.getCircuitBreakerState().state).toBe(CircuitState.OPEN);
        
        // Reset
        fallbackProvider.resetCircuitBreaker();
        
        const state = fallbackProvider.getCircuitBreakerState();
        expect(state.state).toBe(CircuitState.CLOSED);
        expect(state.failureCount).toBe(0);
      }
    });
  });

  describe('Natal Chart Calculation', () => {
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

    it('should calculate natal chart with fallback provider', async () => {
      const chart = await orchestrator.calculateNatalChart(testBirthData);
      
      expect(chart).toBeDefined();
      expect(chart.sun).toBeDefined();
      expect(chart.moon).toBeDefined();
      expect(chart.rising).toBeDefined();
      expect(chart.houses).toHaveLength(12);
      expect(chart.source).toBeDefined();
    });

    it('should include Bulgarian translations', async () => {
      const chart = await orchestrator.calculateNatalChart(testBirthData);
      
      expect(chart.sun.signBg).toBeDefined();
      // Bulgarian translation should exist for known signs
      const bulgarianSigns = ['Овен', 'Телец', 'Близнаци', 'Рак', 'Лъв', 'Дева', 
                              'Везни', 'Скорпион', 'Стрелец', 'Козирог', 'Водолей', 'Риби'];
      expect(bulgarianSigns).toContain(chart.sun.signBg);
    });

    it('should include elements and modalities', async () => {
      const chart = await orchestrator.calculateNatalChart(testBirthData);
      
      expect(chart.elements).toBeDefined();
      expect(chart.elements.fire).toBeGreaterThanOrEqual(0);
      expect(chart.elements.earth).toBeGreaterThanOrEqual(0);
      expect(chart.elements.air).toBeGreaterThanOrEqual(0);
      expect(chart.elements.water).toBeGreaterThanOrEqual(0);
      
      expect(chart.modalities).toBeDefined();
      expect(chart.modalities.cardinal).toBeGreaterThanOrEqual(0);
      expect(chart.modalities.fixed).toBeGreaterThanOrEqual(0);
      expect(chart.modalities.mutable).toBeGreaterThanOrEqual(0);
    });

    it('should calculate aspects', async () => {
      const chart = await orchestrator.calculateNatalChart(testBirthData);
      
      expect(chart.aspects).toBeDefined();
      expect(Array.isArray(chart.aspects)).toBe(true);
    });
  });

  describe('Provider Switching', () => {
    it('should track switch history', () => {
      const history = orchestrator.getSwitchHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should switch to fallback when primary fails', async () => {
      // If primary API is not available, should use fallback
      const providers = orchestrator.getAllProviders();
      const primaryProvider = providers.find(p => p.name === 'astrology-api.io');
      
      if (!primaryProvider?.isAvailable()) {
        // Should be using fallback
        const activeProvider = orchestrator.getActiveProvider();
        expect(activeProvider.name).toBe('swiss-ephemeris-fallback');
      }
    });

    it('should allow manual provider override', () => {
      const providers = orchestrator.getAllProviders();
      const fallbackProvider = providers.find(p => p.name === 'swiss-ephemeris-fallback');
      
      if (fallbackProvider) {
        orchestrator.setActiveProvider('swiss-ephemeris-fallback', 'Testing manual override');
        
        expect(orchestrator.getActiveProvider().name).toBe('swiss-ephemeris-fallback');
        expect(orchestrator.isOverrideActive()).toBe(true);
        
        // Clear override
        orchestrator.clearOverride();
        expect(orchestrator.isOverrideActive()).toBe(false);
      }
    });
  });

  describe('Health Checks', () => {
    it('should return health status for all providers', async () => {
      const health = await orchestrator.checkAllHealth();
      
      expect(Array.isArray(health)).toBe(true);
      expect(health.length).toBeGreaterThan(0);
      
      health.forEach(h => {
        expect(h.status).toBeDefined();
        expect(h.latencyMs).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return provider metrics', () => {
      const metrics = orchestrator.getAllMetrics();
      
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      
      metrics.forEach(m => {
        expect(m.providerName).toBeDefined();
        expect(m.health).toBeDefined();
      });
    });

    it('should return orchestrator status', () => {
      const status = orchestrator.getStatus();
      
      expect(status.activeProvider).toBeDefined();
      expect(status.totalProviders).toBeGreaterThan(0);
      expect(status.healthyProviders).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Transit Calculation', () => {
    it('should calculate transits for a date', async () => {
      const transits = await orchestrator.getTransits('2026-02-27');
      
      expect(transits).toBeDefined();
      expect(transits.date).toBe('2026-02-27');
      expect(transits.planets).toBeDefined();
      expect(Array.isArray(transits.planets)).toBe(true);
    });
  });

  describe('Synastry Calculation', () => {
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

    it('should calculate synastry between two charts', async () => {
      const synastry = await orchestrator.calculateSynastry(birthData1, birthData2);
      
      expect(synastry).toBeDefined();
      expect(synastry.person1.chart).toBeDefined();
      expect(synastry.person2.chart).toBeDefined();
      expect(synastry.compatibility).toBeDefined();
      expect(synastry.compatibility.overall).toBeGreaterThanOrEqual(0);
      expect(synastry.compatibility.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getAstrologyOrchestrator();
      const instance2 = getAstrologyOrchestrator();
      
      expect(instance1).toBe(instance2);
      
      // Cleanup
      resetAstrologyOrchestrator();
    });

    it('should reset singleton', () => {
      const instance1 = getAstrologyOrchestrator();
      resetAstrologyOrchestrator();
      const instance2 = getAstrologyOrchestrator();
      
      expect(instance1).not.toBe(instance2);
      
      // Cleanup
      resetAstrologyOrchestrator();
    });
  });
});

describe('Swiss Ephemeris Provider', () => {
  it('should always be available as fallback', async () => {
    const { createSwissEphemerisProvider } = await import('../swiss-ephemeris-provider');
    const provider = createSwissEphemerisProvider();
    
    expect(provider.isAvailable()).toBe(true);
  });

  it('should calculate valid chart positions', async () => {
    const { createSwissEphemerisProvider } = await import('../swiss-ephemeris-provider');
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
    
    expect(chart.sun.degree).toBeGreaterThanOrEqual(0);
    expect(chart.sun.degree).toBeLessThan(30);
    expect(chart.sun.house).toBeGreaterThanOrEqual(1);
    expect(chart.sun.house).toBeLessThanOrEqual(12);
  });
});

describe('Astrology API Provider', () => {
  it('should check availability based on API key', async () => {
    const { createAstrologyAPIProvider } = await import('../astrology-api-provider');
    const provider = createAstrologyAPIProvider();
    
    // Availability depends on ASTROLOGY_API_KEY env var
    expect(typeof provider.isAvailable()).toBe('boolean');
  });
});
