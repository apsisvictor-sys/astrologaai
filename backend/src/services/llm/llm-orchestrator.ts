/**
 * LLM Orchestrator
 * US-34: LLM Provider Fallback Strategy
 * 
 * Manages multiple LLM providers with automatic failover,
 * health checks, latency monitoring, and provider switch logging.
 */

import {
  type LLMProvider,
  type LLMOrchestratorInterface,
  type ChatMessage,
  type StreamChunk,
  type LLMConfig,
  type ProviderMetrics,
  type ProviderHealth,
  type ProviderSwitchEvent,
  ProviderStatus,
  ProviderType,
} from './llm-provider.interface';
import { OpenAIProvider, createPrimaryOpenAIProvider, createSecondaryOpenAIProvider } from './openai-provider';
import { GLMProvider, MiniMaxProvider, createPrimaryGLMProvider, createMiniMaxProvider } from './glm-provider';
import { redisClient } from '../../utils/redis';

// ============================================
// Configuration
// ============================================

const HEALTH_CHECK_INTERVAL_MS = parseInt(process.env.LLM_HEALTH_CHECK_INTERVAL || '30000', 10); // 30 seconds
const MAX_SWITCH_HISTORY = 100;
const UNHEALTHY_THRESHOLD = 3; // Mark unhealthy after 3 consecutive failures
const RECOVERY_THRESHOLD = 2; // Mark healthy after 2 consecutive successes
const HEALTH_CACHE_TTL = parseInt(process.env.LLM_HEALTH_CACHE_TTL || '300', 10); // 5 minutes (300 seconds)
const HEALTH_CACHE_KEY = 'llm:provider_health';

// ============================================
// LLM Orchestrator Implementation
// ============================================

export class LLMOrchestrator implements LLMOrchestratorInterface {
  private providers: LLMProvider[] = [];
  private activeProviderIndex: number = 0;
  private switchHistory: ProviderSwitchEvent[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures: Map<string, number> = new Map();
  private consecutiveSuccesses: Map<string, number> = new Map();
  private manualOverride: boolean = false;
  private overrideReason: string | null = null;
  
  constructor() {
    this.initializeProviders();
  }
  
  /**
   * Initialize providers based on available API keys
   */
  private initializeProviders(): void {
    // Priority order: GLM (primary) → OpenAI (secondary) → MiniMax (tertiary)
    
    // Primary: GLM-4-flash (fast, cost-effective for production)
    if (process.env.GLM_API_KEY) {
      this.providers.push(createPrimaryGLMProvider());
      console.log('[LLM Orchestrator] Added GLM as primary provider');
    }
    
    // Secondary: OpenAI GPT-4o (high quality fallback)
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(createPrimaryOpenAIProvider());
      console.log('[LLM Orchestrator] Added OpenAI as secondary provider');
    }
    
    // Tertiary: MiniMax (alternative fallback)
    if (process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID) {
      this.providers.push(createMiniMaxProvider());
      console.log('[LLM Orchestrator] Added MiniMax as tertiary provider');
    }
    
    if (this.providers.length === 0) {
      console.error('[LLM Orchestrator] No LLM providers configured!');
    }
  }
  
  /**
   * Get the currently active provider
   */
  getActiveProvider(): LLMProvider {
    if (this.providers.length === 0) {
      throw new Error('No LLM providers configured');
    }
    return this.providers[this.activeProviderIndex];
  }
  
  /**
   * Get all providers
   */
  getAllProviders(): LLMProvider[] {
    return [...this.providers];
  }
  
  /**
   * Get metrics for all providers
   */
  getAllMetrics(): ProviderMetrics[] {
    return this.providers.map(p => p.getMetrics());
  }
  
  /**
   * Get provider switch history
   */
  getSwitchHistory(): ProviderSwitchEvent[] {
    return [...this.switchHistory];
  }
  
  /**
   * Log a provider switch event
   */
  private logSwitch(fromProvider: string, toProvider: string, reason: string, error?: string): void {
    const event: ProviderSwitchEvent = {
      timestamp: new Date(),
      fromProvider,
      toProvider,
      reason,
      error,
    };
    
    this.switchHistory.push(event);
    
    // Keep only last MAX_SWITCH_HISTORY events
    if (this.switchHistory.length > MAX_SWITCH_HISTORY) {
      this.switchHistory.shift();
    }
    
    // Log to console for monitoring
    console.log(`[LLM Orchestrator] Provider switch: ${fromProvider} → ${toProvider} (${reason})`);
    
    // Store in Redis for persistence (optional)
    this.storeSwitchEvent(event).catch(err => {
      console.error('[LLM Orchestrator] Failed to store switch event:', err);
    });
  }
  
