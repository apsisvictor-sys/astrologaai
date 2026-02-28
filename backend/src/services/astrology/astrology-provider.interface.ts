/**
 * Astrology Provider Interface
 * US-33: Astrology API Fallback Strategy
 * 
 * Abstraction layer for multiple astrology API providers
 * Enables health checks, latency monitoring, and automatic failover
 */

// ============================================
// Types
// ============================================

export enum AstrologyProviderType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary'
}

export enum AstrologyProviderStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
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
  person1: { chart: NatalChart };
  person2: { chart: NatalChart };
  compatibility: {
    overall: number;
    emotional: number;
    communication: number;
    physical: number;
  };
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

// ============================================
// Circuit Breaker State
// ============================================

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, requests blocked
  HALF_OPEN = 'half_open' // Testing if recovered
}

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
}

// ============================================
// Astrology Provider Interface
// ============================================

export interface AstrologyProvider {
  /**
   * Unique identifier for this provider
   */
  readonly name: string;
  
  /**
   * Provider type (primary, secondary, tertiary)
   */
  readonly type: AstrologyProviderType;
  
  /**
   * API endpoint URL
   */
  readonly endpoint: string;
  
  /**
   * Check if this provider is available and configured
   */
  isAvailable(): boolean;
  
  /**
   * Perform a health check on this provider
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
   * Calculate natal chart
   */
  calculateNatalChart(
    birthData: BirthDataInput,
    options?: AstrologyCalculationOptions
  ): Promise<NatalChart>;
  
  /**
   * Get current transits
   */
  getTransits(
    date: string,
    options?: { latitude?: number; longitude?: number }
  ): Promise<TransitData>;
  
  /**
   * Calculate synastry between two charts
   */
  calculateSynastry(
    birthData1: BirthDataInput,
    birthData2: BirthDataInput
  ): Promise<SynastryData>;
  
  /**
   * Update provider health status
   */
  updateHealth(status: AstrologyProviderStatus, latencyMs: number, error?: string): void;
  
  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState;
  
  /**
   * Reset circuit breaker (manual override)
   */
  resetCircuitBreaker(): void;
}

// ============================================
// Base Provider Class
// ============================================

export abstract class BaseAstrologyProvider implements AstrologyProvider {
  abstract readonly name: string;
  abstract readonly type: AstrologyProviderType;
  abstract readonly endpoint: string;
  
  protected health: ProviderHealth = {
    status: AstrologyProviderStatus.UNKNOWN,
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
  
  // Circuit breaker configuration
  protected circuitBreaker: CircuitBreakerState = {
    state: CircuitState.CLOSED,
    failureCount: 0,
    lastFailureTime: null,
    nextRetryTime: null,
  };
  
  protected readonly CIRCUIT_BREAKER_THRESHOLD = 3; // Open after 3 failures
  protected readonly CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds
  
  abstract isAvailable(): boolean;
  abstract calculateNatalChart(
    birthData: BirthDataInput,
    options?: AstrologyCalculationOptions
  ): Promise<NatalChart>;
  abstract getTransits(
    date: string,
    options?: { latitude?: number; longitude?: number }
  ): Promise<TransitData>;
  abstract calculateSynastry(
    birthData1: BirthDataInput,
    birthData2: BirthDataInput
  ): Promise<SynastryData>;
  
  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Use a simple natal chart calculation as health check
      const testBirthData: BirthDataInput = {
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        latitude: 0,
        longitude: 0,
        timezone: 'UTC'
      };
      
      const chart = await this.calculateNatalChart(testBirthData);
      const latencyMs = Date.now() - startTime;
      
      if (chart && chart.sun) {
        this.updateHealth(AstrologyProviderStatus.HEALTHY, latencyMs);
      } else {
        this.updateHealth(AstrologyProviderStatus.DEGRADED, latencyMs, 'Invalid response');
      }
      
      return this.health;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateHealth(AstrologyProviderStatus.UNHEALTHY, latencyMs, errorMessage);
      
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
  
  updateHealth(status: AstrologyProviderStatus, latencyMs: number, error?: string): void {
    this.health = {
      status,
      latencyMs,
      lastCheck: new Date(),
      errorCount: error ? this.health.errorCount + 1 : this.health.errorCount,
      successCount: error ? this.health.successCount : this.health.successCount + 1,
      lastError: error,
    };
    
    // Update circuit breaker
    if (status === AstrologyProviderStatus.UNHEALTHY) {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = new Date();
      
      if (this.circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreaker.state = CircuitState.OPEN;
        this.circuitBreaker.nextRetryTime = new Date(Date.now() + this.CIRCUIT_BREAKER_RESET_TIMEOUT);
      }
    } else if (status === AstrologyProviderStatus.HEALTHY) {
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.state = CircuitState.CLOSED;
      this.circuitBreaker.lastFailureTime = null;
      this.circuitBreaker.nextRetryTime = null;
    }
    
    // Track metrics
    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 100) {
      this.metrics.latencies.shift();
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
  
  /**
   * Check if circuit breaker allows requests
   */
  protected canMakeRequest(): boolean {
    if (this.circuitBreaker.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.circuitBreaker.state === CircuitState.OPEN) {
      // Check if we should transition to half-open
      if (this.circuitBreaker.nextRetryTime && new Date() >= this.circuitBreaker.nextRetryTime) {
        this.circuitBreaker.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }
    
    // Half-open: allow one request to test
    return true;
  }
  
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }
  
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: null,
      nextRetryTime: null,
    };
    console.log(`[Astrology] Circuit breaker reset for ${this.name}`);
  }
}

// ============================================
// Orchestrator Interface
// ============================================

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
  calculateNatalChart(
    birthData: BirthDataInput,
    options?: AstrologyCalculationOptions
  ): Promise<NatalChart>;
  
  /**
   * Get transits with automatic failover
   */
  getTransits(
    date: string,
    options?: { latitude?: number; longitude?: number }
  ): Promise<TransitData>;
  
  /**
   * Calculate synastry with automatic failover
   */
  calculateSynastry(
    birthData1: BirthDataInput,
    birthData2: BirthDataInput
  ): Promise<SynastryData>;
  
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

export type {
  BirthDataInput as BirthDataInputType,
  NatalChart as NatalChartType,
  TransitData as TransitDataType,
  SynastryData as SynastryDataType,
};
