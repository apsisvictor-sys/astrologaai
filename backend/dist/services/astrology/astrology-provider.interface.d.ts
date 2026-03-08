/**
 * Astrology Provider Interface
 * US-33: Astrology API Fallback Strategy
 *
 * Abstraction layer for multiple astrology API providers
 * Enables health checks, latency monitoring, and automatic failover
 */
export declare enum AstrologyProviderType {
    PRIMARY = "primary",
    SECONDARY = "secondary",
    TERTIARY = "tertiary"
}
export declare enum AstrologyProviderStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    UNKNOWN = "unknown"
}
export interface BirthDataInput {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
    timezone?: string;
}
export interface PlanetPosition {
    name: string;
    sign: string;
    signBg: string;
    degree: number;
    house: number;
    retrograde: boolean;
    symbol: string;
}
export interface HouseCusp {
    number: number;
    sign: string;
    signBg: string;
    degree: number;
}
export interface Aspect {
    planet1: string;
    planet2: string;
    aspect: string;
    aspectBg: string;
    orb: number;
    nature: 'harmonious' | 'challenging' | 'neutral';
}
export interface NatalChart {
    sun: PlanetPosition;
    moon: PlanetPosition;
    rising: PlanetPosition;
    mercury: PlanetPosition;
    venus: PlanetPosition;
    mars: PlanetPosition;
    jupiter: PlanetPosition;
    saturn: PlanetPosition;
    uranus: PlanetPosition;
    neptune: PlanetPosition;
    pluto: PlanetPosition;
    northNode: PlanetPosition;
    southNode: PlanetPosition;
    chiron: PlanetPosition;
    lilith?: PlanetPosition;
    houses: HouseCusp[];
    aspects: Aspect[];
    elements: {
        fire: number;
        earth: number;
        air: number;
        water: number;
    };
    modalities: {
        cardinal: number;
        fixed: number;
        mutable: number;
    };
    calculatedAt: string;
    source: string;
}
export interface TransitData {
    date: string;
    planets: Array<{
        name: string;
        sign: string;
        degree: number;
        retrograde: boolean;
    }>;
    aspects: Array<{
        planet1: string;
        planet2: string;
        aspect: string;
        orb: number;
    }>;
}
export interface SynastryData {
    person1: {
        chart: NatalChart;
    };
    person2: {
        chart: NatalChart;
    };
    compatibility: {
        overall: number;
        emotional: number;
        communication: number;
        physical: number;
    };
    aspects: Aspect[];
}
export interface ProgressionData {
    progressedDate: string;
    planets: PlanetPosition[];
    houses: HouseCusp[];
    aspects: Aspect[];
    moonPhase: {
        phase: string;
        illumination: number;
        age: number;
        angle: number;
    };
}
export interface SolarReturnData {
    returnDate: string;
    exactTime: string;
    planets: PlanetPosition[];
    houses: HouseCusp[];
    aspects: Aspect[];
}
export interface RelocationData {
    targetLocation: {
        city: string;
        latitude: number;
        longitude: number;
    };
    lines: Array<{
        planet: string;
        angle: string;
        meaning: string;
    }>;
}
export interface CompositeData {
    midpointDate: string;
    midpointLocation: {
        latitude: number;
        longitude: number;
    };
    planets: PlanetPosition[];
    houses: HouseCusp[];
    aspects: Aspect[];
}
export interface VenusReturnData {
    returnDate: string;
    exactTime: string;
    themes: string[];
}
export interface LunarReturnData {
    returnDate: string;
    exactTime: string;
    planets: PlanetPosition[];
    houses: HouseCusp[];
    aspects: Aspect[];
}
export interface SolarArcData {
    progressedDate: string;
    arcDegrees: number;
    planets: PlanetPosition[];
    aspects: Aspect[];
}
export interface ProviderHealth {
    status: AstrologyProviderStatus;
    latencyMs: number;
    lastCheck: Date;
    errorCount: number;
    successCount: number;
    lastError?: string;
}
export interface ProviderMetrics {
    providerName: string;
    type: AstrologyProviderType;
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
export interface AstrologyCalculationOptions {
    houseSystem?: 'placidus' | 'whole' | 'equal' | 'koch';
    zodiacType?: 'tropical' | 'sidereal';
    aspectTypes?: ('major' | 'minor')[];
}
export declare enum CircuitState {
    CLOSED = "closed",// Normal operation
    OPEN = "open",// Failing, requests blocked
    HALF_OPEN = "half_open"
}
export interface CircuitBreakerState {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: Date | null;
    nextRetryTime: Date | null;
}
export interface AstrologyProvider {
    /** Provider identifier */
    name: string;
    /** Check if provider is configured and available */
    isAvailable(): boolean;
    /** Get current provider metrics */
    getMetrics(): ProviderMetrics;
    /** Get circuit breaker state */
    getCircuitBreakerState(): CircuitBreakerState;
    /** Perform health check (throws if unhealthy) */
    healthCheck(): Promise<ProviderHealth>;
    /** Update health status manually */
    updateHealth(status: AstrologyProviderStatus, latencyMs: number, error?: string): void;
    /** Calculate a complete natal chart */
    calculateNatalChart(birthData: BirthDataInput, options?: AstrologyCalculationOptions): Promise<NatalChart>;
    /** Get planetary transits for a specific date and location */
    getTransits(date: string, options?: {
        latitude?: number;
        longitude?: number;
    }): Promise<TransitData>;
    /** Calculate relationship synastry between two people */
    calculateSynastry(person1: BirthDataInput, person2: BirthDataInput): Promise<SynastryData>;
    /** Calculate secondary progressions for internal evolution */
    getProgressions(birthData: BirthDataInput, progressedDate: string, options?: AstrologyCalculationOptions): Promise<ProgressionData>;
    /** Calculate solar return chart */
    getSolarReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<SolarReturnData>;
    /** Calculate relocation chart */
    getRelocation(birthData: BirthDataInput, targetLocation: {
        latitude: number;
        longitude: number;
    }, options?: AstrologyCalculationOptions): Promise<RelocationData>;
    /** Calculate composite chart for two people */
    getCompositeChart(person1: BirthDataInput, person2: BirthDataInput, options?: AstrologyCalculationOptions): Promise<CompositeData>;
    /** Calculate Venus return chart */
    getVenusReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<VenusReturnData>;
    /** Calculate lunar return chart (monthly cycle) */
    getLunarReturn(birthData: BirthDataInput, year: number, month: number, options?: AstrologyCalculationOptions): Promise<LunarReturnData>;
    /** Calculate solar arc directions */
    getSolarArcDirections(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<SolarArcData>;
    /**
     * Get circuit breaker state
     */
    getCircuitBreakerState(): CircuitBreakerState;
    /**
     * Reset circuit breaker (manual override)
     */
    resetCircuitBreaker(): void;
}
export declare abstract class BaseAstrologyProvider implements AstrologyProvider {
    abstract readonly name: string;
    abstract readonly type: AstrologyProviderType;
    abstract readonly endpoint: string;
    protected health: ProviderHealth;
    protected metrics: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        latencies: number[];
    };
    protected circuitBreaker: CircuitBreakerState;
    protected readonly CIRCUIT_BREAKER_THRESHOLD = 3;
    protected readonly CIRCUIT_BREAKER_RESET_TIMEOUT = 30000;
    abstract isAvailable(): boolean;
    abstract calculateNatalChart(birthData: BirthDataInput, options?: AstrologyCalculationOptions): Promise<NatalChart>;
    abstract getTransits(date: string, options?: {
        latitude?: number;
        longitude?: number;
    }): Promise<TransitData>;
    abstract calculateSynastry(birthData1: BirthDataInput, birthData2: BirthDataInput): Promise<SynastryData>;
    abstract getProgressions(birthData: BirthDataInput, progressedDate: string, options?: AstrologyCalculationOptions): Promise<ProgressionData>;
    abstract getSolarReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<SolarReturnData>;
    abstract getRelocation(birthData: BirthDataInput, targetLocation: {
        latitude: number;
        longitude: number;
    }, options?: AstrologyCalculationOptions): Promise<RelocationData>;
    abstract getCompositeChart(person1: BirthDataInput, person2: BirthDataInput, options?: AstrologyCalculationOptions): Promise<CompositeData>;
    abstract getVenusReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<VenusReturnData>;
    abstract getLunarReturn(birthData: BirthDataInput, year: number, month: number, options?: AstrologyCalculationOptions): Promise<LunarReturnData>;
    abstract getSolarArcDirections(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<SolarArcData>;
    healthCheck(): Promise<ProviderHealth>;
    getLatency(): number;
    getMetrics(): ProviderMetrics;
    updateHealth(status: AstrologyProviderStatus, latencyMs: number, error?: string): void;
    protected recordRequest(success: boolean, latencyMs: number): void;
    /**
     * Check if circuit breaker allows requests
     */
    protected canMakeRequest(): boolean;
    getCircuitBreakerState(): CircuitBreakerState;
    resetCircuitBreaker(): void;
}
export interface AstrologyOrchestratorInterface {
    /**
     * Get the active provider
     */
    getActiveProvider(): AstrologyProvider;
    /**
     * Get all providers with their status
     */
    getAllProviders(): AstrologyProvider[];
    /**
     * Get provider metrics for all providers
     */
    getAllMetrics(): ProviderMetrics[];
    /**
     * Get provider switch history
     */
    getSwitchHistory(): ProviderSwitchEvent[];
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
    /**
     * Manually set active provider
     */
    setActiveProvider(providerName: string, reason: string): void;
    /**
     * Clear manual override
     */
    clearOverride(): void;
}
export type { BirthDataInput as BirthDataInputType, NatalChart as NatalChartType, TransitData as TransitDataType, SynastryData as SynastryDataType, };
//# sourceMappingURL=astrology-provider.interface.d.ts.map