  /**
   * Store switch event in Redis
   */
  private async storeSwitchEvent(event: ProviderSwitchEvent): Promise<void> {
    try {
      const key = 'llm:switch_history';
      await redisClient.lPush(key, JSON.stringify(event));
      await redisClient.lTrim(key, 0, MAX_SWITCH_HISTORY - 1);
    } catch (error) {
      // Non-critical, just log
      console.error('[LLM Orchestrator] Redis store error:', error);
    }
  }
  
  /**
   * Find the next healthy provider
   */
  private findNextHealthyProvider(fromIndex: number): number {
    for (let i = 0; i < this.providers.length; i++) {
      const index = (fromIndex + i) % this.providers.length;
      const provider = this.providers[index];
      
      if (provider.isAvailable()) {
        const health = provider.getMetrics().health;
        if (health.status !== ProviderStatus.UNHEALTHY) {
          return index;
        }
      }
    }
    
    // If all providers are unhealthy, return the first available one
    for (let i = 0; i < this.providers.length; i++) {
      if (this.providers[i].isAvailable()) {
        return i;
      }
    }
    
    return -1;
  }
  
  /**
   * Switch to the next provider
   */
  private switchToNextProvider(reason: string, error?: string): boolean {
    const currentProvider = this.getActiveProvider();
    const nextIndex = this.findNextHealthyProvider(this.activeProviderIndex + 1);
    
    if (nextIndex === -1 || nextIndex === this.activeProviderIndex) {
      console.error('[LLM Orchestrator] No alternative provider available');
      return false;
    }
    
    const nextProvider = this.providers[nextIndex];
    
    this.logSwitch(
      currentProvider.name,
      nextProvider.name,
      reason,
      error
    );
    
    this.activeProviderIndex = nextIndex;
    return true;
  }
  
  /**
   * Track provider failure
   */
  private trackFailure(providerName: string, error: string): void {
    const failures = (this.consecutiveFailures.get(providerName) || 0) + 1;
    this.consecutiveFailures.set(providerName, failures);
    this.consecutiveSuccesses.set(providerName, 0);
    
    if (failures >= UNHEALTHY_THRESHOLD) {
      const provider = this.providers.find(p => p.name === providerName);
      if (provider) {
        provider.updateHealth(ProviderStatus.UNHEALTHY, provider.getLatency(), error);
        console.warn(`[LLM Orchestrator] Provider ${providerName} marked as unhealthy`);
      }
    }
  }
  
  /**
   * Track provider success
   */
  private trackSuccess(providerName: string, latencyMs: number): void {
    const successes = (this.consecutiveSuccesses.get(providerName) || 0) + 1;
    this.consecutiveSuccesses.set(providerName, successes);
    this.consecutiveFailures.set(providerName, 0);
    
    if (successes >= RECOVERY_THRESHOLD) {
      const provider = this.providers.find(p => p.name === providerName);
      if (provider) {
        provider.updateHealth(ProviderStatus.HEALTHY, latencyMs);
      }
    }
  }
  
