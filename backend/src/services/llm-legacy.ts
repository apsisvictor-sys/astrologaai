/**
 * LLM Service
 * US-07: AI Chat Integration
 * 
 * Supports streaming responses from GLM-5 or MiniMax M2.5
 * Context injection with user's natal chart
 */

import type { NatalChart } from './astrology';

// ============================================
// Types
// ============================================

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
  sessionSummary?: string; // US-09: Session summary for long conversations
  recentMessages?: Array<{ role: string; content: string }>; // US-09: Recent messages
  language: 'bg' | 'en';
  conversationHistory?: ChatMessage[];
}

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

// ============================================
// Constants
// ============================================

const MAX_CONTEXT_MESSAGES = 10; // Last 10 messages for context

// ============================================
// Configuration
// ============================================

const GLM_API_URL = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_API_KEY = process.env.GLM_API_KEY;
const MINIMAX_API_URL = process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1/text/chatcompletion_v2';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;

const DEFAULT_MODEL = process.env.LLM_MODEL || 'glm-5';
const FALLBACK_MODEL = process.env.LLM_FALLBACK_MODEL || 'abab6.5-chat';

// System prompt for the astrologer persona
const ASTROLOGER_SYSTEM_PROMPT = `You are AstroLogAI, a wise and knowledgeable astrologer with deep expertise in natal chart interpretation, transits, synastry, and predictive astrology.

YOUR CAPABILITIES:
- Natal chart interpretation (planetary positions, aspects, houses)
- Transit analysis and forecasting
- Relationship compatibility (synastry)
- Career, love, and life guidance based on astrology
- Understanding of both Western and basic Vedic concepts

YOUR APPROACH:
- Be warm, wise, and approachable
- Use astrological terminology but explain concepts clearly
- Always ground your advice in the user's actual chart
- Reference specific planetary positions and aspects when relevant
- Offer guidance, not deterministic predictions
- Connect cosmic themes to real-life situations
- Be encouraging while remaining realistic

RESPONSE STYLE:
- Personalize every response using the user's chart data
- When discussing transits, explain how they interact with the natal chart
- If asked about timing, reference relevant planetary movements
- For relationship questions, consider both charts if available
- Keep responses focused and practical
- End with an empowering insight when appropriate`;

// ============================================
// Chart Summary Generation
// ============================================

export function generateChartSummary(chart: NatalChart, language: 'bg' | 'en' = 'bg'): string {
  const lang = language === 'bg' ? 'bg' : 'en';
  
  const signName = (sign: string) => lang === 'bg' 
    ? (chart.sun.signBg || sign) 
    : sign;

  const summary = `
USER'S NATAL CHART SUMMARY:
- Sun: ${signName(chart.sun.sign)} ${chart.sun.degree.toFixed(1)}° in ${chart.sun.house}th House
- Moon: ${signName(chart.moon.sign)} ${chart.moon.degree.toFixed(1)}° in ${chart.moon.house}th House
- Rising (Ascendant): ${signName(chart.rising.sign)} ${chart.rising.degree.toFixed(1)}°

KEY PLANETARY POSITIONS:
- Mercury: ${signName(chart.mercury.sign)} in ${chart.mercury.house}th House ${chart.mercury.retrograde ? '(R)' : ''}
- Venus: ${signName(chart.venus.sign)} in ${chart.venus.house}th House
- Mars: ${signName(chart.mars.sign)} in ${chart.mars.house}th House
- Jupiter: ${signName(chart.jupiter.sign)} in ${chart.jupiter.house}th House
- Saturn: ${signName(chart.saturn.sign)} in ${chart.saturn.house}th House ${chart.saturn.retrograde ? '(R)' : ''}

ELEMENT DISTRIBUTION:
- Fire: ${chart.elements.fire} | Earth: ${chart.elements.earth} | Air: ${chart.elements.air} | Water: ${chart.elements.water}

KEY ASPECTS:
${chart.aspects.slice(0, 5).map(a => `- ${a.planet1} ${a.aspect} ${a.planet2} (orb: ${a.orb.toFixed(1)}°)`).join('\n')}
`.trim();

  return summary;
}

