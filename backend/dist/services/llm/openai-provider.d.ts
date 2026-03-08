/**
 * OpenAI Provider
 * US-34: LLM Provider Fallback Strategy
 *
 * Implements OpenAI GPT-5.3 (primary) and GPT-4o (fallback) support
 * Includes health checks, latency tracking, and streaming
 */
import { BaseLLMProvider, ProviderType, type ChatMessage, type StreamChunk, type LLMConfig } from './llm-provider.interface';
export declare class OpenAIProvider extends BaseLLMProvider {
    readonly name = "openai";
    readonly model: string;
    readonly type: ProviderType;
    private apiKey;
    private apiUrl;
    constructor(type?: ProviderType, model?: string);
    isAvailable(): boolean;
    streamChat(messages: ChatMessage[], config?: Partial<LLMConfig>): AsyncGenerator<StreamChunk>;
}
/**
 * Create a primary OpenAI provider (GPT-5.3 when available)
 */
export declare function createPrimaryOpenAIProvider(): OpenAIProvider;
/**
 * Create a secondary OpenAI provider (GPT-4o fallback)
 */
export declare function createSecondaryOpenAIProvider(): OpenAIProvider;
export default OpenAIProvider;
//# sourceMappingURL=openai-provider.d.ts.map