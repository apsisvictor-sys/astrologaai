/**
 * LLM Health Routes
 * US-34: LLM Provider Fallback Strategy
 * 
 * Endpoints:
 * - GET /api/v1/llm/health - Get health status of all LLM providers
 * - GET /api/v1/llm/status - Get orchestrator status
 * - GET /api/v1/llm/history - Get provider switch history
 * - GET /api/v1/providers/status - Canonical provider status endpoint (US-34 requirement)
 */

import { Router, Request, Response } from 'express';
import { getLLMOrchestrator } from '../services/llm/index';

const router = Router();

/**
 * GET /api/v1/providers/status
 * Canonical provider status endpoint (US-34 requirement)
 * Returns health status of all LLM providers with Redis caching (5 min TTL)
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const orchestrator = getLLMOrchestrator();
    const metrics = orchestrator.getAllMetrics();
    const status = orchestrator.getStatus();
    
    const providers = metrics.map(m => ({
      name: m.providerName,
      type: m.type,
      status: m.health.status,
      latencyMs: m.health.latencyMs,
      lastCheck: m.health.lastCheck,
      errorCount: m.health.errorCount,
      successCount: m.health.successCount,
      lastError: m.health.lastError,
      totalRequests: m.totalRequests,
      successfulRequests: m.successfulRequests,
      failedRequests: m.failedRequests,
      averageLatencyMs: m.averageLatencyMs,
      isAvailable: m.health.status !== 'unhealthy',
    }));
    
    // Overall system health
    const healthyCount = metrics.filter(m => 
      m.health.status === 'healthy' || m.health.status === 'degraded'
    ).length;
    
    const overallStatus = healthyCount > 0 ? 'operational' : 'degraded';
    
    res.json({
      success: true,
      data: {
        overallStatus,
        activeProvider: status.activeProvider,
        totalProviders: status.totalProviders,
        healthyProviders: status.healthyProviders,
        providers,
        lastSwitch: status.lastSwitch ? {
          timestamp: status.lastSwitch.timestamp,
          from: status.lastSwitch.fromProvider,
          to: status.lastSwitch.toProvider,
          reason: status.lastSwitch.reason,
        } : null,
        cacheTTL: 300, // 5 minutes
      },
    });
  } catch (error) {
    console.error('[Providers Status] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get provider status',
      },
    });
  }
});

/**
 * Alias: GET /api/v1/providers/status (without /llm prefix)
 * This is registered separately in index.ts
 */

/**
 * GET /api/v1/llm/health
 * Get health status of all LLM providers
 * 
 * Response includes:
 * - Status of each provider (healthy/degraded/unhealthy)
 * - Latency metrics
 * - Last check time
 * - Error counts
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const orchestrator = getLLMOrchestrator();
    const metrics = orchestrator.getAllMetrics();
    
    const healthData = metrics.map(m => ({
      provider: m.providerName,
      type: m.type,
      status: m.health.status,
      latencyMs: m.health.latencyMs,
      lastCheck: m.health.lastCheck,
      errorCount: m.health.errorCount,
      successCount: m.health.successCount,
      lastError: m.health.lastError,
      totalRequests: m.totalRequests,
      successfulRequests: m.successfulRequests,
      failedRequests: m.failedRequests,
      averageLatencyMs: m.averageLatencyMs,
    }));
    
    // Overall system health
    const healthyCount = metrics.filter(m => 
      m.health.status === 'healthy' || m.health.status === 'degraded'
    ).length;
    
    const overallStatus = healthyCount > 0 ? 'operational' : 'degraded';
    
    res.json({
      success: true,
      data: {
        overallStatus,
        providers: healthData,
        summary: {
          total: metrics.length,
          healthy: metrics.filter(m => m.health.status === 'healthy').length,
          degraded: metrics.filter(m => m.health.status === 'degraded').length,
          unhealthy: metrics.filter(m => m.health.status === 'unhealthy').length,
        },
      },
    });
  } catch (error) {
    console.error('[LLM Health] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get LLM health status',
      },
    });
  }
});

/**
 * GET /api/v1/llm/status
 * Get orchestrator status summary
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const orchestrator = getLLMOrchestrator();
    const status = orchestrator.getStatus();
    const history = orchestrator.getSwitchHistory();
    
    res.json({
      success: true,
      data: {
        activeProvider: status.activeProvider,
        totalProviders: status.totalProviders,
        healthyProviders: status.healthyProviders,
        recentSwitches: history.slice(-5).map(s => ({
          timestamp: s.timestamp,
          from: s.fromProvider,
          to: s.toProvider,
          reason: s.reason,
        })),
        lastSwitch: status.lastSwitch ? {
          timestamp: status.lastSwitch.timestamp,
          from: status.lastSwitch.fromProvider,
          to: status.lastSwitch.toProvider,
          reason: status.lastSwitch.reason,
          error: status.lastSwitch.error,
        } : null,
      },
    });
  } catch (error) {
    console.error('[LLM Status] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get LLM status',
      },
    });
  }
});

/**
 * GET /api/v1/llm/history
 * Get provider switch history
 * 
 * Query params:
 * - limit: number of events to return (default: 20)
 */
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string || '20', 10);
    const orchestrator = getLLMOrchestrator();
    const history = orchestrator.getSwitchHistory().slice(-limit);
    
    res.json({
      success: true,
      data: {
        events: history.map(s => ({
          timestamp: s.timestamp,
          fromProvider: s.fromProvider,
          toProvider: s.toProvider,
          reason: s.reason,
          error: s.error,
        })),
        total: history.length,
      },
    });
  } catch (error) {
    console.error('[LLM History] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get switch history',
      },
    });
  }
});

