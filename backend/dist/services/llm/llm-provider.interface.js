"use strict";
/**
 * LLM Provider Interface
 * US-34: LLM Provider Fallback Strategy
 *
 * Abstraction layer for multiple LLM providers
 * Enables health checks, latency monitoring, and automatic failover
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMProvider = exports.ProviderStatus = exports.ProviderType = void 0;
// ============================================
// Types
// ============================================
var ProviderType;
(function (ProviderType) {
    ProviderType["PRIMARY"] = "primary";
    ProviderType["SECONDARY"] = "secondary";
    ProviderType["TERTIARY"] = "tertiary";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
var ProviderStatus;
(function (ProviderStatus) {
    ProviderStatus["HEALTHY"] = "healthy";
    ProviderStatus["DEGRADED"] = "degraded";
    ProviderStatus["UNHEALTHY"] = "unhealthy";
    ProviderStatus["UNKNOWN"] = "unknown";
})(ProviderStatus || (exports.ProviderStatus = ProviderStatus = {}));
// ============================================
// Base Provider Class
// ============================================
class BaseLLMProvider {
    constructor() {
        this.health = {
            status: ProviderStatus.UNKNOWN,
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
    }
    async healthCheck() {
        const startTime = Date.now();
        try {
            // Simple health check - send a minimal request
            const response = await this.chat([{ role: 'user', content: 'ping' }], { maxTokens: 5, temperature: 0 });
            const latencyMs = Date.now() - startTime;
            this.updateHealth(ProviderStatus.HEALTHY, latencyMs);
            return {
                ...this.health,
                status: response ? ProviderStatus.HEALTHY : ProviderStatus.UNHEALTHY,
            };
        }
        catch (error) {
            const latencyMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, errorMessage);
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
    async chat(messages, config) {
        let fullResponse = '';
        for await (const chunk of this.streamChat(messages, config)) {
            if (chunk.error) {
                throw new Error(chunk.error);
            }
            fullResponse += chunk.content;
            if (chunk.done)
                break;
        }
        return fullResponse;
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
        // Track metrics
        this.metrics.latencies.push(latencyMs);
        if (this.metrics.latencies.length > 100) {
            this.metrics.latencies.shift(); // Keep last 100 measurements
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
}
exports.BaseLLMProvider = BaseLLMProvider;
//# sourceMappingURL=llm-provider.interface.js.map