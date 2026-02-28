/**
 * LLM Provider Interface
 * US-34: LLM Provider Fallback Strategy
 * 
 * Abstraction layer for multiple LLM providers
 * Enables health checks, latency monitoring, and automatic failover
 */

// ============================================
// Types
// ============================================

export enum ProviderType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary'
}

export enum ProviderStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

export interface ProviderHealth {
  status: ProviderStatus;
  latencyMs: number;
  lastCheck: Date;
  errorCount: number;
  successCount: number;
  lastError?: string;
}

export interface ProviderMetrics {
  providerName: string;
  type: ProviderType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  lastRequestAt?: Date;
  health: ProviderHealth;
}

export interface ProviderSwitchEvent {
  timestamp: Date;
  fromProvider: string;
  toProvider: string;
  reason: string;
  error?: string;
}

// ============================================
// LLM Provider Interface
// ============================================

export interface LLMProvider {
  /**
   * Unique identifier for this provider
   */
  readonly name: string;
  
  /**
   * Provider type (primary, secondary, tertiary)
   */
  readonly type: ProviderType;
  
  /**
   * Model identifier
   */
  readonly model: string;
  
  /**
   * Check if this provider is available and configured
   */
  isAvailable(): boolean;
  
  /**
   * Perform a health check on this provider
   * Returns health status and latency
   */
  healthCheck(): Promise<ProviderHealth>;
  
  /**
   * Get current latency in milliseconds
   */
  getLatency(): number;
  
  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics;
  
  /**
   * Stream chat completion
   */
  streamChat(
    messages: ChatMessage[],
    config: Partial<LLMConfig>
  ): AsyncGenerator<StreamChunk>;
  
  /**
   * Non-streaming chat completion
   */
  chat(
    messages: ChatMessage[],
    config: Partial<LLMConfig>
  ): Promise<string>;
  
  /**
   * Update provider health status
   */
  updateHealth(status: ProviderStatus, latencyMs: number, error?: string): void;
}

// ============================================
// Base Provider Class
// ============================================

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly type: ProviderType;
  abstract readonly model: string;
  
  protected health: ProviderHealth = {
    status: ProviderStatus.UNKNOWN,
    latencyMs: 0,
    lastCheck: new Date(),
    errorCount: 0,
    successCount: 0,
  };
  
  protected metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    latencies: [] as number[],
  };
  
  abstract isAvailable(): boolean;
  abstract streamChat(
    messages: ChatMessage[],
    config: Partial<LLMConfig>
  ): AsyncGenerator<StreamChunk>;
  
  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Simple health check - send a minimal request
      const response = await this.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 5, temperature: 0 }
      );
      
      const latencyMs = Date.now() - startTime;
      
      this.updateHealth(ProviderStatus.HEALTHY, latencyMs);
      
      return {
        ...this.health,
        status: response ? ProviderStatus.HEALTHY : ProviderStatus.UNHEALTHY,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, errorMessage);
      
      return this.health;
    }
  }
  
  getLatency(): number {
    return this.health.latencyMs;
  }
  
  getMetrics(): ProviderMetrics {
    const avgLatency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
      : 0;
    
    return {
      providerName: this.name,
      type: this.type,
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      averageLatencyMs: avgLatency,
      lastRequestAt: this.health.lastCheck,
      health: this.health,
    };
  }
  
  async chat(
    messages: ChatMessage[],
    config: Partial<LLMConfig>
  ): Promise<string> {
    let fullResponse = '';
    
    for await (const chunk of this.streamChat(messages, config)) {
      if (chunk.error) {
        throw new Error(chunk.error);
      }
      fullResponse += chunk.content;
      if (chunk.done) break;
    }
    
    return fullResponse;
  }
  
  updateHealth(status: ProviderStatus, latencyMs: number, error?: string): void {
    this.health = {
      status,
      latencyMs,
      lastCheck: new Date(),
      errorCount: error ? this.health.errorCount + 1 : this.health.errorCount,
      successCount: error ? this.health.successCount : this.health.successCount + 1,
      lastError: error,
    };
    
    // Track metrics
    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 100) {
      this.metrics.latencies.shift(); // Keep last 100 measurements
    }
  }
  
  protected recordRequest(success: boolean, latencyMs: number): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 100) {
      this.metrics.latencies.shift();
    }
  }
}

// ============================================
// Orchestrator Interface
// ============================================

export interface LLMOrchestratorInterface {
  /**
   * Get the active provider
   */
  getActiveProvider(): LLMProvider;
  
  /**
   * Get all providers with their status
   */
  getAllProviders(): LLMProvider[];
  
  /**
   * Get provider metrics for all providers
   */
  getAllMetrics(): ProviderMetrics[];
  
  /**
   * Get provider switch history
   */
  getSwitchHistory(): ProviderSwitchEvent[];
  
  /**
   * Stream chat with automatic failover
   */
  streamChat(
    messages: ChatMessage[],
    config: Partial<LLMConfig>
  ): AsyncGenerator<StreamChunk & { provider?: string }>;
  
  /**
   * Non-streaming chat with automatic failover
   */
  chat(
    messages: ChatMessage[],
    config: Partial<LLMConfig>
  ): Promise<{ content: string; provider: string; latencyMs: number }>;
  
  /**
   * Force health check on all providers
   */
  checkAllHealth(): Promise<ProviderHealth[]>;
  
  /**
   * Start periodic health check polling
   */
  startHealthCheckPolling(intervalMs?: number): void;
  
  /**
   * Stop health check polling
   */
  stopHealthCheckPolling(): void;
}

export type {
  ChatMessage as ChatMessageType,
  StreamChunk as StreamChunkType,
  LLMConfig as LLMConfigType,
};
