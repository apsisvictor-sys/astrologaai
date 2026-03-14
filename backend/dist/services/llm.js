"use strict";
/**
 * LLM Service (Autonomous Agent Edition)
 * Uses Vercel AI SDK with dynamic tool calling.
 * Providers: Anthropic Claude (primary) → OpenAI GPT-4o (fallback)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEnhancedContext = exports.generateSessionSummary = exports.buildSystemPrompt = exports.generateChartSummary = exports.ASTROLOGER_SYSTEM_PROMPT = void 0;
exports.getModelIdForTier = getModelIdForTier;
exports.streamChatCompletion = streamChatCompletion;
exports.chatCompletion = chatCompletion;
exports.getAvailableProviders = getAvailableProviders;
exports.getProviderHealth = getProviderHealth;
exports.getOrchestratorStatus = getOrchestratorStatus;
exports.getSwitchHistory = getSwitchHistory;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const anthropic_1 = require("@ai-sdk/anthropic");
const agent_tools_1 = require("./agent-tools");
// createAstrologyTools is imported from agent_tools_1
// Re-export helpers from legacy (prompt building, chart summary, session summary)
var llm_helpers_1 = require("./llm-helpers");
Object.defineProperty(exports, "generateChartSummary", { enumerable: true, get: function () { return llm_helpers_1.generateChartSummary; } });
Object.defineProperty(exports, "buildSystemPrompt", { enumerable: true, get: function () { return llm_helpers_1.buildSystemPrompt; } });
Object.defineProperty(exports, "generateSessionSummary", { enumerable: true, get: function () { return llm_helpers_1.generateSessionSummary; } });
Object.defineProperty(exports, "buildEnhancedContext", { enumerable: true, get: function () { return llm_helpers_1.buildEnhancedContext; } });
Object.defineProperty(exports, "ASTROLOGER_SYSTEM_PROMPT", { enumerable: true, get: function () { return llm_helpers_1.ASTROLOGER_SYSTEM_PROMPT; } });
const { ASTROLOGER_SYSTEM_PROMPT } = llm_helpers_1;
/**
 * Maps the legacy chat message format to Vercel AI SDK's format.
 */
function mapToCoreMessages(messages) {
    // If we already have complex agent loops cached in redis, return as is.
    return messages.map((m) => {
        if (m.toolCalls || m.toolInvocations)
            return m;
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
const TIER_DEFAULT_MODELS = {
    FREE: 'claude-haiku-4-5-20251001',
    PRO: 'claude-sonnet-4-6',
    PREMIUM: 'claude-opus-4-6',
};
/**
 * Returns the resolved model ID string for a given tier (for logging/metadata).
 */
function getModelIdForTier(tier = 'FREE') {
    const envKey = `MODEL_${tier.toUpperCase()}`;
    return process.env[envKey] || TIER_DEFAULT_MODELS[tier] || TIER_DEFAULT_MODELS.FREE;
}
/**
 * Select model for a given tier from env vars (with hardcoded defaults).
 * Provider is auto-detected from the model ID prefix:
 *   claude-* → Anthropic   |   gpt-* / o1* / o3* → OpenAI
 */
function getProviderModel(tier = 'FREE') {
    const envKey = `MODEL_${tier.toUpperCase()}`;
    const modelId = process.env[envKey] || TIER_DEFAULT_MODELS[tier] || TIER_DEFAULT_MODELS.FREE;
    if (modelId.startsWith('claude-')) {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error(`Anthropic API key required for model "${modelId}" (set ANTHROPIC_API_KEY).`);
        }
        return (0, anthropic_1.anthropic)(modelId);
    }
    if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(`OpenAI API key required for model "${modelId}" (set OPENAI_API_KEY).`);
        }
        return (0, openai_1.openai)(modelId);
    }
    throw new Error(`Unknown model provider for model ID "${modelId}". Use a claude-* or gpt-* prefix.`);
}
/**
 * Stream chat completion using an Autonomous Agent Reasoning Loop via Vercel AI SDK
 */
