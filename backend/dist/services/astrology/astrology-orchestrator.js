"use strict";
/**
 * Astrology Orchestrator
 * US-33: Astrology API Fallback Strategy
 *
 * Manages multiple astrology API providers with automatic failover,
 * health checks, latency monitoring, circuit breaker pattern,
 * exponential backoff, and provider switch logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstrologyOrchestrator = void 0;
exports.getAstrologyOrchestrator = getAstrologyOrchestrator;
exports.resetAstrologyOrchestrator = resetAstrologyOrchestrator;
const astrology_provider_interface_1 = require("./astrology-provider.interface");
const astrology_api_provider_1 = require("./astrology-api-provider");
const redis_1 = require("../../utils/redis");
// ============================================
// Configuration
// ============================================
const HEALTH_CHECK_INTERVAL_MS = parseInt(process.env.ASTROLOGY_HEALTH_CHECK_INTERVAL || '60000', 10); // 60 seconds
const MAX_SWITCH_HISTORY = 100;
const UNHEALTHY_THRESHOLD = 3; // Mark unhealthy after 3 consecutive failures
const RECOVERY_THRESHOLD = 2; // Mark healthy after 2 consecutive successes
const HEALTH_CACHE_TTL = parseInt(process.env.ASTROLOGY_HEALTH_CACHE_TTL || '300', 10); // 5 minutes
const HEALTH_CACHE_KEY = 'astrology:provider_health';
// Exponential backoff configuration
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 30000; // 30 seconds
const BACKOFF_MULTIPLIER = 2;
const MAX_RETRIES = 3;
// ============================================
// Exponential Backoff Helper
// ============================================
function calculateBackoffDelay(attempt) {
    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
    return Math.min(delay, MAX_RETRY_DELAY_MS);
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function logAPIFailure(entry) {
    const logKey = 'astrology:failure_logs';
    try {
        // Log to console
        console.error(`[Astrology Failure] ${entry.timestamp.toISOString()} | ${entry.provider} | ${entry.operation} | Attempt ${entry.retryAttempt} | ${entry.error}`);
        // Store in Redis for monitoring (keep last 1000 entries)
        await redis_1.redisClient.lPush(logKey, JSON.stringify(entry));
        await redis_1.redisClient.lTrim(logKey, 0, 999);
    }
    catch (error) {
        console.error('[Astrology Orchestrator] Failed to log failure:', error);
    }
}
// ============================================
// Astrology Orchestrator Implementation
// ============================================
class AstrologyOrchestrator {
    constructor() {
        this.providers = [];
        this.activeProviderIndex = 0;
        this.switchHistory = [];
        this.healthCheckInterval = null;
        this.consecutiveFailures = new Map();
        this.consecutiveSuccesses = new Map();
        this.manualOverride = false;
        this.overrideReason = null;
        this.initializeProviders();
    }
    /**
     * Initialize providers based on availability
     */
    initializeProviders() {
        const primaryProvider = (0, astrology_api_provider_1.createAstrologyAPIProvider)();
        if (primaryProvider.isAvailable()) {
            this.providers.push(primaryProvider);
            console.log('[Astrology Orchestrator] Added Astrology-API.io as provider');
        }
        else {
            console.error('[Astrology Orchestrator] Astrology-API.io provider not available!');
        }
    }
    /**
     * Get the currently active provider
     */
    getActiveProvider() {
        if (this.providers.length === 0) {
            throw new Error('No astrology providers configured');
        }
        return this.providers[this.activeProviderIndex];
    }
    /**
     * Get all providers
     */
    getAllProviders() {
        return [...this.providers];
    }
    /**
     * Get metrics for all providers
     */
    getAllMetrics() {
        return this.providers.map(p => p.getMetrics());
    }
    /**
     * Get provider switch history
     */
    getSwitchHistory() {
        return [...this.switchHistory];
    }
    /**
     * Log a provider switch event
     */
    logSwitch(fromProvider, toProvider, reason, error) {
        const event = {
            timestamp: new Date(),
            fromProvider,
            toProvider,
            reason,
            error,
        };
        this.switchHistory.push(event);
        // Keep only last MAX_SWITCH_HISTORY events
        if (this.switchHistory.length > MAX_SWITCH_HISTORY) {
            this.switchHistory.shift();
        }
        // Log to console for monitoring
        console.log(`[Astrology Orchestrator] Provider switch: ${fromProvider} → ${toProvider} (${reason})`);
        // Store in Redis for persistence
        this.storeSwitchEvent(event).catch(err => {
            console.error('[Astrology Orchestrator] Failed to store switch event:', err);
        });
    }
    /**
     * Store switch event in Redis
     */
    async storeSwitchEvent(event) {
        try {
            const key = 'astrology:switch_history';
            await redis_1.redisClient.lPush(key, JSON.stringify(event));
            await redis_1.redisClient.lTrim(key, 0, MAX_SWITCH_HISTORY - 1);
        }
        catch (error) {
            console.error('[Astrology Orchestrator] Redis store error:', error);
        }
    }
    /**
     * Find the next healthy provider
     */
    findNextHealthyProvider(fromIndex) {
        for (let i = 0; i < this.providers.length; i++) {
            const index = (fromIndex + i) % this.providers.length;
            const provider = this.providers[index];
            if (provider.isAvailable()) {
                const health = provider.getMetrics().health;
                const circuitBreaker = provider.getCircuitBreakerState();
                // Check circuit breaker
                if (circuitBreaker.state === astrology_provider_interface_1.CircuitState.OPEN) {
                    continue;
                }
                if (health.status !== astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY) {
                    return index;
                }
            }
        }
        // If all providers are unhealthy, return the fallback (last) provider
        return this.providers.length - 1;
    }
    /**
     * Switch to the next provider
     */
    switchToNextProvider(reason, error) {
        const currentProvider = this.getActiveProvider();
        const nextIndex = this.findNextHealthyProvider(this.activeProviderIndex + 1);
        if (nextIndex === -1 || nextIndex === this.activeProviderIndex) {
            console.error('[Astrology Orchestrator] No alternative provider available');
            return false;
        }
        const nextProvider = this.providers[nextIndex];
        this.logSwitch(currentProvider.name, nextProvider.name, reason, error);
        this.activeProviderIndex = nextIndex;
        return true;
    }
    /**
     * Track provider failure
     */
    trackFailure(providerName, error) {
        const failures = (this.consecutiveFailures.get(providerName) || 0) + 1;
        this.consecutiveFailures.set(providerName, failures);
        this.consecutiveSuccesses.set(providerName, 0);
        if (failures >= UNHEALTHY_THRESHOLD) {
            const provider = this.providers.find(p => p.name === providerName);
            if (provider) {
                const metrics = provider.getMetrics();
                provider.updateHealth(astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY, metrics.health.latencyMs, error);
                console.warn(`[Astrology Orchestrator] Provider ${providerName} marked as unhealthy`);
            }
        }
    }
    /**
     * Track provider success
     */
    trackSuccess(providerName, latencyMs) {
        const successes = (this.consecutiveSuccesses.get(providerName) || 0) + 1;
        this.consecutiveSuccesses.set(providerName, successes);
        this.consecutiveFailures.set(providerName, 0);
        if (successes >= RECOVERY_THRESHOLD) {
            const provider = this.providers.find(p => p.name === providerName);
            if (provider) {
                provider.updateHealth(astrology_provider_interface_1.AstrologyProviderStatus.HEALTHY, latencyMs);
            }
        }
    }
    /**
     * Execute operation with exponential backoff retry
     */
    async executeWithRetry(operation, operationFn, birthData) {
        let attemptedProviders = new Set();
        let currentIndex = this.activeProviderIndex;
        while (attemptedProviders.size < this.providers.length) {
            const provider = this.providers[currentIndex];
            if (!provider.isAvailable() || attemptedProviders.has(provider.name)) {
                currentIndex = (currentIndex + 1) % this.providers.length;
                continue;
            }
            // Check circuit breaker
            const circuitBreaker = provider.getCircuitBreakerState();
            if (circuitBreaker.state === astrology_provider_interface_1.CircuitState.OPEN) {
                console.log(`[Astrology Orchestrator] Circuit breaker open for ${provider.name}, skipping`);
                attemptedProviders.add(provider.name);
                currentIndex = (currentIndex + 1) % this.providers.length;
                continue;
            }
            attemptedProviders.add(provider.name);
            // Try with exponential backoff
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                const startTime = Date.now();
                try {
                    const result = await operationFn(provider);
                    const latencyMs = Date.now() - startTime;
                    this.trackSuccess(provider.name, latencyMs);
                    // If this was a retry after failure, log recovery
                    if (attempt > 0) {
                        console.log(`[Astrology Orchestrator] ${provider.name} recovered after ${attempt + 1} attempts`);
                    }
                    return result;
                }
                catch (error) {
                    const latencyMs = Date.now() - startTime;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    // Log the failure
                    await logAPIFailure({
                        timestamp: new Date(),
                        provider: provider.name,
                        operation,
                        error: errorMessage,
                        retryAttempt: attempt + 1,
                        birthData,
                    });
                    // Track failure
                    this.trackFailure(provider.name, errorMessage);
                    // If this was the last retry, try next provider
                    if (attempt === MAX_RETRIES - 1) {
                        console.error(`[Astrology Orchestrator] ${provider.name} failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
                        // Try to switch to next provider
                        const switched = this.switchToNextProvider('Provider failure', errorMessage);
                        if (switched && attemptedProviders.size < this.providers.length) {
                            currentIndex = this.activeProviderIndex;
                        }
                        break;
                    }
                    // Wait with exponential backoff before retry
                    const delay = calculateBackoffDelay(attempt);
                    console.log(`[Astrology Orchestrator] Retry ${attempt + 1}/${MAX_RETRIES} for ${provider.name} in ${delay}ms`);
                    await sleep(delay);
                }
            }
        }
        // All providers failed - this should never happen with fallback
        throw new Error('All astrology providers failed. Please try again later.');
    }
    /**
     * Calculate natal chart with automatic failover
     */
    async calculateNatalChart(birthData, options) {
        return this.executeWithRetry('calculateNatalChart', (provider) => provider.calculateNatalChart(birthData, options), birthData);
    }
    /**
     * Get transits with automatic failover
     */
    async getTransits(date, options) {
        return this.executeWithRetry('getTransits', (provider) => provider.getTransits(date, options), undefined);
    }
    /**
     * Calculate synastry with automatic failover
     */
    async calculateSynastry(birthData1, birthData2) {
        return this.executeWithRetry('calculateSynastry', (provider) => provider.calculateSynastry(birthData1, birthData2), { ...birthData1, ...birthData2 });
    }
    // ============================================
    // Advanced Tools Orchestration
    // ============================================
    async getProgressions(birthData, targetDate, options) {
        return this.executeWithRetry('getProgressions', (p) => p.getProgressions(birthData, targetDate, options), birthData);
    }
    async getSolarReturn(birthData, year, options) {
        return this.executeWithRetry('getSolarReturn', (p) => p.getSolarReturn(birthData, year, options), birthData);
    }
    async getRelocation(birthData, targetLocation, options) {
        return this.executeWithRetry('getRelocation', (p) => p.getRelocation(birthData, targetLocation, options), birthData);
    }
    async getCompositeChart(person1, person2, options) {
        return this.executeWithRetry('getCompositeChart', (p) => p.getCompositeChart(person1, person2, options), person1);
    }
    async getVenusReturn(birthData, year, options) {
        return this.executeWithRetry('getVenusReturn', (p) => p.getVenusReturn(birthData, year, options), birthData);
    }
    async getLunarReturn(birthData, year, month, options) {
        return this.executeWithRetry('getLunarReturn', (p) => p.getLunarReturn(birthData, year, month, options), birthData);
    }
    async getSolarArcDirections(birthData, targetDate, options) {
        return this.executeWithRetry('getSolarArcDirections', (p) => p.getSolarArcDirections(birthData, targetDate, options), birthData);
    }
    /**
     * Get cached health status from Redis
     */
    async getCachedHealth() {
        try {
            const cached = await redis_1.redisClient.get(HEALTH_CACHE_KEY);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        catch (error) {
            console.error('[Astrology Orchestrator] Failed to get cached health:', error);
        }
        return null;
    }
    /**
     * Cache health status in Redis
     */
    async cacheHealth(healthData) {
        try {
            await redis_1.redisClient.setEx(HEALTH_CACHE_KEY, HEALTH_CACHE_TTL, JSON.stringify(healthData));
        }
        catch (error) {
            console.error('[Astrology Orchestrator] Failed to cache health:', error);
        }
    }
    /**
     * Check health of all providers
     */
    async checkAllHealth() {
        // Try to get cached health first
        const cachedHealth = await this.getCachedHealth();
        if (cachedHealth) {
            return this.providers.map((provider) => {
                return cachedHealth[provider.name] || {
                    status: astrology_provider_interface_1.AstrologyProviderStatus.UNKNOWN,
                    latencyMs: 0,
                    lastCheck: new Date(),
                    errorCount: 0,
                    successCount: 0,
                };
            });
        }
        // No cache - perform actual health checks
        const results = await Promise.all(this.providers.map(async (provider) => {
            try {
                return await provider.healthCheck();
            }
            catch (error) {
                return {
                    status: astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY,
                    latencyMs: 0,
                    lastCheck: new Date(),
                    errorCount: 1,
                    successCount: 0,
                    lastError: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }));
        // Cache results
        const healthMap = {};
        this.providers.forEach((provider, index) => {
            healthMap[provider.name] = results[index];
        });
        await this.cacheHealth(healthMap);
        return results;
    }
    /**
     * Force refresh health status (bypass cache)
     */
    async forceRefreshHealth() {
        // Clear cache
        try {
            await redis_1.redisClient.del(HEALTH_CACHE_KEY);
        }
        catch (error) {
            console.error('[Astrology Orchestrator] Failed to clear health cache:', error);
        }
        // Perform fresh health checks
        const results = await Promise.all(this.providers.map(async (provider) => {
            try {
                return await provider.healthCheck();
            }
            catch (error) {
                return {
                    status: astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY,
                    latencyMs: 0,
                    lastCheck: new Date(),
                    errorCount: 1,
                    successCount: 0,
                    lastError: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }));
        // Cache results
        const healthMap = {};
        this.providers.forEach((provider, index) => {
            healthMap[provider.name] = results[index];
        });
        await this.cacheHealth(healthMap);
        return results;
    }
    /**
     * Start periodic health check polling
     */
    startHealthCheckPolling(intervalMs = HEALTH_CHECK_INTERVAL_MS) {
        if (this.healthCheckInterval) {
            console.warn('[Astrology Orchestrator] Health check polling already running');
            return;
        }
        console.log(`[Astrology Orchestrator] Starting health check polling (interval: ${intervalMs}ms)`);
        // Run initial health check
        this.checkAllHealth().catch(err => {
            console.error('[Astrology Orchestrator] Initial health check failed:', err);
        });
        // Schedule periodic checks
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkAllHealth();
                // If active provider is unhealthy, try to switch
                const activeHealth = this.getActiveProvider().getMetrics().health;
                if (activeHealth.status === astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY) {
                    this.switchToNextProvider('Health check failed');
                }
            }
            catch (error) {
                console.error('[Astrology Orchestrator] Health check error:', error);
            }
        }, intervalMs);
    }
    /**
     * Stop health check polling
     */
    stopHealthCheckPolling() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            console.log('[Astrology Orchestrator] Health check polling stopped');
        }
    }
    /**
     * Get orchestrator status summary
     */
    getStatus() {
        const healthyCount = this.providers.filter(p => {
            const health = p.getMetrics().health;
            return health.status === astrology_provider_interface_1.AstrologyProviderStatus.HEALTHY ||
                health.status === astrology_provider_interface_1.AstrologyProviderStatus.DEGRADED;
        }).length;
        const status = {
            activeProvider: this.getActiveProvider()?.name || 'none',
            totalProviders: this.providers.length,
            healthyProviders: healthyCount,
            lastSwitch: this.switchHistory[this.switchHistory.length - 1],
        };
        if (this.manualOverride) {
            status.manualOverride = true;
            status.overrideReason = this.overrideReason || undefined;
        }
        return status;
    }
    /**
     * Manually set the active provider
     */
    setActiveProvider(providerName, reason) {
        const index = this.providers.findIndex(p => p.name === providerName);
        if (index === -1) {
            throw new Error(`Provider '${providerName}' not found`);
        }
        const previousProvider = this.getActiveProvider().name;
        this.logSwitch(previousProvider, providerName, `Manual override: ${reason}`);
        this.activeProviderIndex = index;
        this.manualOverride = true;
        this.overrideReason = reason;
        console.log(`[Astrology Orchestrator] Manual override: ${previousProvider} → ${providerName} (${reason})`);
    }
    /**
     * Clear manual override
     */
    clearOverride() {
        if (this.manualOverride) {
            console.log(`[Astrology Orchestrator] Manual override cleared, returning to automatic selection`);
            this.manualOverride = false;
            this.overrideReason = null;
            // Switch to best available provider
            const bestIndex = this.findBestProvider();
            if (bestIndex !== -1 && bestIndex !== this.activeProviderIndex) {
                const previousProvider = this.getActiveProvider().name;
                this.activeProviderIndex = bestIndex;
                this.logSwitch(previousProvider, this.getActiveProvider().name, 'Automatic selection after override cleared');
            }
        }
    }
    /**
     * Find the best provider based on health and latency
     */
    findBestProvider() {
        const availableProviders = this.providers
            .map((p, index) => ({
            index,
            provider: p,
            metrics: p.getMetrics(),
            circuitBreaker: p.getCircuitBreakerState(),
        }))
            .filter(({ provider, metrics, circuitBreaker }) => provider.isAvailable() &&
            metrics.health.status !== astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY &&
            circuitBreaker.state !== astrology_provider_interface_1.CircuitState.OPEN);
        if (availableProviders.length === 0) {
            // Return fallback provider
            return this.providers.length - 1;
        }
        // Sort by: 1) Health status (healthy > degraded > unknown), 2) Latency
        availableProviders.sort((a, b) => {
            const healthPriority = {
                [astrology_provider_interface_1.AstrologyProviderStatus.HEALTHY]: 0,
                [astrology_provider_interface_1.AstrologyProviderStatus.DEGRADED]: 1,
                [astrology_provider_interface_1.AstrologyProviderStatus.UNKNOWN]: 2,
                [astrology_provider_interface_1.AstrologyProviderStatus.UNHEALTHY]: 3,
            };
            const healthDiff = (healthPriority[a.metrics.health.status] || 3) -
                (healthPriority[b.metrics.health.status] || 3);
            if (healthDiff !== 0)
                return healthDiff;
            return a.metrics.health.latencyMs - b.metrics.health.latencyMs;
        });
        return availableProviders[0].index;
    }
    /**
     * Check if manual override is active
     */
    isOverrideActive() {
        return this.manualOverride;
    }
    /**
     * Get failure logs
     */
    async getFailureLogs(limit = 100) {
        try {
            const logs = await redis_1.redisClient.lRange('astrology:failure_logs', 0, limit - 1);
            return logs.map(log => JSON.parse(log));
        }
        catch (error) {
            console.error('[Astrology Orchestrator] Failed to get failure logs:', error);
            return [];
        }
    }
}
exports.AstrologyOrchestrator = AstrologyOrchestrator;
// ============================================
// Singleton Instance
// ============================================
let orchestratorInstance = null;
/**
 * Get the singleton orchestrator instance
 */
function getAstrologyOrchestrator() {
    if (!orchestratorInstance) {
        orchestratorInstance = new AstrologyOrchestrator();
        // Health check polling disabled — it was making live API calls every 60s
    }
    return orchestratorInstance;
}
/**
 * Reset the orchestrator (for testing)
 */
function resetAstrologyOrchestrator() {
    if (orchestratorInstance) {
        orchestratorInstance.stopHealthCheckPolling();
        orchestratorInstance = null;
    }
}
exports.default = AstrologyOrchestrator;
//# sourceMappingURL=astrology-orchestrator.js.map