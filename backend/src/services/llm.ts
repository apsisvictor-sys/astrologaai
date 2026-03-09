/**
 * LLM Service (Autonomous Agent Edition)
 * Uses Vercel AI SDK with dynamic tool calling.
 * Providers: Anthropic Claude (primary) → OpenAI GPT-4o (fallback)
 */

import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { astrologyTools } from './agent-tools';

// Re-export helpers from legacy (prompt building, chart summary, session summary)
export {
  generateChartSummary,
  buildSystemPrompt,
  generateSessionSummary,
  buildEnhancedContext,
} from './llm-helpers';

// Re-export ChatMessage type
export { type ChatMessage } from './llm-helpers';

import type { ChatMessage as LegacyChatMessage } from './llm-helpers';
import type { LLMConfig as LegacyLLMConfig } from './llm-helpers';

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
  toolCall?: { name: string; args: any };
  toolResult?: { name: string; result: any };
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
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
 * Default models per tier — override via env vars MODEL_FREE, MODEL_PRO, MODEL_PREMIUM
 */
const TIER_DEFAULT_MODELS: Record<string, string> = {
  FREE:    'claude-haiku-4-5-20251001',
  PRO:     'claude-sonnet-4-6',
  PREMIUM: 'claude-opus-4-6',
};

/**
 * Returns the resolved model ID string for a given tier (for logging/metadata).
 */
export function getModelIdForTier(tier: string = 'FREE'): string {
  const envKey = `MODEL_${tier.toUpperCase()}`;
  return process.env[envKey] || TIER_DEFAULT_MODELS[tier] || TIER_DEFAULT_MODELS.FREE;
}

/**
 * Select model for a given tier from env vars (with hardcoded defaults).
 * Provider is auto-detected from the model ID prefix:
 *   claude-* → Anthropic   |   gpt-* / o1* / o3* → OpenAI
 */
function getProviderModel(tier: string = 'FREE') {
  const envKey = `MODEL_${tier.toUpperCase()}`;
  const modelId = process.env[envKey] || TIER_DEFAULT_MODELS[tier] || TIER_DEFAULT_MODELS.FREE;

  if (modelId.startsWith('claude-')) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(`Anthropic API key required for model "${modelId}" (set ANTHROPIC_API_KEY).`);
    }
    return anthropic(modelId);
  }

  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(`OpenAI API key required for model "${modelId}" (set OPENAI_API_KEY).`);
    }
    return openai(modelId);
  }

  throw new Error(`Unknown model provider for model ID "${modelId}". Use a claude-* or gpt-* prefix.`);
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
    const tier = config.tier || 'FREE';
    const model = getProviderModel(tier);

    // Gating Tools based on User Subscription Tier
    const activeTools: Record<string, any> = {};

    // FREE: natal chart only — users can explore their birth chart placements
    activeTools['get_natal_chart'] = astrologyTools.get_natal_chart;

    // PRO: adds live transits, solar return, and lunar return
    if (tier === 'PRO' || tier === 'PREMIUM') {
      activeTools['get_transits'] = astrologyTools.get_transits;
      activeTools['get_solar_return'] = astrologyTools.get_solar_return;
      activeTools['get_lunar_return'] = astrologyTools.get_lunar_return;
    }

    // PREMIUM: full toolkit — relationships, psychological depth, timing, astrocartography
    if (tier === 'PREMIUM') {
      activeTools['get_synastry'] = astrologyTools.get_synastry;
      activeTools['get_progressions'] = astrologyTools.get_progressions;
      activeTools['get_relocation'] = astrologyTools.get_relocation;
      activeTools['get_composite'] = astrologyTools.get_composite;
      activeTools['get_venus_return'] = astrologyTools.get_venus_return;
      activeTools['get_solar_arc'] = astrologyTools.get_solar_arc;
    }

    // Tier-accurate system prompt context — must exactly match the tools above
    const systemPromptContext = tier === 'FREE'
      ? `The user is on the FREE plan — 'The Seeker' (Търсачът).
You have access to ONE tool: get_natal_chart. Use it to explore their birth chart placements, signs, houses, and natal aspects in depth.
You can discuss: Sun, Moon, Rising, planetary signs and houses, natal aspects, elemental balance, and the core themes of their personality and life path.
You CANNOT access transits, forecasts, relationship analysis, or timing tools on this plan.
If the user asks about current planetary events, what to expect this year, relationship compatibility, or specific timing — do NOT guess or hallucinate. Acknowledge it warmly and guide them: 'За да видим какво правят планетите за теб в момента и какво предстои тази година, можеш да преминеш към план Pro (Навигаторът).'`

      : tier === 'PRO'
      ? `The user is on the PRO plan — 'The Navigator' (Навигаторът).
You have access to FOUR tools: get_natal_chart, get_transits, get_solar_return, get_lunar_return.
- get_natal_chart: birth chart placements, natal aspects, core personality and life themes
- get_transits: current and upcoming planetary movements and how they activate the natal chart — use this for questions about what is happening NOW or in the near future
- get_solar_return: the annual chart cast for the user's birthday — use this for questions about the year ahead, major themes, and annual focus areas
- get_lunar_return: the monthly lunar cycle chart — use this for questions about THIS MONTH, current emotional focus, and what the current lunar cycle brings
You CANNOT access relationship synastry, composite charts, secondary progressions, solar arc directions, astrocartography, or Venus Return timing on this plan.
If the user asks about relationship compatibility, soul connections, psychological progression work, or relocation analysis — acknowledge it warmly and guide them: 'За задълбочен анализ на взаимоотношенията, съдбовните връзки и точното любовно и житейско прогнозиране, можеш да преминеш към план Premium (Оракулът).'`

      : `The user is on the PREMIUM plan — 'The Oracle' (Оракулът).
You have unrestricted access to all ten astrological tools:
- get_natal_chart: full birth chart — placements, aspects, houses, chart patterns
- get_transits: current and upcoming planetary activations on the natal chart
- get_solar_return: the annual solar return chart for year-ahead themes
- get_lunar_return: the monthly lunar return chart — emotional themes and focus for the current lunar cycle
- get_synastry: inter-chart aspects between the user and a partner — relationship compatibility
- get_progressions: secondary progressions — the slow inner psychological and life evolution
- get_solar_arc: solar arc directions — each planet moves ~1° per year, revealing long-term life chapter shifts
- get_relocation: astrocartography — how different locations on Earth affect the chart
- get_composite: the composite chart — the chart of the relationship itself as an entity
- get_venus_return: Venus return chart — precise timing for love, attraction, and financial luck
Answer every question with depth, nuance, and comprehensive multi-tool synthesis when relevant. Do not limit yourself to a single tool when a question touches multiple domains.`;

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
        const usage = (chunk as any).totalUsage ?? (chunk as any).usage;
        yield {
          content: '',
          done: true,
          usage: usage ? {
            inputTokens: usage.inputTokens ?? usage.promptTokens ?? 0,
            outputTokens: usage.outputTokens ?? usage.completionTokens ?? 0,
            totalTokens: (usage.inputTokens ?? usage.promptTokens ?? 0) + (usage.outputTokens ?? usage.completionTokens ?? 0),
          } : undefined,
        };
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
  const model = getProviderModel();

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
