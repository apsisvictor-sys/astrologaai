/**
 * Chat WebSocket Handler
 * US-10: Streaming Responses
 * US-36: Free-tier Query Limit Enforcement
 * 
 * Handles chat-related WebSocket events for real-time streaming
 */

import { AuthenticatedSocket, getSocketServer, emitToSocket } from './index';
import { PrismaClient, Tier } from '@prisma/client';
import {
  streamChatCompletion,
  buildSystemPrompt,
  generateChartSummary,
  getModelIdForTier,
} from '../services/llm';
import { getActiveTransitsForUser, computeTransitHouses } from '../services/transits';
import { getPersonalDailyHoroscope } from '../services/forecast';
import type { ChatMessage } from '../services/llm';
import {
  checkQueryLimit,
  incrementQueryCount,
} from '../middleware/queryLimit';
import { getBurstLimit, getEffectiveMonthlyLimit } from '../config/subscription-tiers';
import { getAdminPrices, calcMessageCostUsdCents } from '../services/cost-calculator';

const prisma = new PrismaClient();

// ============================================
// Rate Limiting Configuration (US-36: Now uses centralized config)
// ============================================

// Note: Rate limits now come from config/subscription-tiers.ts
// These constants are kept for backwards compatibility
const MONTH_RESET_DAY = 1;
const MAX_CONTEXT_MESSAGES = 100;

// ============================================
// Helper Functions
// ============================================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthResetDate(): Date {
  const now = new Date();
  const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(nextYear, nextMonth, MONTH_RESET_DAY);
}

// US-36: Rate limit checking now uses centralized middleware
async function checkRateLimit(userId: string, tier: Tier): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
  limit: number;
  limitType?: 'monthly' | 'burst' | 'daily';
}> {
  // Use centralized query limit checker
  const status = await checkQueryLimit(userId, tier);

  return {
    allowed: status.allowed,
    remaining: typeof status.monthlyRemaining === 'number' ? status.monthlyRemaining : 999,
    resetAt: status.resetAt,
    limit: typeof status.monthlyLimit === 'number' ? status.monthlyLimit : 999,
    limitType: status.limitType,
  };
}

// US-36: Increment now persists to database via centralized service
// US-37: Pass tier for burst limit handling
async function incrementRateLimit(userId: string, tier: Tier): Promise<void> {
  await incrementQueryCount(userId, tier);
}

// ============================================
// Active Streams Tracking
// ============================================

// Track active streams for cancellation
const activeStreams = new Map<string, {
  conversationId: string;
  abortController: AbortController;
  userId: string;
}>();

// ============================================
// Event Handlers
// ============================================

/**
 * Handle chat:subscribe event
 * Subscribe to a conversation for receiving messages
 */
export async function handleChatSubscribe(
  socket: AuthenticatedSocket,
  data: { conversationId: string }
): Promise<void> {
  const { conversationId } = data;
  const userId = socket.userId!;

  try {
    // Verify conversation belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: conversationId, userId },
    });

    if (!session) {
      socket.emit('chat:error', {
        code: 'INVALID_CONVERSATION',
        message: 'Conversation not found',
        conversationId,
      });
      return;
    }

    // Join the conversation room
    socket.join(`conversation:${conversationId}`);
    socket.data.sessionId = conversationId;

    // Send confirmation
    socket.emit('chat:subscribed', {
      conversationId,
      message: 'Successfully subscribed to conversation',
    });

    console.log(`[Socket] User ${userId} subscribed to conversation ${conversationId}`);
  } catch (error) {
    console.error('[Socket] Subscribe error:', error);
    socket.emit('chat:error', {
      code: 'SUBSCRIPTION_ERROR',
      message: 'Failed to subscribe to conversation',
    });
  }
}

/**
 * Handle chat:send_message event
 * Send a message and stream AI response
 */
