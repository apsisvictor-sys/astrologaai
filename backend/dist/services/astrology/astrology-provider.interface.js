"use strict";
/**
 * Astrology Provider Interface
 * US-33: Astrology API Fallback Strategy
 *
 * Abstraction layer for multiple astrology API providers
 * Enables health checks, latency monitoring, and automatic failover
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAstrologyProvider = exports.CircuitState = exports.AstrologyProviderStatus = exports.AstrologyProviderType = void 0;
// ============================================
// Types
// ============================================
var AstrologyProviderType;
(function (AstrologyProviderType) {
    AstrologyProviderType["PRIMARY"] = "primary";
    AstrologyProviderType["SECONDARY"] = "secondary";
    AstrologyProviderType["TERTIARY"] = "tertiary";
})(AstrologyProviderType || (exports.AstrologyProviderType = AstrologyProviderType = {}));
var AstrologyProviderStatus;
(function (AstrologyProviderStatus) {
    AstrologyProviderStatus["HEALTHY"] = "healthy";
    AstrologyProviderStatus["DEGRADED"] = "degraded";
    AstrologyProviderStatus["UNHEALTHY"] = "unhealthy";
    AstrologyProviderStatus["UNKNOWN"] = "unknown";
})(AstrologyProviderStatus || (exports.AstrologyProviderStatus = AstrologyProviderStatus = {}));
// ============================================
// Circuit Breaker State
// ============================================
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open"; // Testing if recovered
})(CircuitState || (exports.CircuitState = CircuitState = {}));
// ============================================
// Base Provider Class
// ============================================
class BaseAstrologyProvider {
    constructor() {
        this.health = {
            status: AstrologyProviderStatus.UNKNOWN,
            latencyMs: 0,
            lastCheck: new Date(),
            errorCount: 0,
            successCount: 0,
        };
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            latencies: [],
        };
        // Circuit breaker configuration
        this.circuitBreaker = {
            state: CircuitState.CLOSED,
            failureCount: 0,
            lastFailureTime: null,
            nextRetryTime: null,
        };
        this.CIRCUIT_BREAKER_THRESHOLD = 3; // Open after 3 failures
        this.CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds
    }
    async healthCheck() {
        const startTime = Date.now();
        try {
            // Use a simple natal chart calculation as health check
            const testBirthData = {
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
            }
            else {
                this.updateHealth(AstrologyProviderStatus.DEGRADED, latencyMs, 'Invalid response');
            }
            return this.health;
        }
        catch (error) {
            const latencyMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateHealth(AstrologyProviderStatus.UNHEALTHY, latencyMs, errorMessage);
            return this.health;
        }
    }
    getLatency() {
        return this.health.latencyMs;
    }
    getMetrics() {
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
    updateHealth(status, latencyMs, error) {
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
        }
        else if (status === AstrologyProviderStatus.HEALTHY) {
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
    recordRequest(success, latencyMs) {
        this.metrics.totalRequests++;
        if (success) {
            this.metrics.successfulRequests++;
        }
        else {
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
    canMakeRequest() {
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
    getCircuitBreakerState() {
        return { ...this.circuitBreaker };
    }
    resetCircuitBreaker() {
        this.circuitBreaker = {
            state: CircuitState.CLOSED,
            failureCount: 0,
            lastFailureTime: null,
            nextRetryTime: null,
        };
        console.log(`[Astrology] Circuit breaker reset for ${this.name}`);
    }
}
exports.BaseAstrologyProvider = BaseAstrologyProvider;
//# sourceMappingURL=astrology-provider.interface.js.map