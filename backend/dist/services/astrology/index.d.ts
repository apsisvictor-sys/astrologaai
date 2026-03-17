/**
 * Astrology Service - US-33: Astrology API Fallback Strategy
 *
 * Main entry point for astrology calculations with automatic failover
 */
export { AstrologyProviderType, AstrologyProviderStatus, CircuitState, type AstrologyProvider, type AstrologyOrchestratorInterface, type BirthDataInput, type NatalChart, type TransitData, type SynastryData, type PlanetPosition, type HouseCusp, type Aspect, type ProviderHealth, type ProviderMetrics, type ProviderSwitchEvent, type AstrologyCalculationOptions, type CircuitBreakerState, } from './astrology-provider.interface';
export { AstrologyAPIProvider, createAstrologyAPIProvider, } from './astrology-api-provider';
export { AstrologyOrchestrator, getAstrologyOrchestrator, resetAstrologyOrchestrator, type FailureLogEntry, } from './astrology-orchestrator';
import type { BirthDataInput, NatalChart } from './astrology-provider.interface';
/**
 * Calculate natal chart with automatic failover
 * Convenience function that wraps the orchestrator
 */
export declare function calculateNatalChart(birthData: BirthDataInput): Promise<NatalChart>;
/**
 * Check if astrology API is available
 */
export declare function checkAstrologyApiHealth(): Promise<boolean>;
/**
 * Get provider health status
 */
export declare function getProviderHealth(): Promise<Record<string, {
    status: string;
    latencyMs: number;
}>>;
/**
 * Get orchestrator status summary
 */
export declare function getOrchestratorStatus(): Promise<{
    activeProvider: string;
    totalProviders: number;
    healthyProviders: number;
    lastSwitch?: {
        timestamp: Date;
        fromProvider: string;
        toProvider: string;
        reason: string;
    };
}>;
/**
 * Get provider switch history
 */
export declare function getSwitchHistory(limit?: number): Promise<Array<{
    timestamp: Date;
    fromProvider: string;
    toProvider: string;
    reason: string;
    error?: string;
}>>;
declare const _default: {
    calculateNatalChart: typeof calculateNatalChart;
    checkAstrologyApiHealth: typeof checkAstrologyApiHealth;
    getProviderHealth: typeof getProviderHealth;
    getOrchestratorStatus: typeof getOrchestratorStatus;
    getSwitchHistory: typeof getSwitchHistory;
};
export default _default;
//# sourceMappingURL=index.d.ts.map