async function* streamChatCompletion(messages, config = {}, callbacks) {
    try {
        const coreMessages = mapToCoreMessages(messages);
        const tier = config.tier || 'FREE';
        const model = getProviderModel(tier);
        // Create tools with user context (userId + IP for solar/lunar return location)
        const tools = agent_tools_1.createAstrologyTools({ userId: config.userId || '', userIp: config.userIp });
        // Gating Tools based on User Subscription Tier
        const activeTools = {};
        // Natal chart and current transits are pre-injected into the system prompt.
        // Tools here are for on-demand, specific user-directed queries only.
        // PRO: solar return (year ahead) and lunar return (current month)
        if (tier === 'PRO' || tier === 'PREMIUM') {
            activeTools['get_solar_return'] = tools.get_solar_return;
            activeTools['get_lunar_return'] = tools.get_lunar_return;
        }
        // PREMIUM: full toolkit — relationships, psychological depth, timing, astrocartography
        if (tier === 'PREMIUM') {
            activeTools['get_synastry'] = tools.get_synastry;
            activeTools['get_progressions'] = tools.get_progressions;
            activeTools['get_relocation'] = tools.get_relocation;
            activeTools['get_composite'] = tools.get_composite;
            activeTools['get_solar_arc'] = tools.get_solar_arc;
        }
        // Tier-accurate system prompt context — must exactly match the tools above
        const systemPromptContext = tier === 'FREE'
            ? `The user is on the FREE plan — 'The Seeker' (Търсачът).
Your natal chart data and today's active transits are already loaded in your context above — use them directly without calling any tools.
You CANNOT access year-ahead forecasts, monthly returns, or relationship analysis on this plan.
If the user asks about the year ahead, relationship compatibility, or specific timing — acknowledge warmly and guide them: 'За да видим какво предстои тази година и как планетите влияят на отношенията ти, можеш да преминеш към план Pro (Навигаторът).'`
            : tier === 'PRO'
                ? `The user is on the PRO plan — 'The Navigator' (Навигаторът).
Your natal chart data and today's active transits are already loaded in your context above — use them directly without tool calls.
You have access to TWO additional tools for specific time-based queries:
- get_solar_return: the annual chart for the user's birthday year — use for "what does my year ahead look like?"
- get_lunar_return: the monthly lunar cycle chart — use for "what does this month hold for me?"
You CANNOT access relationship synastry, composite charts, secondary progressions, solar arc directions, astrocartography, or Venus Return on this plan.
If the user asks about those — guide them: 'За задълбочен анализ на взаимоотношенията и прецизно прогнозиране, можеш да преминеш към план Premium (Оракулът).'`
                : `The user is on the PREMIUM plan — 'The Oracle' (Оракулът).
Your natal chart data and today's active transits are already loaded in your context above — use them directly without tool calls.
You have access to seven additional tools for on-demand specific queries:
- get_solar_return: annual solar return chart for year-ahead themes
- get_lunar_return: monthly lunar return chart — current emotional cycle
- get_synastry: inter-chart aspects between the user and a stored partner — relationship compatibility
- get_progressions: secondary progressions — slow inner psychological evolution
- get_solar_arc: solar arc directions — long-term life chapter shifts (~1° per year)
- get_relocation: relocated natal chart — how different locations affect the chart
- get_composite: the composite chart — the relationship as its own entity
For synastry/composite tools, use the partner ID from the stored partners list below.
${config.partners && config.partners.length > 0
  ? `Stored partners: ${config.partners.map(p => `${p.name} (id: ${p.id})`).join(', ')}. If the user refers to someone not in this list, ask them to add that person's birth data via Settings → Partners first.`
  : `No partners stored yet. If the user asks about relationship compatibility, invite them to add a partner's birth data via Settings → Partners.`}
Answer every question with depth, nuance, and comprehensive multi-tool synthesis when relevant.`;
        if (coreMessages.length > 0 && coreMessages[0].role === 'system') {
            coreMessages[0].content += `\n\n[TIER SYSTEM INSTRUCTION]\n${systemPromptContext}`;
        }
        // Anthropic 2-layer prompt caching
        const modelIdForCache = getModelIdForTier(tier);
        if (modelIdForCache.startsWith('claude-') && coreMessages.length > 0 && coreMessages[0].role === 'system') {
            const fullContent = coreMessages[0].content;
            const dynamicPart = fullContent.substring(ASTROLOGER_SYSTEM_PROMPT.length);
            coreMessages[0] = {
                role: 'system',
                content: ASTROLOGER_SYSTEM_PROMPT,
                providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
            };
            if (dynamicPart.trim()) {
                coreMessages.splice(1, 0, {
                    role: 'system',
                    content: dynamicPart,
                    providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
                });
            }
        }
        const result = await (0, ai_1.streamText)({
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
                yield { content: chunk.text || '', done: false };
            }
            else if (chunk.type === 'tool-call') {
                // Build generic arguments
                const args = chunk.args;
                const toolName = chunk.toolName;
                if (callbacks?.onToolCall) {
                    callbacks.onToolCall(toolName, args);
                }
                yield { content: '', done: false, toolCall: { name: toolName, args: args } };
            }
            else if (chunk.type === 'tool-result') {
                const resultVal = chunk.result;
                const toolName = chunk.toolName;
                yield { content: '', done: false, toolResult: { name: toolName, result: resultVal } };
            }
            else if (chunk.type === 'finish') {
                const usage = chunk.totalUsage ?? chunk.usage;
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
    }
    catch (error) {
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
async function chatCompletion(messages, config = {}) {
    const coreMessages = mapToCoreMessages(messages);
    const model = getProviderModel();
    // No tools — used for forecast/oracle generation, not chat.
    // Passing tool schemas wastes thousands of input tokens per call.
    const result = await (0, ai_1.generateText)({
        model,
        messages: coreMessages,
        temperature: config.temperature ?? 0.7,
    });
    return result.text;
}
// Stubs for backward compatibility with the orchestrator UI dashboard
function getAvailableProviders() {
    const providers = [];
    if (process.env.ANTHROPIC_API_KEY)
        providers.push('Anthropic Claude');
    if (process.env.OPENAI_API_KEY)
        providers.push('OpenAI GPT-4o');
    return providers;
}
function getProviderHealth() {
    return { 'primary-agent': { status: 'healthy', latencyMs: 0 } };
}
function getOrchestratorStatus() {
    return { activeProvider: 'agent-framework', totalProviders: 2, healthyProviders: 2 };
}
function getSwitchHistory(limit = 10) {
    return [];
}
exports.default = {
    streamChatCompletion,
    chatCompletion,
    getAvailableProviders,
    getProviderHealth,
    getOrchestratorStatus,
    getSwitchHistory,
};
//# sourceMappingURL=llm.js.map