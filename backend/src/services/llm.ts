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

/**
 * LLM Service (Autonomous Agent Edition)
 * Rebuilt using Vercel AI SDK to support dynamic tool calling
 */

import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { astrologyTools } from './agent-tools';

// Re-export types for backward compatibility
export {
  generateChartSummary,
  buildSystemPrompt,
  generateSessionSummary,
  buildEnhancedContext,
} from './llm-legacy';

// Re-export ChatMessage type
export { type ChatMessage } from './llm/llm-provider.interface';

// Map our legacy ChatMessage format to any[] to bypass strict typs mismatch with specific ai versions
import type { ChatMessage as LegacyChatMessage } from './llm/llm-provider.interface';
import type { LLMConfig as LegacyLLMConfig } from './llm-legacy';

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
  toolCall?: { name: string; args: any };
  toolResult?: { name: string; result: any };
}

/**
 * Maps the legacy chat message format to Vercel AI SDK's format.
 */
function mapToCoreMessages(messages: LegacyChatMessage[]): any[] {
  // If we already have complex agent loops cached in redis, return as is.
  return messages.map((m: any) => {
    if (m.toolCalls || m.toolInvocations) return m;

    if (m.role === 'system') {
      return { role: 'system', content: m.content || '' };
    }
    if (m.role === 'user') {
      return { role: 'user', content: m.content || '' };
    }
    return { role: 'assistant', content: m.content || '' };
  });
}

/**
 * Select the appropriate AI Provider (Anthropic preferred for reasoning, OpenAI fallback)
 */
function getProviderModel(requestedModel?: string) {
  // If Anthropic API key is available, default to Claude 3.5 Sonnet for superior reasoning
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic('claude-3-5-sonnet-20240620');
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o');
  }

  throw new Error('No valid LLM API Key found (Anthropic or OpenAI required for Tool Calling).');
}

/**
 * Stream chat completion using an Autonomous Agent Reasoning Loop via Vercel AI SDK
 */
export async function* streamChatCompletion(
  messages: LegacyChatMessage[],
  config: Partial<LegacyLLMConfig & { tier?: string }> = {},
  callbacks?: {
    onToolCall?: (name: string, args: any) => void;
  }
): AsyncGenerator<StreamChunk> {
  try {
    const coreMessages = mapToCoreMessages(messages);
    const model = getProviderModel(config.model);

    // Gating Tools based on User Subscription Tier
    const tier = config.tier || 'FREE';
    const activeTools: Record<string, any> = {};

    // Everyone gets Natal Chart
    activeTools['get_natal_chart'] = astrologyTools.get_natal_chart;

    // PRO and PREMIUM get Transits
    if (tier === 'PRO' || tier === 'PREMIUM') {
      activeTools['get_transits'] = astrologyTools.get_transits;
    }

    // Only PREMIUM gets Synastry and advanced elite tools
    if (tier === 'PREMIUM') {
      activeTools['get_synastry'] = astrologyTools.get_synastry;
      activeTools['get_progressions'] = astrologyTools.get_progressions;
      activeTools['get_solar_return'] = astrologyTools.get_solar_return;
      activeTools['get_relocation'] = astrologyTools.get_relocation;
      activeTools['get_composite'] = astrologyTools.get_composite;
      activeTools['get_venus_return'] = astrologyTools.get_venus_return;
    }

    // Inject Subscription Tier Context into the System Prompt
    const systemPromptContext = tier === 'FREE' ?
      "The user is on the FREE tier ('The Seeker' / 'Търсачът'). You ONLY have access to get_natal_chart and get_transits (basic only). If they ask about relationship destiny, exact timing, or deep transit analysis, DO NOT hallucinate. Instead, tell them in Bulgarian: 'За да разгледам дълбоко вашата любовна съвместимост или точното време на събитията, моля, преминете към план Pro (Навигаторът).'" :
      tier === 'PRO' ?
        "The user is on the PRO tier ('The Navigator' / 'Навигаторът'). You have access to Natal, Transits, Solar Return, and Relocation tools. If they ask about relationship compatibility or peak romance timing, DO NOT hallucinate. Tell them in Bulgarian: 'За анализ на сродни души и точно време за върхова романтика, моля, преминете към план Premium (Оракулът).'" :
        "The user is on the PREMIUM tier ('The Oracle' / 'Оракулът'). You have unrestricted access to all astrological tools. Answer any question deeply and accurately.";

    if (coreMessages.length > 0 && coreMessages[0].role === 'system') {
      coreMessages[0].content += `\n\n[TIER SYSTEM INSTRUCTION]\n${systemPromptContext}`;
    }

    const result = await streamText({
      model,
      messages: coreMessages,
      tools: activeTools,
      temperature: config.temperature ?? 0.7,
      onStepFinish({ text, toolCalls, toolResults }) {
        // hook
      }
    });

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        yield { content: (chunk as any).text || '', done: false };
      } else if (chunk.type === 'tool-call') {
        // Build generic arguments
        const args = (chunk as any).args;
        const toolName = (chunk as any).toolName;
        if (callbacks?.onToolCall) {
          callbacks.onToolCall(toolName, args);
        }
        yield { content: '', done: false, toolCall: { name: toolName, args: args } };
      } else if (chunk.type === 'tool-result') {
        const resultVal = (chunk as any).result;
        const toolName = (chunk as any).toolName;
        yield { content: '', done: false, toolResult: { name: toolName, result: resultVal } };
      } else if (chunk.type === 'finish') {
        yield { content: '', done: true };
      }
    }
  } catch (error) {
    console.error('[Agent LLM Engine] Stream error:', error);
    yield {
      content: '',
      done: true,
      error: error instanceof Error ? error.message : 'Unknown streaming error'
    };
  }
}

/**
 * Non-streaming chat completion
 */
export async function chatCompletion(
  messages: LegacyChatMessage[],
  config: Partial<LegacyLLMConfig> = {}
): Promise<string> {
  const coreMessages = mapToCoreMessages(messages);
  const model = getProviderModel(config.model);

  const result = await generateText({
    model,
    messages: coreMessages,
    tools: astrologyTools,
    temperature: config.temperature ?? 0.7,
  });

  return result.text;
}

// Stubs for backward compatibility with the orchestrator UI dashboard
export function getAvailableProviders(): string[] {
  const providers = [];
  if (process.env.ANTHROPIC_API_KEY) providers.push('Anthropic Claude');
  if (process.env.OPENAI_API_KEY) providers.push('OpenAI GPT-4o');
  return providers;
}
export function getProviderHealth(): Record<string, { status: string; latencyMs: number }> {
  return { 'primary-agent': { status: 'healthy', latencyMs: 0 } };
}
export function getOrchestratorStatus(): any {
  return { activeProvider: 'agent-framework', totalProviders: 2, healthyProviders: 2 };
}
export function getSwitchHistory(limit: number = 10): any[] {
  return [];
}

export default {
  streamChatCompletion,
  chatCompletion,
  getAvailableProviders,
  getProviderHealth,
  getOrchestratorStatus,
  getSwitchHistory,
};
