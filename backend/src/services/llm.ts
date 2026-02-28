/**
 * LLM Service (Orchestrator Wrapper)
 * US-34: LLM Provider Fallback Strategy
 * 
 * Wraps the LLM Orchestrator to provide backward compatibility
 * with the existing chatController interface.
 * 
 * Features:
 * - Automatic failover between providers
 * - Health monitoring
 * - Latency tracking
 * - Provider switch logging
 */

import {
  getLLMOrchestrator,
  type ChatMessage,
  type StreamChunk,
  ProviderStatus,
} from './llm/index';

// Re-export types for backward compatibility
export {
  generateChartSummary,
  buildSystemPrompt,
  generateSessionSummary,
  buildEnhancedContext,
} from './llm-legacy';

// Re-export ChatMessage type from interface
export { type ChatMessage } from './llm/llm-provider.interface';

// Import types needed from legacy
import type { ChatContext, LLMConfig as LegacyLLMConfig } from './llm-legacy';

// ============================================
// Orchestrator-based Functions
// ============================================

/**
 * Stream chat completion with automatic failover
 * Uses the LLM Orchestrator for provider management
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  config: Partial<LegacyLLMConfig> = {}
): AsyncGenerator<StreamChunk> {
  const orchestrator = getLLMOrchestrator();
  
  // Map legacy config to new config
  const newConfig = {
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    stream: config.stream,
  };
  
  for await (const chunk of orchestrator.streamChat(messages, newConfig)) {
    // Filter out system messages (used for provider switch notifications)
    if (chunk.provider === 'system') {
      // Log the switch but don't yield to client
      console.log(`[LLM] ${chunk.error}`);
      continue;
    }
    
    yield {
      content: chunk.content,
      done: chunk.done,
      error: chunk.error,
    };
  }
}

/**
 * Non-streaming chat completion with automatic failover
 */
export async function chatCompletion(
  messages: ChatMessage[],
  config: Partial<LegacyLLMConfig> = {}
): Promise<string> {
  let fullResponse = '';
  
  for await (const chunk of streamChatCompletion(messages, { ...config, stream: false })) {
    if (chunk.error) {
      throw new Error(chunk.error);
    }
    fullResponse += chunk.content;
    if (chunk.done) break;
  }
  
  return fullResponse;
}

/**
 * Check which LLM providers are available
 */
export function getAvailableProviders(): string[] {
  const orchestrator = getLLMOrchestrator();
  return orchestrator.getAllProviders()
    .filter(p => p.isAvailable())
    .map(p => p.name);
}

/**
 * Get provider health status
 */
export function getProviderHealth(): Record<string, { status: string; latencyMs: number }> {
  const orchestrator = getLLMOrchestrator();
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
export function getOrchestratorStatus(): {
  activeProvider: string;
  totalProviders: number;
  healthyProviders: number;
  lastSwitch?: { timestamp: Date; fromProvider: string; toProvider: string; reason: string };
} {
  const orchestrator = getLLMOrchestrator();
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
export function getSwitchHistory(limit: number = 10): Array<{
  timestamp: Date;
  fromProvider: string;
  toProvider: string;
  reason: string;
  error?: string;
}> {
  const orchestrator = getLLMOrchestrator();
  return orchestrator.getSwitchHistory().slice(-limit);
}

export default {
  streamChatCompletion,
  chatCompletion,
  getAvailableProviders,
  getProviderHealth,
  getOrchestratorStatus,
  getSwitchHistory,
};