  /**
   * Stream chat with automatic failover
   */
  async *streamChat(
    messages: ChatMessage[],
    config: Partial<LLMConfig> = {}
  ): AsyncGenerator<StreamChunk & { provider?: string }> {
    if (this.providers.length === 0) {
      yield { content: '', done: false, error: 'No LLM providers configured', provider: 'none' };
      return;
    }
    
    let attemptedProviders = new Set<string>();
    let currentIndex = this.activeProviderIndex;
    
    while (attemptedProviders.size < this.providers.length) {
      const provider = this.providers[currentIndex];
      
      if (!provider.isAvailable() || attemptedProviders.has(provider.name)) {
        currentIndex = (currentIndex + 1) % this.providers.length;
        continue;
      }
      
      attemptedProviders.add(provider.name);
      const startTime = Date.now();
      let hasError = false;
      let errorMessage = '';
      
      try {
        // Yield chunks from this provider
        for await (const chunk of provider.streamChat(messages, config)) {
          if (chunk.error) {
            hasError = true;
            errorMessage = chunk.error;
            break;
          }
          
          yield { ...chunk, provider: provider.name };
          
          if (chunk.done) {
            const latencyMs = Date.now() - startTime;
            this.trackSuccess(provider.name, latencyMs);
            return;
          }
        }
        
        if (!hasError) {
          return;
        }
      } catch (error) {
        hasError = true;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
      
      // Handle failure
      const latencyMs = Date.now() - startTime;
      this.trackFailure(provider.name, errorMessage);
      
      // Try to switch to next provider
      if (attemptedProviders.size < this.providers.length) {
        const switched = this.switchToNextProvider('Provider failure', errorMessage);
        if (switched) {
          currentIndex = this.activeProviderIndex;
          
          // Yield a system message about the switch (optional)
          yield {
            content: '',
            done: false,
            error: `Primary provider unavailable, switching to ${this.getActiveProvider().name}...`,
            provider: 'system',
          };
        }
      }
    }
    
    // All providers failed
    yield {
      content: '',
      done: true,
      error: 'All LLM providers failed. Please try again later.',
      provider: 'none',
    };
  }
  
  /**
   * Non-streaming chat with automatic failover
   */
  async chat(
    messages: ChatMessage[],
    config: Partial<LLMConfig> = {}
  ): Promise<{ content: string; provider: string; latencyMs: number }> {
    const startTime = Date.now();
    let fullContent = '';
    let lastProvider = 'none';
    
    for await (const chunk of this.streamChat(messages, config)) {
      if (chunk.error && chunk.provider !== 'system') {
        throw new Error(chunk.error);
      }
      fullContent += chunk.content;
      if (chunk.provider && chunk.provider !== 'system') {
        lastProvider = chunk.provider;
      }
    }
    
    return {
      content: fullContent,
      provider: lastProvider,
      latencyMs: Date.now() - startTime,
    };
  }
  
  /**
   * Get cached health status from Redis
   * Returns null if cache doesn't exist or expired
   */
  private async getCachedHealth(): Promise<Record<string, ProviderHealth> | null> {
    try {
      const cached = await redisClient.get(HEALTH_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('[LLM Orchestrator] Failed to get cached health:', error);
    }
    return null;
  }
  
  /**
   * Cache health status in Redis (TTL: 5 minutes)
   */
  private async cacheHealth(healthData: Record<string, ProviderHealth>): Promise<void> {
    try {
      await redisClient.setEx(HEALTH_CACHE_KEY, HEALTH_CACHE_TTL, JSON.stringify(healthData));
    } catch (error) {
      console.error('[LLM Orchestrator] Failed to cache health:', error);
    }
  }
  
  /**
   * Check health of all providers
   * Uses Redis cache with 5-minute TTL to reduce API calls
   */
  async checkAllHealth(): Promise<ProviderHealth[]> {
    // Try to get cached health first
    const cachedHealth = await this.getCachedHealth();
    
    if (cachedHealth) {
      // Return cached health, but also trigger background refresh if needed
      const results = this.providers.map((provider) => {
        return cachedHealth[provider.name] || {
          status: ProviderStatus.UNKNOWN,
          latencyMs: 0,
          lastCheck: new Date(),
          errorCount: 0,
          successCount: 0,
        };
      });
      
      return results;
    }
    
    // No cache - perform actual health checks
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.healthCheck();
        } catch (error) {
          return {
            status: ProviderStatus.UNHEALTHY,
            latencyMs: 0,
            lastCheck: new Date(),
            errorCount: 1,
            successCount: 0,
            lastError: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
    
    // Cache results
    const healthMap: Record<string, ProviderHealth> = {};
    this.providers.forEach((provider, index) => {
      healthMap[provider.name] = results[index];
    });
    await this.cacheHealth(healthMap);
    
    return results;
  }
  
  /**
   * Force refresh health status (bypass cache)
   */
  async forceRefreshHealth(): Promise<ProviderHealth[]> {
    // Clear cache
    try {
      await redisClient.del(HEALTH_CACHE_KEY);
    } catch (error) {
      console.error('[LLM Orchestrator] Failed to clear health cache:', error);
    }
    
    // Perform fresh health checks
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.healthCheck();
        } catch (error) {
          return {
            status: ProviderStatus.UNHEALTHY,
            latencyMs: 0,
            lastCheck: new Date(),
            errorCount: 1,
            successCount: 0,
            lastError: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
    
    // Cache results
    const healthMap: Record<string, ProviderHealth> = {};
    this.providers.forEach((provider, index) => {
      healthMap[provider.name] = results[index];
    });
    await this.cacheHealth(healthMap);
    
    return results;
  }
  
  /**
   * Start periodic health check polling
   */
  startHealthCheckPolling(intervalMs: number = HEALTH_CHECK_INTERVAL_MS): void {
    if (this.healthCheckInterval) {
      console.warn('[LLM Orchestrator] Health check polling already running');
      return;
    }
    
    console.log(`[LLM Orchestrator] Starting health check polling (interval: ${intervalMs}ms)`);
    
    // Run initial health check
    this.checkAllHealth().catch(err => {
      console.error('[LLM Orchestrator] Initial health check failed:', err);
    });
    
    // Schedule periodic checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAllHealth();
        
        // If active provider is unhealthy, try to switch
        const activeHealth = this.getActiveProvider().getMetrics().health;
        if (activeHealth.status === ProviderStatus.UNHEALTHY) {
          this.switchToNextProvider('Health check failed');
        }
      } catch (error) {
        console.error('[LLM Orchestrator] Health check error:', error);
      }
    }, intervalMs);
  }
  
  /**
   * Stop health check polling
   */
  stopHealthCheckPolling(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[LLM Orchestrator] Health check polling stopped');
    }
  }
  
