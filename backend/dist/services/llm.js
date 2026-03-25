"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var llm_exports = {};
__export(llm_exports, {
  ASTROLOGER_SYSTEM_PROMPT: () => import_llm_helpers.ASTROLOGER_SYSTEM_PROMPT,
  buildEnhancedContext: () => import_llm_helpers.buildEnhancedContext,
  buildSystemPrompt: () => import_llm_helpers.buildSystemPrompt,
  chatCompletion: () => chatCompletion,
  default: () => llm_default,
  generateChartSummary: () => import_llm_helpers.generateChartSummary,
  generateSessionSummary: () => import_llm_helpers.generateSessionSummary,
  getAvailableProviders: () => getAvailableProviders,
  getModelIdForTier: () => getModelIdForTier,
  getOrchestratorStatus: () => getOrchestratorStatus,
  getProviderHealth: () => getProviderHealth,
  getSwitchHistory: () => getSwitchHistory,
  streamChatCompletion: () => streamChatCompletion
});
module.exports = __toCommonJS(llm_exports);
var import_ai = require("ai");
var import_openai = require("@ai-sdk/openai");
var import_anthropic = require("@ai-sdk/anthropic");
var import_agent_tools = require("./agent-tools");
var import_llm_helpers = require("./llm-helpers");
var import_llm_helpers2 = require("./llm-helpers");
function mapToCoreMessages(messages) {
  return messages.map((m) => {
    if (m.toolCalls || m.toolInvocations) return m;
    if (m.role === "system") {
      return { role: "system", content: m.content || "" };
    }
    if (m.role === "user") {
      return { role: "user", content: m.content || "" };
    }
    return { role: "assistant", content: m.content || "" };
  });
}
const TIER_DEFAULT_MODELS = {
  FREE: "claude-haiku-4-5-20251001",
  PRO: "claude-sonnet-4-6",
  PREMIUM: "claude-opus-4-6"
};
function getModelIdForTier(tier = "FREE") {
  const envKey = `MODEL_${tier.toUpperCase()}`;
  return process.env[envKey] || TIER_DEFAULT_MODELS[tier] || TIER_DEFAULT_MODELS.FREE;
}
function getProviderModel(tier = "FREE") {
  const envKey = `MODEL_${tier.toUpperCase()}`;
  const modelId = process.env[envKey] || TIER_DEFAULT_MODELS[tier] || TIER_DEFAULT_MODELS.FREE;
  if (modelId.startsWith("claude-")) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(`Anthropic API key required for model "${modelId}" (set ANTHROPIC_API_KEY).`);
    }
    return (0, import_anthropic.anthropic)(modelId);
  }
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1") || modelId.startsWith("o3")) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(`OpenAI API key required for model "${modelId}" (set OPENAI_API_KEY).`);
    }
    return (0, import_openai.openai)(modelId);
  }
  throw new Error(`Unknown model provider for model ID "${modelId}". Use a claude-* or gpt-* prefix.`);
}
async function* streamChatCompletion(messages, config = {}, callbacks) {
  try {
    const coreMessages = mapToCoreMessages(messages);
    const tier = config.tier || "FREE";
    const model = getProviderModel(tier);
    const tools = (0, import_agent_tools.createAstrologyTools)({ userId: config.userId || "", userIp: config.userIp });
    const activeTools = {};
    if (tier === "PRO" || tier === "PREMIUM") {
      activeTools["get_solar_return"] = tools.get_solar_return;
      activeTools["get_lunar_return"] = tools.get_lunar_return;
    }
    if (tier === "PREMIUM") {
      activeTools["get_synastry"] = tools.get_synastry;
      activeTools["get_progressions"] = tools.get_progressions;
      activeTools["get_relocation"] = tools.get_relocation;
      activeTools["get_composite"] = tools.get_composite;
      activeTools["get_solar_arc"] = tools.get_solar_arc;
    }
    const suggestionRules = tier === "FREE" ? "Never suggest partner, synastry, or relationship-compatibility questions in your suggestions." : tier === "PRO" ? "Never suggest synastry, composite chart, or partner-specific questions in your suggestions." : "All topics are allowed in your suggestions including partner and relationship compatibility.";
    const SUGGESTION_INSTRUCTION = `

[CONVERSATION SUGGESTIONS]
After EVERY response \u2014 no exceptions \u2014 append this exact block on a new line after your main text:
[SUGGESTIONS]
<follow-up question 1>
<follow-up question 2>
<follow-up question 3>
[/SUGGESTIONS]

Rules for suggestions:
- Must be directly relevant to what was just discussed
- Keep each question under 12 words
- Mix simple plain-language and astrology-aware questions
- ${suggestionRules}
- Do not number them or add punctuation after [SUGGESTIONS]/[/SUGGESTIONS]`;
    const systemPromptContext = (tier === "FREE" ? `The user is on the FREE plan \u2014 'The Seeker' (\u0422\u044A\u0440\u0441\u0430\u0447\u044A\u0442).
Your natal chart data and today's active transits are already loaded in your context above \u2014 use them directly without calling any tools.
You CANNOT access year-ahead forecasts, monthly returns, or relationship analysis on this plan.
If the user asks about the year ahead, relationship compatibility, or specific timing \u2014 acknowledge warmly and guide them: '\u0417\u0430 \u0434\u0430 \u0432\u0438\u0434\u0438\u043C \u043A\u0430\u043A\u0432\u043E \u043F\u0440\u0435\u0434\u0441\u0442\u043E\u0438 \u0442\u0430\u0437\u0438 \u0433\u043E\u0434\u0438\u043D\u0430 \u0438 \u043A\u0430\u043A \u043F\u043B\u0430\u043D\u0435\u0442\u0438\u0442\u0435 \u0432\u043B\u0438\u044F\u044F\u0442 \u043D\u0430 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F\u0442\u0430 \u0442\u0438, \u043C\u043E\u0436\u0435\u0448 \u0434\u0430 \u043F\u0440\u0435\u043C\u0438\u043D\u0435\u0448 \u043A\u044A\u043C \u043F\u043B\u0430\u043D Pro (\u041D\u0430\u0432\u0438\u0433\u0430\u0442\u043E\u0440\u044A\u0442).'` : tier === "PRO" ? `The user is on the PRO plan \u2014 'The Navigator' (\u041D\u0430\u0432\u0438\u0433\u0430\u0442\u043E\u0440\u044A\u0442).
Your natal chart data and today's active transits are already loaded in your context above \u2014 use them directly without tool calls.
You have access to TWO additional tools for specific time-based queries:
- get_solar_return: the annual chart for the user's birthday year \u2014 use for "what does my year ahead look like?"
- get_lunar_return: the monthly lunar cycle chart \u2014 use for "what does this month hold for me?"
You CANNOT access relationship synastry, composite charts, secondary progressions, solar arc directions, astrocartography, or Venus Return on this plan.
If the user asks about those \u2014 guide them: '\u0417\u0430 \u0437\u0430\u0434\u044A\u043B\u0431\u043E\u0447\u0435\u043D \u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0430 \u0432\u0437\u0430\u0438\u043C\u043E\u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F\u0442\u0430 \u0438 \u043F\u0440\u0435\u0446\u0438\u0437\u043D\u043E \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0438\u0440\u0430\u043D\u0435, \u043C\u043E\u0436\u0435\u0448 \u0434\u0430 \u043F\u0440\u0435\u043C\u0438\u043D\u0435\u0448 \u043A\u044A\u043C \u043F\u043B\u0430\u043D Premium (\u041E\u0440\u0430\u043A\u0443\u043B\u044A\u0442).'` : `The user is on the PREMIUM plan \u2014 'The Oracle' (\u041E\u0440\u0430\u043A\u0443\u043B\u044A\u0442).
Your natal chart data and today's active transits are already loaded in your context above \u2014 use them directly without tool calls.
You have access to seven additional tools for on-demand specific queries:
- get_solar_return: annual solar return chart for year-ahead themes
- get_lunar_return: monthly lunar return chart \u2014 current emotional cycle
- get_synastry: inter-chart aspects between the user and a stored partner \u2014 relationship compatibility
- get_progressions: secondary progressions \u2014 slow inner psychological evolution
- get_solar_arc: solar arc directions \u2014 long-term life chapter shifts (~1\xB0 per year)
- get_relocation: relocated natal chart \u2014 how different locations affect the chart
- get_composite: the composite chart \u2014 the relationship as its own entity
For synastry/composite tools, use the partner ID from the stored partners list below.
${config.partners && config.partners.length > 0 ? `Stored partners: ${config.partners.map((p) => `${p.name} (id: ${p.id})`).join(", ")}. If the user refers to someone not in this list, ask them to add that person's birth data via Settings \u2192 Partners first.` : `No partners stored yet. If the user asks about relationship compatibility, invite them to add a partner's birth data via Settings \u2192 Partners.`}
Answer every question with depth, nuance, and comprehensive multi-tool synthesis when relevant.`) + SUGGESTION_INSTRUCTION;
    if (coreMessages.length > 0 && coreMessages[0].role === "system") {
      coreMessages[0].content += `

[TIER SYSTEM INSTRUCTION]
${systemPromptContext}`;
    }
    const modelIdForCache = getModelIdForTier(tier);
    if (modelIdForCache.startsWith("claude-") && coreMessages.length > 0 && coreMessages[0].role === "system") {
      const fullContent = coreMessages[0].content;
      const dynamicPart = fullContent.substring(import_llm_helpers2.ASTROLOGER_SYSTEM_PROMPT.length);
      coreMessages[0] = {
        role: "system",
        content: import_llm_helpers2.ASTROLOGER_SYSTEM_PROMPT,
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } }
      };
      if (dynamicPart.trim()) {
        coreMessages.splice(1, 0, {
          role: "system",
          content: dynamicPart,
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } }
        });
      }
    }
    const result = await (0, import_ai.streamText)({
      model,
      messages: coreMessages,
      tools: activeTools,
      temperature: config.temperature ?? 0.7,
      onStepFinish({ text, toolCalls, toolResults }) {
      }
    });
    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        yield { content: chunk.text || "", done: false };
      } else if (chunk.type === "tool-call") {
        const args = chunk.args;
        const toolName = chunk.toolName;
        if (callbacks?.onToolCall) {
          callbacks.onToolCall(toolName, args);
        }
        yield { content: "", done: false, toolCall: { name: toolName, args } };
      } else if (chunk.type === "tool-result") {
        const resultVal = chunk.result;
        const toolName = chunk.toolName;
        yield { content: "", done: false, toolResult: { name: toolName, result: resultVal } };
      } else if (chunk.type === "finish") {
        const usage = chunk.totalUsage ?? chunk.usage;
        yield {
          content: "",
          done: true,
          usage: usage ? {
            inputTokens: usage.inputTokens ?? usage.promptTokens ?? 0,
            outputTokens: usage.outputTokens ?? usage.completionTokens ?? 0,
            totalTokens: (usage.inputTokens ?? usage.promptTokens ?? 0) + (usage.outputTokens ?? usage.completionTokens ?? 0)
          } : void 0
        };
      }
    }
  } catch (error) {
    console.error("[Agent LLM Engine] Stream error:", error);
    yield {
      content: "",
      done: true,
      error: error instanceof Error ? error.message : "Unknown streaming error"
    };
  }
}
async function chatCompletion(messages, config = {}) {
  const coreMessages = mapToCoreMessages(messages);
  const model = getProviderModel();
  const result = await (0, import_ai.generateText)({
    model,
    messages: coreMessages,
    temperature: config.temperature ?? 0.7
  });
  return result.text;
}
function getAvailableProviders() {
  const providers = [];
  if (process.env.ANTHROPIC_API_KEY) providers.push("Anthropic Claude");
  if (process.env.OPENAI_API_KEY) providers.push("OpenAI GPT-4o");
  return providers;
}
function getProviderHealth() {
  return { "primary-agent": { status: "healthy", latencyMs: 0 } };
}
function getOrchestratorStatus() {
  return { activeProvider: "agent-framework", totalProviders: 2, healthyProviders: 2 };
}
function getSwitchHistory(limit = 10) {
  return [];
}
var llm_default = {
  streamChatCompletion,
  chatCompletion,
  getAvailableProviders,
  getProviderHealth,
  getOrchestratorStatus,
  getSwitchHistory
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ASTROLOGER_SYSTEM_PROMPT,
  buildEnhancedContext,
  buildSystemPrompt,
  chatCompletion,
  generateChartSummary,
  generateSessionSummary,
  getAvailableProviders,
  getModelIdForTier,
  getOrchestratorStatus,
  getProviderHealth,
  getSwitchHistory,
  streamChatCompletion
});