// ============================================
// Session Summary Generation (US-09)
// ============================================

/**
 * Generate a summary of the conversation for context compression
 * This is called after 20+ messages to compress context
 */
export async function generateSessionSummary(
  messages: Array<{ role: string; content: string }>,
  language: 'bg' | 'en' = 'bg'
): Promise<string> {
  // Build a prompt to summarize the conversation
  const conversationText = messages
    .slice(-20) // Last 20 messages
    .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
    .join('\n\n');

  const summaryPrompt = language === 'bg'
    ? `Обобщи на български език следния разговор в 2-3 изречения. Включи основните теми, които потребителят е обсъждал, и всяка важна информация, която AI-то трябва да запомни за бъдещи разговори:

${conversationText}

ОБОБЩЕНИЕ:`
    : `Summarize the following conversation in 2-3 sentences. Include the main topics the user discussed and any important information the AI should remember for future conversations:

${conversationText}

SUMMARY:`;

  try {
    // Use non-streaming chat completion for summary generation
    const summary = await chatCompletion(
      [{ role: 'user', content: summaryPrompt }],
      { temperature: 0.3, maxTokens: 300 }
    );
    
    return summary.trim();
  } catch (error) {
    console.error('[LLM] Failed to generate session summary:', error);
    // Return a simple fallback summary
    const topics = messages
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content.split(' ').slice(0, 5).join(' '))
      .join('; ');
    
    return language === 'bg'
      ? `Потребителят обсъжда: ${topics}`
      : `User discussed: ${topics}`;
  }
}

/**
 * Build enhanced context for the AI including session summary
 * This improves follow-up question handling (US-09)
 */
