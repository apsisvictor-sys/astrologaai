/**
 * OpenAI Provider
 * US-34: LLM Provider Fallback Strategy
 * 
 * Implements OpenAI GPT-5.3 (primary) and GPT-4o (fallback) support
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

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Model configuration
const PRIMARY_MODEL = process.env.OPENAI_PRIMARY_MODEL || 'gpt-4o'; // GPT-5.3 when available
const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o';

// ============================================
// OpenAI Provider Implementation
// ============================================

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';
  readonly model: string;
  readonly type: ProviderType;
  
  private apiKey: string | undefined;
  private apiUrl: string;
  
  constructor(type: ProviderType = ProviderType.PRIMARY, model?: string) {
    super();
    this.type = type;
    this.model = model || (type === ProviderType.PRIMARY ? PRIMARY_MODEL : FALLBACK_MODEL);
    this.apiKey = OPENAI_API_KEY;
    this.apiUrl = OPENAI_API_URL;
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async *streamChat(
    messages: ChatMessage[],
    config: Partial<LLMConfig> = {}
  ): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      yield { content: '', done: false, error: 'OPENAI_API_KEY not configured' };
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
        yield { content: '', done: false, error: `OpenAI API error: ${response.status} - ${errorText}` };
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
      let fullContent = '';
      
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
                fullContent += content;
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
 * Create a primary OpenAI provider (GPT-5.3 when available)
 */
export function createPrimaryOpenAIProvider(): OpenAIProvider {
  return new OpenAIProvider(ProviderType.PRIMARY, PRIMARY_MODEL);
}

/**
 * Create a secondary OpenAI provider (GPT-4o fallback)
 */
export function createSecondaryOpenAIProvider(): OpenAIProvider {
  return new OpenAIProvider(ProviderType.SECONDARY, FALLBACK_MODEL);
}

export default OpenAIProvider;
