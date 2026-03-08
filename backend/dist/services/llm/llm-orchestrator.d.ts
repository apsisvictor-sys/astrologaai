/**
 * LLM Orchestrator
 * US-34: LLM Provider Fallback Strategy
 *
 * Manages multiple LLM providers with automatic failover,
 * health checks, latency monitoring, and provider switch logging.
 */
import { type LLMProvider, type LLMOrchestratorInterface, type ChatMessage, type StreamChunk, type LLMConfig, type ProviderMetrics, type ProviderHealth, type ProviderSwitchEvent } from './llm-provider.interface';
export declare class LLMOrchestrator implements LLMOrchestratorInterface {
    private providers;
    private activeProviderIndex;
    private switchHistory;
    private healthCheckInterval;
    private consecutiveFailures;
    private consecutiveSuccesses;
    private manualOverride;
    private overrideReason;
    constructor();
    /**
     * Initialize providers based on available API keys
     */
    private initializeProviders;
    /**
     * Get the currently active provider
     */
    getActiveProvider(): LLMProvider;
    /**
     * Get all providers
     */
    getAllProviders(): LLMProvider[];
    /**
     * Get metrics for all providers
     */
    getAllMetrics(): ProviderMetrics[];
    /**
     * Get provider switch history
     */
    getSwitchHistory(): ProviderSwitchEvent[];
    /**
     * Log a provider switch event
     */
    private logSwitch;
    /**
     * Store switch event in Redis
     */
    private storeSwitchEvent;
    /**
     * Find the next healthy provider
     */
    private findNextHealthyProvider;
    /**
     * Switch to the next provider
     */
    private switchToNextProvider;
    /**
     * Track provider failure
     */
    private trackFailure;
    /**
     * Track provider success
     */
    private trackSuccess;
    /**
     * Stream chat with automatic failover
     */
    streamChat(messages: ChatMessage[], config?: Partial<LLMConfig>): AsyncGenerator<StreamChunk & {
        provider?: string;
    }>;
    /**
     * Non-streaming chat with automatic failover
     */
    chat(messages: ChatMessage[], config?: Partial<LLMConfig>): Promise<{
        content: string;
        provider: string;
        latencyMs: number;
    }>;
    /**
     * Get cached health status from Redis
     * Returns null if cache doesn't exist or expired
     */
    private getCachedHealth;
    /**
     * Cache health status in Redis (TTL: 5 minutes)
     */
    private cacheHealth;
    /**
     * Check health of all providers
     * Uses Redis cache with 5-minute TTL to reduce API calls
     */
    checkAllHealth(): Promise<ProviderHealth[]>;
    /**
     * Force refresh health status (bypass cache)
     */
    forceRefreshHealth(): Promise<ProviderHealth[]>;
    /**
     * Start periodic health check polling
     */
    startHealthCheckPolling(intervalMs?: number): void;
    /**
     * Stop health check polling
     */
    stopHealthCheckPolling(): void;
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
    };
    /**
     * Manually set the active provider (US-34 AC#7)
     * Logs the override and disables automatic selection
     */
    setActiveProvider(providerName: string, reason: string): void;
    /**
     * Clear manual override and return to automatic selection (US-34 AC#7)
     */
    clearOverride(): void;
    /**
     * Find the best provider based on health and latency (US-34 AC#6)
     */
    private findBestProvider;
    /**
     * Check if manual override is active
     */
    isOverrideActive(): boolean;
}
/**
 * Get the singleton orchestrator instance
 */
export declare function getLLMOrchestrator(): LLMOrchestrator;
/**
 * Reset the orchestrator (for testing)
 */
export declare function resetLLMOrchestrator(): void;
export default LLMOrchestrator;
//# sourceMappingURL=llm-orchestrator.d.ts.map