/**
 * Astrology Service - US-33: Astrology API Fallback Strategy
 * 
 * Main entry point for astrology calculations with automatic failover
 */

// Export types
export {
  // Enums
  AstrologyProviderType,
  AstrologyProviderStatus,
  CircuitState,
  
  // Interfaces
  type AstrologyProvider,
  type AstrologyOrchestratorInterface,
  type BirthDataInput,
  type NatalChart,
  type TransitData,
  type SynastryData,
  type PlanetPosition,
  type HouseCusp,
  type Aspect,
  type ProviderHealth,
  type ProviderMetrics,
  type ProviderSwitchEvent,
  type AstrologyCalculationOptions,
  type CircuitBreakerState,
} from './astrology-provider.interface';

// Export providers
export {
  AstrologyAPIProvider,
  createAstrologyAPIProvider,
} from './astrology-api-provider';

export {
  SwissEphemerisProvider,
  createSwissEphemerisProvider,
} from './swiss-ephemeris-provider';

// Export orchestrator
export {
  AstrologyOrchestrator,
  getAstrologyOrchestrator,
  resetAstrologyOrchestrator,
  type FailureLogEntry,
} from './astrology-orchestrator';

// ============================================
// Convenience Functions (backward compatible)
// ============================================

import type { BirthDataInput, NatalChart } from './astrology-provider.interface';

/**
 * Calculate natal chart with automatic failover
 * Convenience function that wraps the orchestrator
 */
export async function calculateNatalChart(birthData: BirthDataInput): Promise<NatalChart> {
  const { getAstrologyOrchestrator: getOrchestrator } = await import('./astrology-orchestrator');
  const orchestrator = getOrchestrator();
  return orchestrator.calculateNatalChart(birthData);
}

/**
 * Check if astrology API is available
 */
export async function checkAstrologyApiHealth(): Promise<boolean> {
  const { getAstrologyOrchestrator: getOrchestrator } = await import('./astrology-orchestrator');
  const orchestrator = getOrchestrator();
  const health = await orchestrator.checkAllHealth();
  return health.some((h: { status: string }) => h.status === 'healthy');
}

/**
 * Get provider health status
 */
export async function getProviderHealth(): Promise<Record<string, { status: string; latencyMs: number }>> {
  const { getAstrologyOrchestrator: getOrchestrator } = await import('./astrology-orchestrator');
  const orchestrator = getOrchestrator();
  const metrics = orchestrator.getAllMetrics();
  
  const result: Record<string, { status: string; latencyMs: number }> = {};
  
  for (const m of metrics) {
    result[m.providerName] = {
      status: m.health.status,
      latencyMs: m.health.latencyMs,
    };
  }
  
  return result;
}

/**
 * Get orchestrator status summary
 */
export async function getOrchestratorStatus(): Promise<{
  activeProvider: string;
  totalProviders: number;
  healthyProviders: number;
  lastSwitch?: { timestamp: Date; fromProvider: string; toProvider: string; reason: string };
}> {
  const { getAstrologyOrchestrator: getOrchestrator } = await import('./astrology-orchestrator');
  const orchestrator = getOrchestrator();
  const status = orchestrator.getStatus();
  
  return {
    ...status,
    lastSwitch: status.lastSwitch ? {
      timestamp: status.lastSwitch.timestamp,
      fromProvider: status.lastSwitch.fromProvider,
      toProvider: status.lastSwitch.toProvider,
      reason: status.lastSwitch.reason,
    } : undefined,
  };
}

/**
 * Get provider switch history
 */
export async function getSwitchHistory(limit: number = 10): Promise<Array<{
  timestamp: Date;
  fromProvider: string;
  toProvider: string;
  reason: string;
  error?: string;
}>> {
  const { getAstrologyOrchestrator: getOrchestrator } = await import('./astrology-orchestrator');
  const orchestrator = getOrchestrator();
  return orchestrator.getSwitchHistory().slice(-limit);
}

export default {
  calculateNatalChart,
  checkAstrologyApiHealth,
  getProviderHealth,
  getOrchestratorStatus,
  getSwitchHistory,
};