export async function handleChatSendMessage(
  socket: AuthenticatedSocket,
  data: {
    conversationId: string;
    content: string;
    language?: 'bg' | 'en';
    context?: {
      includeChart?: boolean;
      includeTransits?: boolean;
      partnerId?: string | null;
    };
    messageId?: string; // Client-generated ID for deduplication
  }
): Promise<void> {
  const { conversationId, content, language = 'bg', messageId } = data;
  const userId = socket.userId!;
  const userTier = (socket.userTier as Tier) || 'FREE';
  const userLanguage = (socket.userLanguage as 'bg' | 'en') || language;
  const forwardedFor = socket.handshake.headers['x-forwarded-for'];
  const userIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim()) || socket.handshake.address || undefined;

  try {
    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      socket.emit('chat:error', {
        code: 'VALIDATION_ERROR',
        message: 'Message content is required',
        conversationId,
      });
      return;
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(userId, userTier);

    if (!rateLimit.allowed) {
      socket.emit('chat:error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: userLanguage === 'bg'
          ? 'Достигнахте лимита на заявките. Моля, опитайте по-късно.'
          : 'Rate limit exceeded. Please try again later.',
        conversationId,
        retryAfter: rateLimit.resetAt ?
          Math.floor((rateLimit.resetAt.getTime() - Date.now()) / 1000) :
          undefined,
        limit: rateLimit.limit,
      });
      return;
    }

    // Verify conversation belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: MAX_CONTEXT_MESSAGES,
        },
      },
    });

    if (!session) {
      socket.emit('chat:error', {
        code: 'INVALID_CONVERSATION',
        message: 'Conversation not found',
        conversationId,
      });
      return;
    }

    // Send message received confirmation
    socket.emit('chat:message_received', {
      clientMessageId: messageId,
      serverMessageId: null, // Will be set after saving
      status: 'accepted',
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        limit: rateLimit.limit,
      },
    });

    // Get user's birth chart for context
    let chartSummary: string | undefined;
    const userChart = await prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (userChart?.chartData) {
      const chart = userChart.chartData as any;
      chartSummary = generateChartSummary(chart, userLanguage);
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: conversationId,
        role: 'USER',
        content: content.trim(),
      },
    });

    // Update message received with actual ID
    socket.emit('chat:message_received', {
      clientMessageId: messageId,
      serverMessageId: userMessage.id,
      status: 'saved',
    });

    // Update session title if first message
    if (session.messages.length === 0) {
      const title = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
      await prisma.chatSession.update({
        where: { id: conversationId },
        data: { title },
      });
    }

    // Increment rate limit
    await incrementRateLimit(userId, userTier);

    // Build conversation history
    const conversationHistory: ChatMessage[] = session.messages.map((msg) => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
    }));

    // Get session summary from DB
    const sessionSummary = (session as any).summary || undefined;

    // Build personal transit context (injected into Oracle system prompt)
    let transitsSummary: string | undefined;
    if (userChart?.chartData) {
      try {
        const chart = userChart.chartData as any;
        const { skyPositions } = await getActiveTransitsForUser(chart);
        const transitHouses = computeTransitHouses(skyPositions, chart.houses || []);

        const PLANET_DISPLAY: Record<string, string> = {
          sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
          jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
          pluto: 'Pluto', northNode: 'North Node',
        };

        const skyLines = skyPositions.map(p => {
          const name = PLANET_DISPLAY[p.planet] || p.planet;
          const house = transitHouses[p.planet];
          const retro = p.retrograde ? ' ℞' : '';
          return `- ${name} in ${p.sign} ${p.degree.toFixed(1)}°${retro} | House ${house}`;
        });

        transitsSummary = `TODAY'S SKY — YOUR PERSONAL TRANSIT CONTEXT:\n${skyLines.join('\n')}`;

        // PRO/PREMIUM: append personal planetary influences from horoscope cache
        if (userTier === 'PRO' || userTier === 'PREMIUM') {
          try {
            const profile = await prisma.birthData.findUnique({ where: { userId } });
            if (profile) {
              const birthDate = new Date(profile.date);
              const [hour, minute] = (profile.time || '12:00').split(':').map(Number);
              const birthData = {
                year: birthDate.getFullYear(), month: birthDate.getMonth() + 1, day: birthDate.getDate(),
                hour: hour || 12, minute: minute || 0,
                latitude: profile.latitude, longitude: profile.longitude,
                timezone: profile.timezone || 'UTC',
              };
              const horoscope = await getPersonalDailyHoroscope(userId, birthData);
              if (horoscope.planetaryInfluences?.length > 0) {
                const influenceLines = horoscope.planetaryInfluences.map(inf => {
                  const orbStr = inf.orb != null ? ` | orb ${inf.orb.toFixed(1)}°` : '';
                  return `- ${inf.planet} ${inf.aspectType} natal ${inf.natalPlanet}${orbStr} | strength ${inf.strength}/5`;
                });
                transitsSummary += `\n\nYour personal planetary aspects today:\n${influenceLines.join('\n')}`;
              }
            }
          } catch (e) {
            // horoscope fetch failed — sky positions still injected
          }
        }
      } catch (e) {
        // transit injection failed — proceed without it, do not break the chat
      }
    }

    // Build system prompt — chart + persona only. Full conversation history
    // is sent as structured messages below, not embedded in the system prompt.
    const systemPrompt = buildSystemPrompt({
      chartSummary,
      transitsSummary,
      language: userLanguage,
      sessionSummary,
    });

    // For PREMIUM users, fetch stored partners for synastry/composite tool context
    let partners: Array<{ id: string; name: string }> = [];
    if (userTier === 'PREMIUM') {
      partners = await prisma.partner.findMany({
        where: { userId },
        select: { id: true, name: true },
      });
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: content.trim() },
    ];

    // Create abort controller for cancellation
    const abortController = new AbortController();
    const streamId = `${userId}:${conversationId}:${Date.now()}`;
    activeStreams.set(streamId, {
      conversationId,
      abortController,
      userId,
    });

    // Emit generation started
    socket.emit('chat:generation_started', {
      messageId: null,
      conversationId,
      estimatedTokens: 150,
    });

    // Emit typing indicator
    socket.emit('chat:typing_indicator', {
      conversationId,
      isTyping: true,
    });

    // Stream AI response
    let fullResponse = '';
    let chunkIndex = 0;
    let hasError = false;
    let tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined;
    const modelId = getModelIdForTier(userTier);
    const streamStartTime = Date.now();

    try {
      for await (const chunk of streamChatCompletion(messages, { tier: userTier, userId, userIp, partners }, {
        onToolCall: (name: string, args: any) => {
          // Send a live UI indicator to the Next.js frontend
          socket.emit('chat:tool_call', {
            conversationId,
            toolName: name,
            args,
            message: `Consulting ${name.replace(/_/g, ' ')}...`
          });
        }
      })) {
        // Check if stream was cancelled
        if (abortController.signal.aborted) {
          console.log(`[Socket] Stream ${streamId} was cancelled`);
          break;
        }

        if (chunk.error) {
          hasError = true;
          socket.emit('chat:error', {
            code: 'GENERATION_ERROR',
            message: chunk.error,
            conversationId,
          });
          break;
        }

        // Pass through standard text chunks
        if (chunk.content) {
          fullResponse += chunk.content;

          socket.emit('chat:message_chunk', {
            messageId: null,
            chunk: chunk.content,
            index: chunkIndex++,
            isComplete: chunk.done,
          });
        }

        if (chunk.usage) {
          tokenUsage = chunk.usage;
        }

        if (chunk.done) {
          break;
        }

        // Small delay to prevent flooding
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (streamError) {
      hasError = true;
      const errorMessage = streamError instanceof Error ? streamError.message : 'Streaming error';
      socket.emit('chat:error', {
        code: 'STREAM_ERROR',
        message: errorMessage,
        conversationId,
      });
    }

    // Clean up active stream
    activeStreams.delete(streamId);

    // Emit typing stopped
    socket.emit('chat:typing_indicator', {
      conversationId,
      isTyping: false,
    });

    // Save assistant response if no error
    if (!hasError && fullResponse) {
      const latencyMs = Date.now() - streamStartTime;
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId: conversationId,
          role: 'ASSISTANT',
          content: fullResponse,
          metadata: {
            model: modelId,
            tier: userTier,
            inputTokens: tokenUsage?.inputTokens ?? 0,
            outputTokens: tokenUsage?.outputTokens ?? 0,
            totalTokens: tokenUsage?.totalTokens ?? Math.ceil(fullResponse.length / 4),
            latencyMs,
          },
        },
      });

      // Fire-and-forget: upsert daily LlmUsage aggregate (does not block response)
      const inTokens  = tokenUsage?.inputTokens  ?? 0;
      const outTokens = tokenUsage?.outputTokens ?? 0;
      getAdminPrices().then(prices => {
        const costUsdCents = calcMessageCostUsdCents(modelId, inTokens, outTokens, prices);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        return prisma.llmUsage.upsert({
          where: { date_tier_model: { date: today, tier: userTier, model: modelId } },
          create: {
            date: today,
            tier: userTier,
            model: modelId,
            requestCount: 1,
            inputTokens:  inTokens,
            outputTokens: outTokens,
            totalTokens:  tokenUsage?.totalTokens ?? (inTokens + outTokens),
            costUsdCents,
            p50LatencyMs: latencyMs,
            p95LatencyMs: latencyMs,
            p99LatencyMs: latencyMs,
          },
          update: {
            requestCount:  { increment: 1 },
            inputTokens:   { increment: inTokens },
            outputTokens:  { increment: outTokens },
            totalTokens:   { increment: tokenUsage?.totalTokens ?? (inTokens + outTokens) },
            costUsdCents:  { increment: costUsdCents },
            p50LatencyMs:  latencyMs, // last-value approximation
          },
        });
      }).catch(err => console.error('[LlmUsage] upsert failed:', err));

      // Update session
      await prisma.chatSession.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Emit completion
      socket.emit('chat:message_complete', {
        messageId: assistantMessage.id,
        conversationId,
        content: fullResponse,
        metadata: {
          model: modelId,
          inputTokens: tokenUsage?.inputTokens ?? 0,
          outputTokens: tokenUsage?.outputTokens ?? 0,
          totalTokens: tokenUsage?.totalTokens ?? Math.ceil(fullResponse.length / 4),
          latencyMs,
          finishReason: 'stop',
        },
      });
    }
  } catch (error) {
    console.error('[Socket] Send message error:', error);
    socket.emit('chat:error', {
      code: 'INTERNAL_ERROR',
      message: 'An error occurred while processing your message',
      conversationId,
    });
  }
}