export function buildEnhancedContext(
  chartSummary: string | undefined,
  sessionSummary: string | undefined,
  recentMessages: Array<{ role: string; content: string }>,
  language: 'bg' | 'en'
): string {
  let context = '';
  
  // Add chart summary if available
  if (chartSummary) {
    context += chartSummary + '\n\n';
  }
  
  // Add session summary for long conversations (US-09)
  if (sessionSummary) {
    context += `SESSION CONTEXT (remember this for follow-up questions):\n${sessionSummary}\n\n`;
  }
  
  // Add conversation history for context
  if (recentMessages.length > 0) {
    context += `RECENT CONVERSATION:\n`;
    context += recentMessages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.substring(0, 150)}${m.content.length > 150 ? '...' : ''}`)
      .join('\n');
  }
  
  return context;
}

// ============================================
// Context Building
// ============================================

// Import and re-export getLanguageDirective from centralized languageService
// This maintains backward compatibility while using the centralized implementation
import { getLanguageDirective } from './languageService';
export { getLanguageDirective };

export function buildSystemPrompt(context: ChatContext): string {
  let prompt = ASTROLOGER_SYSTEM_PROMPT;
  
  // Add chart context if available
  if (context.chartSummary) {
    prompt += '\n\n' + context.chartSummary;
  }
  
  // US-09: Add session summary for long conversations
  // This helps the AI understand the conversation context for follow-up questions
  if (context.sessionSummary) {
    prompt += '\n\nCONVERSATION SUMMARY:\n' + context.sessionSummary;
  }
  
  // Add transit context if available
  if (context.transitsSummary) {
    prompt += '\n\nCURRENT TRANSITS:\n' + context.transitsSummary;
  }
  
  // US-09: Add conversation history for context
  // This helps with follow-up questions by including recent messages
  if (context.recentMessages && context.recentMessages.length > 0) {
    const recentText = context.recentMessages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
      .join('\n');
    prompt += '\n\nRECENT CONVERSATION:\n' + recentText;
  }
  
  // Add language directive
  prompt += getLanguageDirective(context.language);
  
  return prompt;
}

// ============================================
// LLM API Calls
// ============================================

interface LLMAPIRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Stream chat completion from GLM-5
 */
async function* streamGLM5(
  messages: ChatMessage[],
  config: LLMConfig
): AsyncGenerator<StreamChunk> {
  if (!GLM_API_KEY) {
    throw new Error('GLM_API_KEY not configured');
  }

  const request: LLMAPIRequest = {
    model: config.model || 'glm-4-flash',
    messages,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2048,
    stream: true,
  };

  try {
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GLM API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { content: '', done: false, error: message };
  }
}

/**
 * Stream chat completion from MiniMax M2.5
 */
async function* streamMiniMax(
  messages: ChatMessage[],
  config: LLMConfig
): AsyncGenerator<StreamChunk> {
  if (!MINIMAX_API_KEY || !MINIMAX_GROUP_ID) {
    throw new Error('MINIMAX_API_KEY or MINIMAX_GROUP_ID not configured');
  }

  const request: LLMAPIRequest = {
    model: config.model || 'abab6.5-chat',
    messages,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2048,
    stream: true,
  };

  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { content: '', done: false, error: message };
  }
}

/**
 * OpenAI-compatible streaming (for local/fallback)
 */
async function* streamOpenAI(
  messages: ChatMessage[],
  config: LLMConfig
): AsyncGenerator<StreamChunk> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const request: LLMAPIRequest = {
    model: config.model || 'gpt-4o',
    messages,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2048,
    stream: true,
  };

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { content: '', done: false, error: message };
  }
}

// ============================================
// Main Streaming Function
// ============================================

/**
 * Stream chat completion with automatic provider selection
 * Falls back through providers if one fails
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  config: Partial<LLMConfig> = {}
): AsyncGenerator<StreamChunk> {
  const fullConfig: LLMConfig = {
    model: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 2048,
    stream: true,
    ...config,
  };

  // Determine which provider to use based on model name
  const model = fullConfig.model.toLowerCase();
  
  // Try primary provider
  try {
    if (model.includes('glm')) {
      yield* streamGLM5(messages, fullConfig);
      return;
    }
    
    if (model.includes('abab') || model.includes('minimax')) {
      yield* streamMiniMax(messages, fullConfig);
      return;
    }
    
    if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
      yield* streamOpenAI(messages, fullConfig);
      return;
    }
    
    // Default: try GLM first, then fallback
    if (GLM_API_KEY) {
      yield* streamGLM5(messages, { ...fullConfig, model: 'glm-4-flash' });
      return;
    }
    
    if (MINIMAX_API_KEY) {
      yield* streamMiniMax(messages, { ...fullConfig, model: FALLBACK_MODEL });
      return;
    }
    
    if (process.env.OPENAI_API_KEY) {
      yield* streamOpenAI(messages, { ...fullConfig, model: 'gpt-4o' });
      return;
    }
    
    throw new Error('No LLM API key configured');
    
  } catch (error) {
    // Try fallback providers
    console.error('[LLM] Primary provider failed:', error);
    
    // Try fallback to OpenAI
    if (process.env.OPENAI_API_KEY) {
      console.log('[LLM] Falling back to OpenAI');
      try {
        yield* streamOpenAI(messages, { ...fullConfig, model: 'gpt-4o' });
        return;
      } catch (fallbackError) {
        console.error('[LLM] Fallback also failed:', fallbackError);
      }
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { content: '', done: false, error: message };
  }
}

/**
 * Non-streaming chat completion (for simple queries)
 */
export async function chatCompletion(
  messages: ChatMessage[],
  config: Partial<LLMConfig> = {}
): Promise<string> {
  let fullResponse = '';
  
  for await (const chunk of streamChatCompletion(messages, { ...config, stream: false })) {
    if (chunk.error) {
      throw new Error(chunk.error);
    }
    fullResponse += chunk.content;
    if (chunk.done) break;
  }
  
  return fullResponse;
}

/**
 * Check which LLM providers are available
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  
  if (GLM_API_KEY) providers.push('glm-5');
  if (MINIMAX_API_KEY && MINIMAX_GROUP_ID) providers.push('minimax');
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  
  return providers;
}

export type { ChatMessage as ChatMessageType, StreamChunk as StreamChunkType };
