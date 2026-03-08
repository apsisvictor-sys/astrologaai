/**
 * LLM Service
 * US-07: AI Chat Integration
 *
 * Supports streaming responses from GLM-5 or MiniMax M2.5
 * Context injection with user's natal chart
 */
import type { NatalChart } from './astrology';
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface StreamChunk {
    content: string;
    done: boolean;
    error?: string;
}
export interface ChatContext {
    chartSummary?: string;
    transitsSummary?: string;
    sessionSummary?: string;
    recentMessages?: Array<{
        role: string;
        content: string;
    }>;
    language: 'bg' | 'en';
    conversationHistory?: ChatMessage[];
}
export interface LLMConfig {
    model: string;
    temperature: number;
    maxTokens: number;
    stream: boolean;
}
export declare function generateChartSummary(chart: NatalChart, language?: 'bg' | 'en'): string;
/**
 * Generate a summary of the conversation for context compression
 * This is called after 20+ messages to compress context
 */
export declare function generateSessionSummary(messages: Array<{
    role: string;
    content: string;
}>, language?: 'bg' | 'en'): Promise<string>;
/**
 * Build enhanced context for the AI including session summary
 * This improves follow-up question handling (US-09)
 */
export declare function buildEnhancedContext(chartSummary: string | undefined, sessionSummary: string | undefined, recentMessages: Array<{
    role: string;
    content: string;
}>, language: 'bg' | 'en'): string;
import { getLanguageDirective } from './languageService';
export { getLanguageDirective };
export declare function buildSystemPrompt(context: ChatContext): string;
/**
 * Stream chat completion with automatic provider selection
 * Falls back through providers if one fails
 */
export declare function streamChatCompletion(messages: ChatMessage[], config?: Partial<LLMConfig>): AsyncGenerator<StreamChunk>;
/**
 * Non-streaming chat completion (for simple queries)
 */
export declare function chatCompletion(messages: ChatMessage[], config?: Partial<LLMConfig>): Promise<string>;
/**
 * Check which LLM providers are available
 */
export declare function getAvailableProviders(): string[];
export type { ChatMessage as ChatMessageType, StreamChunk as StreamChunkType };
//# sourceMappingURL=llm-legacy.d.ts.map