  /**
   * Get orchestrator status summary
   */
  getStatus(): {
    activeProvider: string;
    totalProviders: number;
    healthyProviders: number;
    lastSwitch?: ProviderSwitchEvent;
    manualOverride?: boolean;
    overrideReason?: string;
  } {
    const healthyCount = this.providers.filter(p => {
      const health = p.getMetrics().health;
      return health.status === ProviderStatus.HEALTHY || health.status === ProviderStatus.DEGRADED;
    }).length;
    
    const status: {
      activeProvider: string;
      totalProviders: number;
      healthyProviders: number;
      lastSwitch?: ProviderSwitchEvent;
      manualOverride?: boolean;
      overrideReason?: string;
    } = {
      activeProvider: this.getActiveProvider()?.name || 'none',
      totalProviders: this.providers.length,
      healthyProviders: healthyCount,
      lastSwitch: this.switchHistory[this.switchHistory.length - 1],
    };
    
    if (this.manualOverride) {
      status.manualOverride = true;
      status.overrideReason = this.overrideReason || undefined;
    }
    
    return status;
  }
  
  /**
   * Manually set the active provider (US-34 AC#7)
   * Logs the override and disables automatic selection
   */
  setActiveProvider(providerName: string, reason: string): void {
    const index = this.providers.findIndex(p => p.name === providerName);
    
    if (index === -1) {
      throw new Error(`Provider '${providerName}' not found`);
    }
    
    const previousProvider = this.getActiveProvider().name;
    
    // Log the switch
    this.logSwitch(
      previousProvider,
      providerName,
      `Manual override: ${reason}`,
    );
    
    this.activeProviderIndex = index;
    this.manualOverride = true;
    this.overrideReason = reason;
    
    console.log(`[LLM Orchestrator] Manual override: ${previousProvider} → ${providerName} (${reason})`);
  }
  
  /**
   * Clear manual override and return to automatic selection (US-34 AC#7)
   */
  clearOverride(): void {
    if (this.manualOverride) {
      console.log(`[LLM Orchestrator] Manual override cleared, returning to automatic selection`);
      this.manualOverride = false;
      this.overrideReason = null;
      
      // Optionally switch to best available provider
      const bestIndex = this.findBestProvider();
      if (bestIndex !== -1 && bestIndex !== this.activeProviderIndex) {
        const previousProvider = this.getActiveProvider().name;
        this.activeProviderIndex = bestIndex;
        this.logSwitch(
          previousProvider,
          this.getActiveProvider().name,
          'Automatic selection after override cleared'
        );
      }
    }
  }
  
  /**
   * Find the best provider based on health and latency (US-34 AC#6)
   */
  private findBestProvider(): number {
    const availableProviders = this.providers
      .map((p, index) => ({
        index,
        provider: p,
        metrics: p.getMetrics(),
      }))
      .filter(({ provider, metrics }) => 
        provider.isAvailable() && 
        metrics.health.status !== ProviderStatus.UNHEALTHY
      );
    
    if (availableProviders.length === 0) {
      return -1;
    }
    
    // Sort by: 1) Health status (healthy > degraded > unknown), 2) Latency
    availableProviders.sort((a, b) => {
      const healthPriority = {
        [ProviderStatus.HEALTHY]: 0,
        [ProviderStatus.DEGRADED]: 1,
        [ProviderStatus.UNKNOWN]: 2,
        [ProviderStatus.UNHEALTHY]: 3,
      };
      
      const healthDiff = (healthPriority[a.metrics.health.status] || 3) - 
                         (healthPriority[b.metrics.health.status] || 3);
      
      if (healthDiff !== 0) return healthDiff;
      
      // If same health status, prefer lower latency
      return a.metrics.health.latencyMs - b.metrics.health.latencyMs;
    });
    
    return availableProviders[0].index;
  }
  
  /**
   * Check if manual override is active
   */
  isOverrideActive(): boolean {
    return this.manualOverride;
  }
}

// ============================================
// Singleton Instance
// ============================================

let orchestratorInstance: LLMOrchestrator | null = null;

/**
 * Get the singleton orchestrator instance
 */
export function getLLMOrchestrator(): LLMOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new LLMOrchestrator();
    
    // Start health check polling
    orchestratorInstance.startHealthCheckPolling();
  }
  
  return orchestratorInstance;
}

/**
 * Reset the orchestrator (for testing)
 */
export function resetLLMOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.stopHealthCheckPolling();
    orchestratorInstance = null;
  }
}

export default LLMOrchestrator;
