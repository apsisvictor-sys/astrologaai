"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var astrology_provider_interface_exports = {};
__export(astrology_provider_interface_exports, {
  AstrologyProviderStatus: () => AstrologyProviderStatus,
  AstrologyProviderType: () => AstrologyProviderType,
  BaseAstrologyProvider: () => BaseAstrologyProvider,
  CircuitState: () => CircuitState
});
module.exports = __toCommonJS(astrology_provider_interface_exports);
var AstrologyProviderType = /* @__PURE__ */ ((AstrologyProviderType2) => {
  AstrologyProviderType2["PRIMARY"] = "primary";
  AstrologyProviderType2["SECONDARY"] = "secondary";
  AstrologyProviderType2["TERTIARY"] = "tertiary";
  return AstrologyProviderType2;
})(AstrologyProviderType || {});
var AstrologyProviderStatus = /* @__PURE__ */ ((AstrologyProviderStatus2) => {
  AstrologyProviderStatus2["HEALTHY"] = "healthy";
  AstrologyProviderStatus2["DEGRADED"] = "degraded";
  AstrologyProviderStatus2["UNHEALTHY"] = "unhealthy";
  AstrologyProviderStatus2["UNKNOWN"] = "unknown";
  return AstrologyProviderStatus2;
})(AstrologyProviderStatus || {});
var CircuitState = /* @__PURE__ */ ((CircuitState2) => {
  CircuitState2["CLOSED"] = "closed";
  CircuitState2["OPEN"] = "open";
  CircuitState2["HALF_OPEN"] = "half_open";
  return CircuitState2;
})(CircuitState || {});
class BaseAstrologyProvider {
  constructor() {
    this.health = {
      status: "unknown" /* UNKNOWN */,
      latencyMs: 0,
      lastCheck: /* @__PURE__ */ new Date(),
      errorCount: 0,
      successCount: 0
    };
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      latencies: []
    };
    // Circuit breaker configuration
    this.circuitBreaker = {
      state: "closed" /* CLOSED */,
      failureCount: 0,
      lastFailureTime: null,
      nextRetryTime: null
    };
    this.CIRCUIT_BREAKER_THRESHOLD = 3;
    // Open after 3 failures
    this.CIRCUIT_BREAKER_RESET_TIMEOUT = 3e4;
  }
  async healthCheck() {
    const startTime = Date.now();
    try {
      const testBirthData = {
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        latitude: 0,
        longitude: 0,
        timezone: "UTC"
      };
      const chart = await this.calculateNatalChart(testBirthData);
      const latencyMs = Date.now() - startTime;
      if (chart && chart.sun) {
        this.updateHealth("healthy" /* HEALTHY */, latencyMs);
      } else {
        this.updateHealth("degraded" /* DEGRADED */, latencyMs, "Invalid response");
      }
      return this.health;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.updateHealth("unhealthy" /* UNHEALTHY */, latencyMs, errorMessage);
      return this.health;
    }
  }
  getLatency() {
    return this.health.latencyMs;
  }
  getMetrics() {
    const avgLatency = this.metrics.latencies.length > 0 ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length : 0;
    return {
      providerName: this.name,
      type: this.type,
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      averageLatencyMs: avgLatency,
      lastRequestAt: this.health.lastCheck,
      health: this.health
    };
  }
  updateHealth(status, latencyMs, error) {
    this.health = {
      status,
      latencyMs,
      lastCheck: /* @__PURE__ */ new Date(),
      errorCount: error ? this.health.errorCount + 1 : this.health.errorCount,
      successCount: error ? this.health.successCount : this.health.successCount + 1,
      lastError: error
    };
    if (status === "unhealthy" /* UNHEALTHY */) {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = /* @__PURE__ */ new Date();
      if (this.circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreaker.state = "open" /* OPEN */;
        this.circuitBreaker.nextRetryTime = new Date(Date.now() + this.CIRCUIT_BREAKER_RESET_TIMEOUT);
      }
    } else if (status === "healthy" /* HEALTHY */) {
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.state = "closed" /* CLOSED */;
      this.circuitBreaker.lastFailureTime = null;
      this.circuitBreaker.nextRetryTime = null;
    }
    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 100) {
      this.metrics.latencies.shift();
    }
  }
  recordRequest(success, latencyMs) {
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
  canMakeRequest() {
    if (this.circuitBreaker.state === "closed" /* CLOSED */) {
      return true;
    }
    if (this.circuitBreaker.state === "open" /* OPEN */) {
      if (this.circuitBreaker.nextRetryTime && /* @__PURE__ */ new Date() >= this.circuitBreaker.nextRetryTime) {
        this.circuitBreaker.state = "half_open" /* HALF_OPEN */;
        return true;
      }
      return false;
    }
    return true;
  }
  getCircuitBreakerState() {
    return { ...this.circuitBreaker };
  }
  resetCircuitBreaker() {
    this.circuitBreaker = {
      state: "closed" /* CLOSED */,
      failureCount: 0,
      lastFailureTime: null,
      nextRetryTime: null
    };
    console.log(`[Astrology] Circuit breaker reset for ${this.name}`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AstrologyProviderStatus,
  AstrologyProviderType,
  BaseAstrologyProvider,
  CircuitState
});
