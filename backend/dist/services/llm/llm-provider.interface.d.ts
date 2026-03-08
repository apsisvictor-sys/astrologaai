/**
 * LLM Provider Interface
 * US-34: LLM Provider Fallback Strategy
 *
 * Abstraction layer for multiple LLM providers
 * Enables health checks, latency monitoring, and automatic failover
 */
export declare enum ProviderType {
    PRIMARY = "primary",
    SECONDARY = "secondary",
    TERTIARY = "tertiary"
}
export declare enum ProviderStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    UNKNOWN = "unknown"
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
    streamChat(messages: ChatMessage[], config: Partial<LLMConfig>): AsyncGenerator<StreamChunk>;
    /**
     * Non-streaming chat completion
     */
    chat(messages: ChatMessage[], config: Partial<LLMConfig>): Promise<string>;
    /**
     * Update provider health status
     */
    updateHealth(status: ProviderStatus, latencyMs: number, error?: string): void;
}
export declare abstract class BaseLLMProvider implements LLMProvider {
    abstract readonly name: string;
    abstract readonly type: ProviderType;
    abstract readonly model: string;
    protected health: ProviderHealth;
    protected metrics: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        latencies: number[];
    };
    abstract isAvailable(): boolean;
    abstract streamChat(messages: ChatMessage[], config: Partial<LLMConfig>): AsyncGenerator<StreamChunk>;
    healthCheck(): Promise<ProviderHealth>;
    getLatency(): number;
    getMetrics(): ProviderMetrics;
    chat(messages: ChatMessage[], config: Partial<LLMConfig>): Promise<string>;
    updateHealth(status: ProviderStatus, latencyMs: number, error?: string): void;
    protected recordRequest(success: boolean, latencyMs: number): void;
}
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
    streamChat(messages: ChatMessage[], config: Partial<LLMConfig>): AsyncGenerator<StreamChunk & {
        provider?: string;
    }>;
    /**
     * Non-streaming chat with automatic failover
     */
    chat(messages: ChatMessage[], config: Partial<LLMConfig>): Promise<{
        content: string;
        provider: string;
        latencyMs: number;
    }>;
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
export type { ChatMessage as ChatMessageType, StreamChunk as StreamChunkType, LLMConfig as LLMConfigType, };
//# sourceMappingURL=llm-provider.interface.d.ts.map