/**
 * POST /api/v1/llm/health/check
 * Force a health check on all providers
 * 
 * Requires authentication (admin only in production)
 */
router.post('/health/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const orchestrator = getLLMOrchestrator();
    const results = await orchestrator.forceRefreshHealth();
    
    res.json({
      success: true,
      data: {
        message: 'Health check completed',
        results: results.map((h, i) => ({
          provider: orchestrator.getAllProviders()[i]?.name || 'unknown',
          status: h.status,
          latencyMs: h.latencyMs,
          lastError: h.lastError,
        })),
      },
    });
  } catch (error) {
    console.error('[LLM Health Check] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to perform health check',
      },
    });
  }
});

/**
 * POST /api/v1/llm/override
 * Manually override the active provider (US-34 AC#7)
 * 
 * Request body:
 * - provider: string - Provider name to switch to
 * - reason?: string - Optional reason for override
 * 
 * Requires authentication (admin only in production)
 */
router.post('/override', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, reason } = req.body;
    
    if (!provider) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PROVIDER',
          message: 'Provider name is required',
        },
      });
      return;
    }
    
    const orchestrator = getLLMOrchestrator();
    const providers = orchestrator.getAllProviders();
    const targetProvider = providers.find(p => p.name === provider);
    
    if (!targetProvider) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: `Provider '${provider}' not found. Available providers: ${providers.map(p => p.name).join(', ')}`,
        },
      });
      return;
    }
    
    if (!targetProvider.isAvailable()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PROVIDER_UNAVAILABLE',
          message: `Provider '${provider}' is not available`,
        },
      });
      return;
    }
    
    const previousProvider = orchestrator.getActiveProvider().name;
    
    // Perform the override
    orchestrator.setActiveProvider(provider, reason || 'Manual override');
    
    res.json({
      success: true,
      data: {
        message: `Provider overridden to '${provider}'`,
        previousProvider,
        newProvider: provider,
        reason: reason || 'Manual override',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[LLM Override] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to override provider',
      },
    });
  }
});

/**
 * DELETE /api/v1/llm/override
 * Clear manual override and return to automatic selection (US-34 AC#7)
 */
router.delete('/override', async (req: Request, res: Response): Promise<void> => {
  try {
    const orchestrator = getLLMOrchestrator();
    orchestrator.clearOverride();
    
    res.json({
      success: true,
      data: {
        message: 'Manual override cleared, automatic selection enabled',
        activeProvider: orchestrator.getActiveProvider().name,
      },
    });
  } catch (error) {
    console.error('[LLM Override Clear] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear override',
      },
    });
  }
});

export default router;
