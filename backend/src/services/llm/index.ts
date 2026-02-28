/**
 * LLM Services Index
 * US-34: LLM Provider Fallback Strategy
 * 
 * Exports all LLM-related services and types
 */

// Types and interfaces
export {
  ProviderType,
  ProviderStatus,
  type ChatMessage,
  type StreamChunk,
  type LLMConfig,
  type ProviderHealth,
  type ProviderMetrics,
  type ProviderSwitchEvent,
  type LLMProvider,
  type LLMOrchestratorInterface,
  BaseLLMProvider,
} from './llm-provider.interface';

// Providers
export { OpenAIProvider, createPrimaryOpenAIProvider, createSecondaryOpenAIProvider } from './openai-provider';
export { GLMProvider, MiniMaxProvider, createPrimaryGLMProvider, createSecondaryGLMProvider, createMiniMaxProvider } from './glm-provider';

// Orchestrator
export { LLMOrchestrator, getLLMOrchestrator, resetLLMOrchestrator } from './llm-orchestrator';

// Re-export for backward compatibility
export { generateChartSummary, buildSystemPrompt, generateSessionSummary, buildEnhancedContext } from '../llm-legacy';
