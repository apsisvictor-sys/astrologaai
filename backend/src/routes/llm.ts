/**
 * LLM Provider Status Routes
 *
 * Exposes agent framework health info for monitoring dashboards.
 * The actual inference runs via Vercel AI SDK in services/llm.ts.
 *
 * GET /api/v1/providers/status  — provider overview
 * GET /api/v1/llm/health        — health check alias
 * GET /api/v1/llm/status        — status alias
 */

import { Router, Request, Response } from 'express';
import {
  getAvailableProviders,
  getProviderHealth,
  getOrchestratorStatus,
} from '../services/llm';

const router = Router();

/**
 * GET /api/v1/providers/status
 * Returns which LLM providers are configured and their health.
 */
router.get('/status', (_req: Request, res: Response): void => {
  const providers = getAvailableProviders();
  const health = getProviderHealth();
  const status = getOrchestratorStatus();

  res.json({
    success: true,
    data: {
      overallStatus: 'operational',
      activeProvider: status.activeProvider,
      totalProviders: providers.length,
      healthyProviders: providers.length,
      providers: providers.map(name => ({
        name,
        status: health[name]?.status ?? 'healthy',
        latencyMs: health[name]?.latencyMs ?? 0,
      })),
    },
  });
});

/**
 * GET /api/v1/llm/health
 */
router.get('/health', (_req: Request, res: Response): void => {
  const providers = getAvailableProviders();
  const health = getProviderHealth();

  res.json({
    success: true,
    data: {
      overallStatus: providers.length > 0 ? 'operational' : 'degraded',
      providers: providers.map(name => ({
        provider: name,
        status: health[name]?.status ?? 'healthy',
        latencyMs: health[name]?.latencyMs ?? 0,
      })),
      summary: {
        total: providers.length,
        healthy: providers.length,
        degraded: 0,
        unhealthy: 0,
      },
    },
  });
});

/**
 * GET /api/v1/llm/status
 */
router.get('/status', (_req: Request, res: Response): void => {
  const status = getOrchestratorStatus();

  res.json({
    success: true,
    data: status,
  });
});

export default router;
