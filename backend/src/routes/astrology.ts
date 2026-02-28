/**
 * Astrology Provider Routes
 * US-33: Astrology API Fallback Strategy
 * 
 * Health check and status endpoints for astrology providers
 */

import { Router, Request, Response } from 'express';
import { getAstrologyOrchestrator } from '../services/astrology/astrology-orchestrator';
import authenticateToken from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/astrology/health
 * Public health check endpoint for astrology API status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const orchestrator = getAstrologyOrchestrator();
    const health = await orchestrator.checkAllHealth();
    const status = orchestrator.getStatus();
    
    const isHealthy = health.some(h => h.status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        activeProvider: status.activeProvider,
        totalProviders: status.totalProviders,
        healthyProviders: status.healthyProviders,
        providers: health.map(h => ({
          name: h.status,
          status: h.status,
          latencyMs: h.latencyMs,
          lastCheck: h.lastCheck,
          errorCount: h.errorCount,
          lastError: h.lastError,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Astrology Health] Error:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'ASTROLOGY_UNAVAILABLE',
        message: 'Astrology service unavailable',
      },
    });
  }
});

/**
 * GET /api/v1/astrology/status
 * Detailed status with provider metrics (requires auth)
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orchestrator = getAstrologyOrchestrator();
    const metrics = orchestrator.getAllMetrics();
    const status = orchestrator.getStatus();
    const switchHistory = orchestrator.getSwitchHistory().slice(-10);
    
    res.json({
      success: true,
      data: {
        activeProvider: status.activeProvider,
        totalProviders: status.totalProviders,
        healthyProviders: status.healthyProviders,
        manualOverride: status.manualOverride,
        overrideReason: status.overrideReason,
        lastSwitch: status.lastSwitch,
        providers: metrics.map(m => ({
          name: m.providerName,
          type: m.type,
          health: m.health,
          totalRequests: m.totalRequests,
          successfulRequests: m.successfulRequests,
          failedRequests: m.failedRequests,
          averageLatencyMs: m.averageLatencyMs,
          circuitBreaker: m.providerName === 'swiss-ephemeris-fallback' 
            ? 'closed' 
            : orchestrator.getAllProviders().find(p => p.name === m.providerName)?.getCircuitBreakerState(),
        })),
        switchHistory,
      },
    });
  } catch (error) {
    console.error('[Astrology Status] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get astrology status',
      },
    });
  }
});

/**
 * POST /api/v1/astrology/health/refresh
 * Force refresh health status (requires auth)
 */
router.post('/health/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orchestrator = getAstrologyOrchestrator();
    const health = await orchestrator.forceRefreshHealth();
    
    res.json({
      success: true,
      data: {
        message: 'Health status refreshed',
        providers: health,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Astrology Refresh] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh health status',
      },
    });
  }
});

/**
 * POST /api/v1/astrology/override
 * Manually set active provider (requires auth)
 */
router.post('/override', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { provider, reason } = req.body;
    
    if (!provider || !reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provider name and reason are required',
        },
      });
    }
    
    const orchestrator = getAstrologyOrchestrator();
    
    // Verify provider exists
    const providers = orchestrator.getAllProviders();
    const targetProvider = providers.find(p => p.name === provider);
    
    if (!targetProvider) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Provider '${provider}' not found`,
          availableProviders: providers.map(p => p.name),
        },
      });
    }
    
    orchestrator.setActiveProvider(provider, reason);
    
    res.json({
      success: true,
      data: {
        message: `Active provider set to ${provider}`,
        activeProvider: orchestrator.getActiveProvider().name,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Astrology Override] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set provider override',
      },
    });
  }
});

/**
 * DELETE /api/v1/astrology/override
 * Clear manual override (requires auth)
 */
router.delete('/override', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orchestrator = getAstrologyOrchestrator();
    orchestrator.clearOverride();
    
    res.json({
      success: true,
      data: {
        message: 'Manual override cleared',
        activeProvider: orchestrator.getActiveProvider().name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Astrology Override Clear] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear override',
      },
    });
  }
});

/**
 * POST /api/v1/astrology/circuit-breaker/reset
 * Reset circuit breaker for a provider (requires auth)
 */
router.post('/circuit-breaker/reset', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provider name is required',
        },
      });
    }
    
    const orchestrator = getAstrologyOrchestrator();
    const providers = orchestrator.getAllProviders();
    const targetProvider = providers.find(p => p.name === provider);
    
    if (!targetProvider) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Provider '${provider}' not found`,
        },
      });
    }
    
    targetProvider.resetCircuitBreaker();
    
    res.json({
      success: true,
      data: {
        message: `Circuit breaker reset for ${provider}`,
        provider: targetProvider.name,
        circuitBreaker: targetProvider.getCircuitBreakerState(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Circuit Breaker Reset] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset circuit breaker',
      },
    });
  }
});

/**
 * GET /api/v1/astrology/failures
 * Get failure logs (requires auth)
 */
router.get('/failures', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const orchestrator = getAstrologyOrchestrator() as any;
    
    const logs = await orchestrator.getFailureLogs?.(limit) || [];
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Astrology Failures] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get failure logs',
      },
    });
  }
});

export default router;