/**
 * Handle chat:typing event
 * User typing indicator
 */
export async function handleChatTyping(
  socket: AuthenticatedSocket,
  data: { conversationId: string; isTyping: boolean }
): Promise<void> {
  const { conversationId, isTyping } = data;
  const userId = socket.userId!;

  // Broadcast to other users in the conversation (for future multi-user support)
  socket.to(`conversation:${conversationId}`).emit('chat:partner_typing', {
    conversationId,
    userId,
    isTyping,
  });
}

/**
 * Handle chat:cancel_generation event
 * Cancel ongoing AI response generation
 */
export async function handleChatCancelGeneration(
  socket: AuthenticatedSocket,
  data: { conversationId: string; messageId?: string }
): Promise<void> {
  const { conversationId } = data;
  const userId = socket.userId!;

  // Find and abort active stream
  for (const [streamId, stream] of activeStreams.entries()) {
    if (stream.conversationId === conversationId && stream.userId === userId) {
      stream.abortController.abort();
      activeStreams.delete(streamId);

      socket.emit('chat:generation_cancelled', {
        conversationId,
        message: 'Generation cancelled',
      });

      console.log(`[Socket] Cancelled generation for user ${userId} in conversation ${conversationId}`);
      return;
    }
  }

  socket.emit('chat:error', {
    code: 'NO_ACTIVE_GENERATION',
    message: 'No active generation to cancel',
    conversationId,
  });
}

