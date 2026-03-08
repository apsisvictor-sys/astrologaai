/**
 * GLM Provider
 * US-34: LLM Provider Fallback Strategy
 *
 * Implements GLM-4/GLM-5 support via Zhipu AI API
 * Includes health checks, latency tracking, and streaming
 */
import { BaseLLMProvider, ProviderType, type ChatMessage, type StreamChunk, type LLMConfig } from './llm-provider.interface';
export declare class GLMProvider extends BaseLLMProvider {
    readonly name = "glm";
    readonly model: string;
    readonly type: ProviderType;
    private apiKey;
    private apiUrl;
    constructor(type?: ProviderType, model?: string);
    isAvailable(): boolean;
    streamChat(messages: ChatMessage[], config?: Partial<LLMConfig>): AsyncGenerator<StreamChunk>;
}
export declare class MiniMaxProvider extends BaseLLMProvider {
    readonly name = "minimax";
    readonly model: string;
    readonly type: ProviderType;
    private apiKey;
    private groupId;
    private apiUrl;
    constructor(type?: ProviderType, model?: string);
    isAvailable(): boolean;
    streamChat(messages: ChatMessage[], config?: Partial<LLMConfig>): AsyncGenerator<StreamChunk>;
}
/**
 * Create a primary GLM provider
 */
export declare function createPrimaryGLMProvider(): GLMProvider;
/**
 * Create a secondary GLM provider (fallback)
 */
export declare function createSecondaryGLMProvider(): GLMProvider;
/**
 * Create a MiniMax provider (alternative fallback)
 */
export declare function createMiniMaxProvider(): MiniMaxProvider;
export default GLMProvider;
//# sourceMappingURL=glm-provider.d.ts.map