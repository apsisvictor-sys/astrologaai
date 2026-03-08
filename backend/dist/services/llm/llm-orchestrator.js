"use strict";
/**
 * LLM Orchestrator
 * US-34: LLM Provider Fallback Strategy
 *
 * Manages multiple LLM providers with automatic failover,
 * health checks, latency monitoring, and provider switch logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMOrchestrator = void 0;
exports.getLLMOrchestrator = getLLMOrchestrator;
exports.resetLLMOrchestrator = resetLLMOrchestrator;
const llm_provider_interface_1 = require("./llm-provider.interface");
const openai_provider_1 = require("./openai-provider");
const glm_provider_1 = require("./glm-provider");
const redis_1 = require("../../utils/redis");
// ============================================
// Configuration
// ============================================
const HEALTH_CHECK_INTERVAL_MS = parseInt(process.env.LLM_HEALTH_CHECK_INTERVAL || '30000', 10); // 30 seconds
const MAX_SWITCH_HISTORY = 100;
const UNHEALTHY_THRESHOLD = 3; // Mark unhealthy after 3 consecutive failures
const RECOVERY_THRESHOLD = 2; // Mark healthy after 2 consecutive successes
const HEALTH_CACHE_TTL = parseInt(process.env.LLM_HEALTH_CACHE_TTL || '300', 10); // 5 minutes (300 seconds)
const HEALTH_CACHE_KEY = 'llm:provider_health';
// ============================================
// LLM Orchestrator Implementation
// ============================================
class LLMOrchestrator {
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
     * Initialize providers based on available API keys
     */
    initializeProviders() {
        // Priority order: GLM (primary) → OpenAI (secondary) → MiniMax (tertiary)
        // Primary: GLM-4-flash (fast, cost-effective for production)
        if (process.env.GLM_API_KEY) {
            this.providers.push((0, glm_provider_1.createPrimaryGLMProvider)());
            console.log('[LLM Orchestrator] Added GLM as primary provider');
        }
        // Secondary: OpenAI GPT-4o (high quality fallback)
        if (process.env.OPENAI_API_KEY) {
            this.providers.push((0, openai_provider_1.createPrimaryOpenAIProvider)());
            console.log('[LLM Orchestrator] Added OpenAI as secondary provider');
        }
        // Tertiary: MiniMax (alternative fallback)
        if (process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID) {
            this.providers.push((0, glm_provider_1.createMiniMaxProvider)());
            console.log('[LLM Orchestrator] Added MiniMax as tertiary provider');
        }
        if (this.providers.length === 0) {
            console.error('[LLM Orchestrator] No LLM providers configured!');
        }
    }
    /**
     * Get the currently active provider
     */
    getActiveProvider() {
        if (this.providers.length === 0) {
            throw new Error('No LLM providers configured');
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
        console.log(`[LLM Orchestrator] Provider switch: ${fromProvider} → ${toProvider} (${reason})`);
        // Store in Redis for persistence (optional)
        this.storeSwitchEvent(event).catch(err => {
            console.error('[LLM Orchestrator] Failed to store switch event:', err);
        });
    }
    /**
     * Store switch event in Redis
     */
    async storeSwitchEvent(event) {
        try {
            const key = 'llm:switch_history';
            await redis_1.redisClient.lPush(key, JSON.stringify(event));
            await redis_1.redisClient.lTrim(key, 0, MAX_SWITCH_HISTORY - 1);
        }
        catch (error) {
            // Non-critical, just log
            console.error('[LLM Orchestrator] Redis store error:', error);
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
                if (health.status !== llm_provider_interface_1.ProviderStatus.UNHEALTHY) {
                    return index;
                }
            }
        }
        // If all providers are unhealthy, return the first available one
        for (let i = 0; i < this.providers.length; i++) {
            if (this.providers[i].isAvailable()) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Switch to the next provider
     */
    switchToNextProvider(reason, error) {
        const currentProvider = this.getActiveProvider();
        const nextIndex = this.findNextHealthyProvider(this.activeProviderIndex + 1);
        if (nextIndex === -1 || nextIndex === this.activeProviderIndex) {
            console.error('[LLM Orchestrator] No alternative provider available');
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
                provider.updateHealth(llm_provider_interface_1.ProviderStatus.UNHEALTHY, provider.getLatency(), error);
                console.warn(`[LLM Orchestrator] Provider ${providerName} marked as unhealthy`);
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
                provider.updateHealth(llm_provider_interface_1.ProviderStatus.HEALTHY, latencyMs);
            }
        }
    }
    /**
     * Stream chat with automatic failover
     */
    async *streamChat(messages, config = {}) {
        if (this.providers.length === 0) {
            yield { content: '', done: false, error: 'No LLM providers configured', provider: 'none' };
            return;
        }
        let attemptedProviders = new Set();
        let currentIndex = this.activeProviderIndex;
        while (attemptedProviders.size < this.providers.length) {
            const provider = this.providers[currentIndex];
            if (!provider.isAvailable() || attemptedProviders.has(provider.name)) {
                currentIndex = (currentIndex + 1) % this.providers.length;
                continue;
            }
            attemptedProviders.add(provider.name);
            const startTime = Date.now();
            let hasError = false;
            let errorMessage = '';
            try {
                // Yield chunks from this provider
                for await (const chunk of provider.streamChat(messages, config)) {
                    if (chunk.error) {
                        hasError = true;
                        errorMessage = chunk.error;
                        break;
                    }
                    yield { ...chunk, provider: provider.name };
                    if (chunk.done) {
                        const latencyMs = Date.now() - startTime;
                        this.trackSuccess(provider.name, latencyMs);
                        return;
                    }
                }
                if (!hasError) {
                    return;
                }
            }
            catch (error) {
                hasError = true;
                errorMessage = error instanceof Error ? error.message : 'Unknown error';
            }
            // Handle failure
            const latencyMs = Date.now() - startTime;
            this.trackFailure(provider.name, errorMessage);
            // Try to switch to next provider
            if (attemptedProviders.size < this.providers.length) {
                const switched = this.switchToNextProvider('Provider failure', errorMessage);
                if (switched) {
                    currentIndex = this.activeProviderIndex;
                    // Yield a system message about the switch (optional)
                    yield {
                        content: '',
                        done: false,
                        error: `Primary provider unavailable, switching to ${this.getActiveProvider().name}...`,
                        provider: 'system',
                    };
                }
            }
        }
        // All providers failed
        yield {
            content: '',
            done: true,
            error: 'All LLM providers failed. Please try again later.',
            provider: 'none',
        };
    }
    /**
     * Non-streaming chat with automatic failover
     */
    async chat(messages, config = {}) {
        const startTime = Date.now();
        let fullContent = '';
        let lastProvider = 'none';
        for await (const chunk of this.streamChat(messages, config)) {
            if (chunk.error && chunk.provider !== 'system') {
                throw new Error(chunk.error);
            }
            fullContent += chunk.content;
            if (chunk.provider && chunk.provider !== 'system') {
                lastProvider = chunk.provider;
            }
        }
        return {
            content: fullContent,
            provider: lastProvider,
            latencyMs: Date.now() - startTime,
        };
    }
    /**
     * Get cached health status from Redis
     * Returns null if cache doesn't exist or expired
     */
    async getCachedHealth() {
        try {
            const cached = await redis_1.redisClient.get(HEALTH_CACHE_KEY);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        catch (error) {
            console.error('[LLM Orchestrator] Failed to get cached health:', error);
        }
        return null;
    }
    /**
     * Cache health status in Redis (TTL: 5 minutes)
     */
    async cacheHealth(healthData) {
        try {
            await redis_1.redisClient.setEx(HEALTH_CACHE_KEY, HEALTH_CACHE_TTL, JSON.stringify(healthData));
        }
        catch (error) {
            console.error('[LLM Orchestrator] Failed to cache health:', error);
        }
    }
    /**
     * Check health of all providers
     * Uses Redis cache with 5-minute TTL to reduce API calls
     */
    async checkAllHealth() {
        // Try to get cached health first
        const cachedHealth = await this.getCachedHealth();
        if (cachedHealth) {
            // Return cached health, but also trigger background refresh if needed
            const results = this.providers.map((provider) => {
                return cachedHealth[provider.name] || {
                    status: llm_provider_interface_1.ProviderStatus.UNKNOWN,
                    latencyMs: 0,
                    lastCheck: new Date(),
                    errorCount: 0,
                    successCount: 0,
                };
            });
            return results;
        }
        // No cache - perform actual health checks
        const results = await Promise.all(this.providers.map(async (provider) => {
            try {
                return await provider.healthCheck();
            }
            catch (error) {
                return {
                    status: llm_provider_interface_1.ProviderStatus.UNHEALTHY,
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
            console.error('[LLM Orchestrator] Failed to clear health cache:', error);
        }
        // Perform fresh health checks
        const results = await Promise.all(this.providers.map(async (provider) => {
            try {
                return await provider.healthCheck();
            }
            catch (error) {
                return {
                    status: llm_provider_interface_1.ProviderStatus.UNHEALTHY,
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
            console.warn('[LLM Orchestrator] Health check polling already running');
            return;
        }
        console.log(`[LLM Orchestrator] Starting health check polling (interval: ${intervalMs}ms)`);
        // Run initial health check
        this.checkAllHealth().catch(err => {
            console.error('[LLM Orchestrator] Initial health check failed:', err);
        });
        // Schedule periodic checks
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkAllHealth();
                // If active provider is unhealthy, try to switch
                const activeHealth = this.getActiveProvider().getMetrics().health;
                if (activeHealth.status === llm_provider_interface_1.ProviderStatus.UNHEALTHY) {
                    this.switchToNextProvider('Health check failed');
                }
            }
            catch (error) {
                console.error('[LLM Orchestrator] Health check error:', error);
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
            console.log('[LLM Orchestrator] Health check polling stopped');
        }
    }
    /**
     * Get orchestrator status summary
     */
    getStatus() {
        const healthyCount = this.providers.filter(p => {
            const health = p.getMetrics().health;
            return health.status === llm_provider_interface_1.ProviderStatus.HEALTHY || health.status === llm_provider_interface_1.ProviderStatus.DEGRADED;
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
     * Manually set the active provider (US-34 AC#7)
     * Logs the override and disables automatic selection
     */
    setActiveProvider(providerName, reason) {
        const index = this.providers.findIndex(p => p.name === providerName);
        if (index === -1) {
            throw new Error(`Provider '${providerName}' not found`);
        }
        const previousProvider = this.getActiveProvider().name;
        // Log the switch
        this.logSwitch(previousProvider, providerName, `Manual override: ${reason}`);
        this.activeProviderIndex = index;
        this.manualOverride = true;
        this.overrideReason = reason;
        console.log(`[LLM Orchestrator] Manual override: ${previousProvider} → ${providerName} (${reason})`);
    }
    /**
     * Clear manual override and return to automatic selection (US-34 AC#7)
     */
    clearOverride() {
        if (this.manualOverride) {
            console.log(`[LLM Orchestrator] Manual override cleared, returning to automatic selection`);
            this.manualOverride = false;
            this.overrideReason = null;
            // Optionally switch to best available provider
            const bestIndex = this.findBestProvider();
            if (bestIndex !== -1 && bestIndex !== this.activeProviderIndex) {
                const previousProvider = this.getActiveProvider().name;
                this.activeProviderIndex = bestIndex;
                this.logSwitch(previousProvider, this.getActiveProvider().name, 'Automatic selection after override cleared');
            }
        }
    }
    /**
     * Find the best provider based on health and latency (US-34 AC#6)
     */
    findBestProvider() {
        const availableProviders = this.providers
            .map((p, index) => ({
            index,
            provider: p,
            metrics: p.getMetrics(),
        }))
            .filter(({ provider, metrics }) => provider.isAvailable() &&
            metrics.health.status !== llm_provider_interface_1.ProviderStatus.UNHEALTHY);
        if (availableProviders.length === 0) {
            return -1;
        }
        // Sort by: 1) Health status (healthy > degraded > unknown), 2) Latency
        availableProviders.sort((a, b) => {
            const healthPriority = {
                [llm_provider_interface_1.ProviderStatus.HEALTHY]: 0,
                [llm_provider_interface_1.ProviderStatus.DEGRADED]: 1,
                [llm_provider_interface_1.ProviderStatus.UNKNOWN]: 2,
                [llm_provider_interface_1.ProviderStatus.UNHEALTHY]: 3,
            };
            const healthDiff = (healthPriority[a.metrics.health.status] || 3) -
                (healthPriority[b.metrics.health.status] || 3);
            if (healthDiff !== 0)
                return healthDiff;
            // If same health status, prefer lower latency
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
}
exports.LLMOrchestrator = LLMOrchestrator;
// ============================================
// Singleton Instance
// ============================================
let orchestratorInstance = null;
/**
 * Get the singleton orchestrator instance
 */
function getLLMOrchestrator() {
    if (!orchestratorInstance) {
        orchestratorInstance = new LLMOrchestrator();
        // Start health check polling
        orchestratorInstance.startHealthCheckPolling();
    }
    return orchestratorInstance;
}
/**
 * Reset the orchestrator (for testing)
 */
function resetLLMOrchestrator() {
    if (orchestratorInstance) {
        orchestratorInstance.stopHealthCheckPolling();
        orchestratorInstance = null;
    }
}
exports.default = LLMOrchestrator;
//# sourceMappingURL=llm-orchestrator.js.map