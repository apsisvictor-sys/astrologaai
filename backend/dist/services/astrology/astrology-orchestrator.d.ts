/**
 * Astrology Orchestrator
 * US-33: Astrology API Fallback Strategy
 *
 * Manages multiple astrology API providers with automatic failover,
 * health checks, latency monitoring, circuit breaker pattern,
 * exponential backoff, and provider switch logging.
 */
import { type AstrologyProvider, type AstrologyOrchestratorInterface, type BirthDataInput, type NatalChart, type TransitData, type SynastryData, type ProgressionData, type SolarReturnData, type RelocationData, type CompositeData, type VenusReturnData, type LunarReturnData, type SolarArcData, type AstrologyCalculationOptions, type ProviderMetrics, type ProviderHealth, type ProviderSwitchEvent } from './astrology-provider.interface';
interface FailureLogEntry {
    timestamp: Date;
    provider: string;
    operation: string;
    error: string;
    retryAttempt: number;
    birthData?: Partial<BirthDataInput>;
}
export declare class AstrologyOrchestrator implements AstrologyOrchestratorInterface {
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
     * Initialize providers based on availability
     */
    private initializeProviders;
    /**
     * Get the currently active provider
     */
    getActiveProvider(): AstrologyProvider;
    /**
     * Get all providers
     */
    getAllProviders(): AstrologyProvider[];
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
     * Execute operation with exponential backoff retry
     */
    private executeWithRetry;
    /**
     * Calculate natal chart with automatic failover
     */
    calculateNatalChart(birthData: BirthDataInput, options?: AstrologyCalculationOptions): Promise<NatalChart>;
    /**
     * Get transits with automatic failover
     */
    getTransits(date: string, options?: {
        latitude?: number;
        longitude?: number;
    }): Promise<TransitData>;
    /**
     * Calculate synastry with automatic failover
     */
    calculateSynastry(birthData1: BirthDataInput, birthData2: BirthDataInput): Promise<SynastryData>;
    getProgressions(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<ProgressionData>;
    getSolarReturn(birthData: BirthDataInput, year: number, options?: AstrologyCalculationOptions): Promise<SolarReturnData>;
    getRelocation(birthData: BirthDataInput, targetLocation: {
        latitude: number;
        longitude: number;
    }, options?: AstrologyCalculationOptions): Promise<RelocationData>;
    getCompositeChart(person1: BirthDataInput, person2: BirthDataInput, options?: AstrologyCalculationOptions): Promise<CompositeData>;
    getVenusReturn(birthData: BirthDataInput, year: number, options?: AstrologyCalculationOptions): Promise<VenusReturnData>;
    getLunarReturn(birthData: BirthDataInput, year: number, month: number, options?: AstrologyCalculationOptions): Promise<LunarReturnData>;
    getSolarArcDirections(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<SolarArcData>;
    /**
     * Get cached health status from Redis
     */
    private getCachedHealth;
    /**
     * Cache health status in Redis
     */
    private cacheHealth;
    /**
     * Check health of all providers
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
     * Manually set the active provider
     */
    setActiveProvider(providerName: string, reason: string): void;
    /**
     * Clear manual override
     */
    clearOverride(): void;
    /**
     * Find the best provider based on health and latency
     */
    private findBestProvider;
    /**
     * Check if manual override is active
     */
    isOverrideActive(): boolean;
    /**
     * Get failure logs
     */
    getFailureLogs(limit?: number): Promise<FailureLogEntry[]>;
}
/**
 * Get the singleton orchestrator instance
 */
export declare function getAstrologyOrchestrator(): AstrologyOrchestrator;
/**
 * Reset the orchestrator (for testing)
 */
export declare function resetAstrologyOrchestrator(): void;
export type { FailureLogEntry };
export default AstrologyOrchestrator;
//# sourceMappingURL=astrology-orchestrator.d.ts.map