/**
 * Handle chat:unsubscribe event
 * Unsubscribe from a conversation
 */
export async function handleChatUnsubscribe(
  socket: AuthenticatedSocket,
  data: { conversationId: string }
): Promise<void> {
  const { conversationId } = data;

  socket.leave(`conversation:${conversationId}`);
  socket.data.sessionId = undefined;

  socket.emit('chat:unsubscribed', {
    conversationId,
    message: 'Successfully unsubscribed from conversation',
  });
}

/**
 * Register all chat event handlers
 */
export function registerChatHandlers(socket: AuthenticatedSocket): void {
  socket.on('chat:subscribe', (data) => handleChatSubscribe(socket, data));
  socket.on('chat:send_message', (data) => handleChatSendMessage(socket, data));
  socket.on('chat:typing', (data) => handleChatTyping(socket, data));
  socket.on('chat:cancel_generation', (data) => handleChatCancelGeneration(socket, data));
  socket.on('chat:unsubscribe', (data) => handleChatUnsubscribe(socket, data));

  console.log(`[Socket] Registered chat handlers for user ${socket.userId}`);
}

export default {
  registerChatHandlers,
  handleChatSubscribe,
  handleChatSendMessage,
  handleChatTyping,
  handleChatCancelGeneration,
  handleChatUnsubscribe,
};
