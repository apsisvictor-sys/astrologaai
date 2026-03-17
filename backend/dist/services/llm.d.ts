/**
 * LLM Service (Autonomous Agent Edition)
 * Uses Vercel AI SDK with dynamic tool calling.
 * Providers: Anthropic Claude (primary) → OpenAI GPT-4o (fallback)
 */
export { generateChartSummary, buildSystemPrompt, generateSessionSummary, buildEnhancedContext, ASTROLOGER_SYSTEM_PROMPT, } from './llm-helpers';
export { type ChatMessage } from './llm-helpers';
import type { ChatMessage as LegacyChatMessage } from './llm-helpers';
import type { LLMConfig as LegacyLLMConfig } from './llm-helpers';
export interface StreamChunk {
    content: string;
    done: boolean;
    error?: string;
    toolCall?: {
        name: string;
        args: any;
    };
    toolResult?: {
        name: string;
        result: any;
    };
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}
/**
 * Returns the resolved model ID string for a given tier (for logging/metadata).
 */
export declare function getModelIdForTier(tier?: string): string;
/**
 * Stream chat completion using an Autonomous Agent Reasoning Loop via Vercel AI SDK
 */
export declare function streamChatCompletion(messages: LegacyChatMessage[], config?: Partial<LegacyLLMConfig & {
    tier?: string;
    userId?: string;
    userIp?: string;
    partners?: Array<{
        id: string;
        name: string;
    }>;
}>, callbacks?: {
    onToolCall?: (name: string, args: any) => void;
}): AsyncGenerator<StreamChunk>;
/**
 * Non-streaming chat completion
 */
export declare function chatCompletion(messages: LegacyChatMessage[], config?: Partial<LegacyLLMConfig>): Promise<string>;
export declare function getAvailableProviders(): string[];
export declare function getProviderHealth(): Record<string, {
    status: string;
    latencyMs: number;
}>;
export declare function getOrchestratorStatus(): any;
export declare function getSwitchHistory(limit?: number): any[];
declare const _default: {
    streamChatCompletion: typeof streamChatCompletion;
    chatCompletion: typeof chatCompletion;
    getAvailableProviders: typeof getAvailableProviders;
    getProviderHealth: typeof getProviderHealth;
    getOrchestratorStatus: typeof getOrchestratorStatus;
    getSwitchHistory: typeof getSwitchHistory;
};
export default _default;
//# sourceMappingURL=llm.d.ts.map