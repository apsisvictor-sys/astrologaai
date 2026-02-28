/**
 * GLM Provider
 * US-34: LLM Provider Fallback Strategy
 * 
 * Implements GLM-4/GLM-5 support via Zhipu AI API
 * Includes health checks, latency tracking, and streaming
 */

import {
  BaseLLMProvider,
  ProviderType,
  ProviderStatus,
  type ChatMessage,
  type StreamChunk,
  type LLMConfig,
} from './llm-provider.interface';

// ============================================
// Configuration
// ============================================

const GLM_API_URL = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_API_KEY = process.env.GLM_API_KEY;

// Model configuration
const PRIMARY_MODEL = process.env.GLM_PRIMARY_MODEL || 'glm-4-flash'; // Fast, cost-effective
const FALLBACK_MODEL = process.env.GLM_FALLBACK_MODEL || 'glm-4';

// ============================================
// GLM Provider Implementation
// ============================================

export class GLMProvider extends BaseLLMProvider {
  readonly name = 'glm';
  readonly model: string;
  readonly type: ProviderType;
  
  private apiKey: string | undefined;
  private apiUrl: string;
  
  constructor(type: ProviderType = ProviderType.PRIMARY, model?: string) {
    super();
    this.type = type;
    this.model = model || (type === ProviderType.PRIMARY ? PRIMARY_MODEL : FALLBACK_MODEL);
    this.apiKey = GLM_API_KEY;
    this.apiUrl = GLM_API_URL;
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async *streamChat(
    messages: ChatMessage[],
    config: Partial<LLMConfig> = {}
  ): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      yield { content: '', done: false, error: 'GLM_API_KEY not configured' };
      return;
    }
    
    const startTime = Date.now();
    
    const request = {
      model: config.model || this.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
      stream: true,
    };
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const latencyMs = Date.now() - startTime;
        this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, `${response.status}: ${errorText}`);
        this.recordRequest(false, latencyMs);
        yield { content: '', done: false, error: `GLM API error: ${response.status} - ${errorText}` };
        return;
      }
      
      if (!response.body) {
        const latencyMs = Date.now() - startTime;
        this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, 'No response body');
        this.recordRequest(false, latencyMs);
        yield { content: '', done: false, error: 'No response body' };
        return;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const latencyMs = Date.now() - startTime;
          this.updateHealth(ProviderStatus.HEALTHY, latencyMs);
          this.recordRequest(true, latencyMs);
          yield { content: '', done: true };
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              const latencyMs = Date.now() - startTime;
              this.updateHealth(ProviderStatus.HEALTHY, latencyMs);
              this.recordRequest(true, latencyMs);
              yield { content: '', done: true };
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                yield { content, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, message);
      this.recordRequest(false, latencyMs);
      yield { content: '', done: false, error: message };
    }
  }
}

// ============================================
// MiniMax Provider (Alternative)
// ============================================

const MINIMAX_API_URL = process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1/text/chatcompletion_v2';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;

export class MiniMaxProvider extends BaseLLMProvider {
  readonly name = 'minimax';
  readonly model: string;
  readonly type: ProviderType;
  
  private apiKey: string | undefined;
  private groupId: string | undefined;
  private apiUrl: string;
  
  constructor(type: ProviderType = ProviderType.SECONDARY, model?: string) {
    super();
    this.type = type;
    this.model = model || process.env.MINIMAX_MODEL || 'abab6.5s-chat';
    this.apiKey = MINIMAX_API_KEY;
    this.groupId = MINIMAX_GROUP_ID;
    this.apiUrl = MINIMAX_API_URL;
  }
  
  isAvailable(): boolean {
    return !!this.apiKey && !!this.groupId;
  }
  
  async *streamChat(
    messages: ChatMessage[],
    config: Partial<LLMConfig> = {}
  ): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      yield { content: '', done: false, error: 'MINIMAX_API_KEY not configured' };
      return;
    }
    
    const startTime = Date.now();
    
    const request = {
      model: config.model || this.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
      stream: true,
    };
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const latencyMs = Date.now() - startTime;
        this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, `${response.status}: ${errorText}`);
        this.recordRequest(false, latencyMs);
        yield { content: '', done: false, error: `MiniMax API error: ${response.status} - ${errorText}` };
        return;
      }
      
      if (!response.body) {
        const latencyMs = Date.now() - startTime;
        this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, 'No response body');
        this.recordRequest(false, latencyMs);
        yield { content: '', done: false, error: 'No response body' };
        return;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const latencyMs = Date.now() - startTime;
          this.updateHealth(ProviderStatus.HEALTHY, latencyMs);
          this.recordRequest(true, latencyMs);
          yield { content: '', done: true };
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              const latencyMs = Date.now() - startTime;
              this.updateHealth(ProviderStatus.HEALTHY, latencyMs);
              this.recordRequest(true, latencyMs);
              yield { content: '', done: true };
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || 
                             parsed.choices?.[0]?.message?.content || '';
              if (content) {
                yield { content, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.updateHealth(ProviderStatus.UNHEALTHY, latencyMs, message);
      this.recordRequest(false, latencyMs);
      yield { content: '', done: false, error: message };
    }
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a primary GLM provider
 */
export function createPrimaryGLMProvider(): GLMProvider {
  return new GLMProvider(ProviderType.PRIMARY, PRIMARY_MODEL);
}

/**
 * Create a secondary GLM provider (fallback)
 */
export function createSecondaryGLMProvider(): GLMProvider {
  return new GLMProvider(ProviderType.SECONDARY, FALLBACK_MODEL);
}

/**
 * Create a MiniMax provider (alternative fallback)
 */
export function createMiniMaxProvider(): MiniMaxProvider {
  return new MiniMaxProvider(ProviderType.TERTIARY);
}

export default GLMProvider;
