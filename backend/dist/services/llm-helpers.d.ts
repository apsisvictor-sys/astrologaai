/**
 * LLM Helpers
 * Prompt building, chart summary, and session context utilities for the AI agent.
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
 * Basic topic extraction from recent messages.
 * Full LLM-powered summarization is deprioritized — the 100-message context
 * window makes compression unnecessary for typical conversations.
 */
export declare function generateSessionSummary(messages: Array<{
    role: string;
    content: string;
}>, language?: 'bg' | 'en'): Promise<string>;
/**
 * Build enhanced context for the AI including session summary
 */
export declare function buildEnhancedContext(chartSummary: string | undefined, sessionSummary: string | undefined, recentMessages: Array<{
    role: string;
    content: string;
}>, language: 'bg' | 'en'): string;
import { getLanguageDirective } from './languageService';
export { getLanguageDirective };
export declare function buildSystemPrompt(context: ChatContext): string;
export type { ChatMessage as ChatMessageType, StreamChunk as StreamChunkType };
//# sourceMappingURL=llm-helpers.d.ts.map