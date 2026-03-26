/**
 * Chat Controller
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-09: Chat Context Persistence
 * 
 * Handles chat message sending with streaming responses
 * Implements rate limiting based on user tier
 * Implements context persistence via Redis with session summarization
 */

import { Request, Response } from 'express';
import { PrismaClient, Tier } from '@prisma/client';
import { redisClient, 
  storeSessionContext, 
  getSessionContext, 
  updateSessionSummary,
  clearSessionContext,
  clearUserSessionContexts 
} from '../utils/redis';
import {
  streamChatCompletion,
  buildSystemPrompt,
  generateChartSummary,
  generateSessionSummary,
  getOrchestratorStatus,
} from '../services/llm';
import { getActiveTransitsForUser } from '../services/transits';
import {
  getTierLimits,
} from '../config/subscription-tiers';
import { getUserUsageStats, incrementDailyQuery, getFreeTierDailyQueryLimit } from '../middleware/queryLimit';
import { updateStreak } from '../services/streakService';
import { deductCredits, refundCredits } from '../services/credits';
import { retrieveOracleMemories } from '../services/memory-retrieval';
import type { ChatMessage } from '../services/llm';

const prisma = new PrismaClient();

// ============================================
// Rate Limiting Configuration (US-36, US-37)
// ============================================
// Using centralized subscription-tiers.ts config
// FREE: 10 queries/month, 10/min burst
// PRO: unlimited, 60/min burst
// PREMIUM: unlimited, no burst limit

/**
 * Extract a ~140-char snippet from content centred around the search term.
 * Used by listSessions to return a relevant preview for the search popover.
 */
function extractSearchSnippet(content: string, term: string, maxLen = 140): string {
  const idx = content.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return content.length > maxLen ? content.substring(0, maxLen) + '…' : content;
  const start = Math.max(0, idx - 50);
  const end = Math.min(content.length, idx + term.length + 90);
  let snippet = content.substring(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < content.length) snippet += '…';
  return snippet;
}
const MAX_CONTEXT_MESSAGES = 10; // Last 10 messages for context
const SUMMARY_THRESHOLD = 20; // Generate summary after 20 messages

// ENH-04: Approximate LLM cost in USD cents (character-length token estimates)
function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const isHaiku = model.includes('haiku');
  const isOpus = model.includes('opus');
  const inputRate = isHaiku ? 0.025 : isOpus ? 1.5 : 0.3;
  const outputRate = isHaiku ? 0.125 : isOpus ? 7.5 : 1.5;
  return Math.round((inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate);
}

// ============================================
// Helper Functions
// ============================================

async function getOrCreateSession(userId: string, sessionId?: string, birthProfileId?: string, language = 'en') {
  if (sessionId) {
    // Try to get from Redis first for faster context
    const cachedContext = await getSessionContext(sessionId);
    
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { 
        messages: { 
          orderBy: { createdAt: 'asc' as const },
          take: MAX_CONTEXT_MESSAGES // Last 10 messages for DB
        } 
      },
    });
    
    if (existing) {
      // Sync Redis context if not present but session exists
      if (!cachedContext && existing.messages.length > 0) {
        const summary = existing.summary || undefined;
        await storeSessionContext(
          existing.id, 
          userId, 
          existing.messages.map(m => ({ role: m.role.toLowerCase(), content: m.content })),
          summary || undefined
        );
      }
      return existing;
    }
  }
  
  // Create new session
  return prisma.chatSession.create({
    data: {
      userId,
      birthProfileId,
      title: language === 'bg' ? 'Нов разговор' : 'New Conversation',
    },
    include: { 
      messages: true 
    },
  });
}

// ============================================
// Session Summary Generation (US-09)
// ============================================

async function generateAndStoreSessionSummary(
  sessionId: string,
  userId: string,
  allMessages: Array<{ role: string; content: string }>,
  language: string
): Promise<string> {
  // Generate summary using LLM
  const lang = (language === 'en' ? 'en' : 'bg') as 'bg' | 'en';
  const summary = await generateSessionSummary(allMessages, lang);
  
  // Store summary in database
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { summary },
  });
  
  // Update Redis context
  await updateSessionSummary(sessionId, summary);
  
  return summary;
}

// ============================================
// Controller Functions
// ============================================

/**
 * POST /api/v1/chat/message
 * Send a message to the AI astrologer with streaming response
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    // US-34: Track latency for response headers
    const startTime = Date.now();
    
    const { content, sessionId, birthProfileId, creditAction } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email || '';
    const userTier = (req.user?.tier as Tier) || 'FREE';
    // US-25: Get from user preferences, ensure valid type
    const userLanguage: 'bg' | 'en' = (req.user?.language === 'bg' ? 'bg' : 'en');
    const isAdmin = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).includes(userEmail);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message content is required' },
      });
      return;
    }


    // Get or create session
    const session = await getOrCreateSession(userId, sessionId, birthProfileId, userLanguage);

    // FEAT-10: Determine effective tier (subscription or credit-upgraded)
    // creditAction: 'oracle_sonnet' (2cr → PRO) or 'oracle_opus' (4cr → PREMIUM)
    // Credits are charged once at session start (first message only).
    // Subsequent messages in the same session inherit session.creditTier.
    const TIER_ORDER: Record<string, number> = { FREE: 0, PRO: 1, PREMIUM: 2 };
    const CREDIT_ACTION_TIER: Record<string, string> = {
      oracle_sonnet: 'PRO',
      oracle_opus:   'PREMIUM',
    };
    const CREDIT_ACTION_COST: Record<string, number> = {
      oracle_sonnet: 2,
      oracle_opus:   4,
    };

    let effectiveTier: string = userTier;
    let creditDeducted = false;

    if (session.creditTier) {
      // Existing credit-upgraded session — use stored credit tier
      effectiveTier = session.creditTier;
    } else if (
      creditAction &&
      CREDIT_ACTION_TIER[creditAction] &&
      session.messages.length === 0 // First message only
    ) {
      const requestedTier = CREDIT_ACTION_TIER[creditAction];
      if ((TIER_ORDER[requestedTier] ?? 0) > (TIER_ORDER[userTier] ?? 0)) {
        // Charge credits and upgrade effective tier for this session
        try {
          await prisma.userCredits.upsert({
            where: { userId },
            create: { userId },
            update: {},
          });
          await deductCredits(
            userId,
            CREDIT_ACTION_COST[creditAction],
            `Oracle session (${creditAction})`,
            'oracle_session',
            session.id
          );
          creditDeducted = true;
          effectiveTier = requestedTier;
          // Persist credit tier on session so subsequent messages use it
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { creditTier: requestedTier },
          });
        } catch (creditErr: any) {
          if (creditErr?.code === 'INSUFFICIENT_CREDITS') {
            res.status(402).json({
              success: false,
              error: {
                code: 'INSUFFICIENT_CREDITS',
                message: 'Insufficient credits for this Oracle session',
                required: creditErr.required,
                available: creditErr.available,
              },
            });
            return;
          }
          throw creditErr;
        }
      }
    }

    // Get user's birth chart for context
    let chartSummary: string | undefined;
    let rawChartData: any = null;

    if (session.birthProfileId || birthProfileId) {
      const profileId = session.birthProfileId || birthProfileId;
      const birthProfile = await prisma.birthProfile.findUnique({
        where: { id: profileId },
        include: { birthChart: true },
      });

      if (birthProfile?.birthChart?.chartData) {
        const chart = birthProfile.birthChart.chartData as any;
        rawChartData = chart;
        chartSummary = generateChartSummary(chart, userLanguage);
      }
    } else {
      // Try to get user's primary birth chart
      const userChart = await prisma.birthChart.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (userChart?.chartData) {
        const chart = userChart.chartData as any;
        rawChartData = chart;
        chartSummary = generateChartSummary(chart, userLanguage);
      }
    }

    // Build messages array for LLM
    const conversationHistory: ChatMessage[] = session.messages.map((msg) => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
    }));

    // US-09: Get session context from Redis for enhanced context
    const sessionContext = await getSessionContext(session.id);
    const sessionSummary = sessionContext?.summary || session.summary || undefined;
    const recentMessages = sessionContext?.recentMessages || 
      session.messages.slice(-MAX_CONTEXT_MESSAGES).map(m => ({ 
        role: m.role.toLowerCase(), 
        content: m.content 
      }));

    // Pre-compute active transits for Oracle context (avoids tool calls for this universal data)
    let transitsSummary: string | undefined;
    if (chartSummary && rawChartData) {
      try {
        const { skyPositions, aspectsToNatal, moonPhase } = await getActiveTransitsForUser(rawChartData);

        const aspectLines = aspectsToNatal.slice(0, 12).map(a =>
          `- ${a.transitPlanetBg} ${a.aspectBg} natal ${a.natalPlanetBg} | orb ${a.orb}° | ${a.influence} | ${a.description}`
        ).join('\n');

        const skyLines = skyPositions.map(p =>
          `${p.planetBg}: ${p.signBg} ${p.degree}°${p.retrograde ? ' ℞' : ''}`
        ).join(', ');

        transitsSummary = `TODAY'S SKY (${new Date().toISOString().split('T')[0]}):
${skyLines}

Moon: ${moonPhase.phaseBg} (${moonPhase.illumination}% illuminated) in ${moonPhase.moonSignBg}

ACTIVE TRANSITS TO NATAL CHART (sorted by orb — tightest = most powerful):
${aspectLines || 'No major aspects within orb today.'}`;
      } catch (err) {
        console.warn('[Chat] Failed to compute active transits for system prompt:', err instanceof Error ? err.message : err);
        // Non-fatal — Oracle continues without transit context
      }
    }

    // Retrieve relevant memories for Oracle Layer 2 injection (PIX-169)
    const memories = await retrieveOracleMemories(userId, content.trim(), effectiveTier);

    const systemPrompt = await buildSystemPrompt({
      chartSummary,
      transitsSummary,
      language: userLanguage,
      conversationHistory,
      sessionSummary, // US-09: Add session summary for follow-up context
      recentMessages, // US-09: Add recent messages for context
      memories,
      tier: effectiveTier,
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: content.trim() },
    ];

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: content.trim(),
      },
    });

    // Update session title if it's the first message
    if (session.messages.length === 0) {
      const title = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { title },
      });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Handle client disconnect — abort the stream
    let aborted = false;
    req.on('close', () => { aborted = true; });

    // US-34: Get initial provider info for headers
    const orchestratorStatus = getOrchestratorStatus();
    res.setHeader('X-Provider', orchestratorStatus.activeProvider);

    // Send initial metadata
    res.write(`event: metadata\ndata: ${JSON.stringify({
      sessionId: session.id,
      messageId: userMessage.id,
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        limit: rateLimit.limit,
      },
    })}\n\n`);

    // Stream AI response
    let fullResponse = '';
    let assistantMessageId: string | undefined;
    let hasError = false;

    try {
      for await (const chunk of streamChatCompletion(messages, {
        tier: effectiveTier,
        userId,
        userIp: req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim(),
      })) {
        if (aborted) break;
        if (chunk.error) {
          hasError = true;
          res.write(`event: error\ndata: ${JSON.stringify({
            message: chunk.error
          })}\n\n`);
          break;
        }

        fullResponse += chunk.content;

        // Send chunk to client
        res.write(`event: chunk\ndata: ${JSON.stringify({
          content: chunk.content,
          done: chunk.done
        })}\n\n`);

        if (chunk.done) {
          break;
        }
      }
    } catch (streamError) {
      hasError = true;
      const errorMessage = streamError instanceof Error ? streamError.message : 'Streaming error';
      res.write(`event: error\ndata: ${JSON.stringify({
        message: errorMessage
      })}\n\n`);
    }

    // FEAT-10: Auto-refund credits if LLM failed and credits were deducted this request
    if (hasError && creditDeducted) {
      refundCredits(userId, CREDIT_ACTION_COST[creditAction], `Auto-refund: LLM error for ${creditAction}`, 'oracle_session', session.id)
        .catch(err => console.error('[Chat] Credit refund failed (non-fatal):', err));
      // Also clear the creditTier so the user can retry
      prisma.chatSession.update({ where: { id: session.id }, data: { creditTier: null } })
        .catch(() => {});
    }

    // Send completion event immediately — respond to client before DB ops
    const latencyMs = Date.now() - startTime;
    const finalStatus = getOrchestratorStatus();

    // Message-count daily limit: increment query counter for FREE users
    let dailyLimitReached = false;
    if (!hasError && fullResponse && userTier === 'FREE' && !isAdmin && userId) {
      try {
        const [newCount, limit] = await Promise.all([
          incrementDailyQuery(userId),
          getFreeTierDailyQueryLimit(),
        ]);
        if (newCount >= limit) {
          dailyLimitReached = true;
        }
      } catch (err) {
        console.error('[Chat] Failed to update daily query counter (non-fatal):', err);
      }
    }

    res.write(`event: complete\ndata: ${JSON.stringify({
      messageId: assistantMessageId,
      content: fullResponse,
      hasError,
      provider: finalStatus.activeProvider,
      latencyMs,
      dailyLimitReached,
    })}\n\n`);

    res.end();

    // Background: save assistant response + update context (non-blocking)
    // Client already received the complete event — DB failure is silent
    if (!hasError && fullResponse) {
      (async () => {
        try {
          const assistantMessage = await prisma.chatMessage.create({
            data: {
              sessionId: session.id,
              role: 'ASSISTANT',
              content: fullResponse,
              metadata: {
                model: process.env.LLM_MODEL || 'glm-5',
                tokensUsed: Math.ceil(fullResponse.length / 4),
              },
            },
          });
          assistantMessageId = assistantMessage.id;

          await prisma.chatSession.update({
            where: { id: session.id },
            data: { updatedAt: new Date() },
          });

          const updatedMessages = [
            ...session.messages.map(m => ({ role: m.role.toLowerCase(), content: m.content })),
            { role: 'user', content: content.trim() },
            { role: 'assistant', content: fullResponse },
          ];

          const currentSummary = session.summary ||
            (await getSessionContext(session.id))?.summary || undefined;

          await storeSessionContext(session.id, userId, updatedMessages, currentSummary);

          const totalMessages = session.messages.length + 2;
          if (totalMessages >= SUMMARY_THRESHOLD && !session.summary) {
            generateAndStoreSessionSummary(session.id, userId, updatedMessages, userLanguage)
              .then(summary => {
                console.log(`[Chat] Session ${session.id} summary generated: ${summary.substring(0, 50)}...`);
              })
              .catch(err => {
                console.error('[Chat] Failed to generate session summary:', err);
              });
          }

          // ENH-04: Aggregate token usage — character-length approximations
          const modelUsed = process.env.LLM_MODEL || 'unknown';
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const approxInput = BigInt(Math.ceil((systemPrompt?.length ?? 0) / 4));
          const approxOutput = BigInt(Math.ceil(fullResponse.length / 4));
          await prisma.llmUsage.upsert({
            where: { date_tier_model: { date: today, tier: userTier, model: modelUsed } },
            create: {
              date: today,
              tier: userTier,
              model: modelUsed,
              requestCount: 1,
              inputTokens: approxInput,
              outputTokens: approxOutput,
              totalTokens: approxInput + approxOutput,
              costUsdCents: estimateCostCents(modelUsed, Number(approxInput), Number(approxOutput)),
            },
            update: {
              requestCount: { increment: 1 },
              inputTokens: { increment: approxInput },
              outputTokens: { increment: approxOutput },
              totalTokens: { increment: approxInput + approxOutput },
              costUsdCents: { increment: estimateCostCents(modelUsed, Number(approxInput), Number(approxOutput)) },
            },
          });

          // ENH-23: Update Oracle streak
          if (userId) {
            updateStreak(userId).catch(err =>
              console.error('[Chat] Failed to update streak (non-fatal):', err)
            );
          }
        } catch (err) {
          console.error('[Chat] Failed to persist assistant message (non-fatal):', err);
        }
      })();
    }
  } catch (error) {
    console.error('[Chat] Error sending message:', error);
    
    // Check if headers already sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing your message',
        },
      });
    } else {
      // Send error via SSE
      res.write(`event: error\ndata: ${JSON.stringify({ 
        message: 'An internal error occurred' 
      })}\n\n`);
      res.end();
    }
  }
}

/**
 * GET /api/v1/chat/sessions
 * List user's chat sessions with optional search
 * US-08: Chat History - Full-text search support
 */
export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, search, archived } = req.query;
    const userLanguage = req.user?.language || 'en';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    // Build where clause — exclude archived by default; include only archived when ?archived=true
    const showArchived = archived === 'true';
    let whereClause: any = { userId, isArchived: showArchived };
    // Map of session_id → matching message content snippet (populated during search)
    const snippetMap = new Map<string, string>();

    // Full-text search on message content (US-08)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();

      // Use PostgreSQL full-text search — returns one matching message per session
      // DISTINCT ON ensures one row per session, ordered by most recent match
      const matchingSessions = await prisma.$queryRaw<{ session_id: string; content: string }[]>`
        SELECT DISTINCT ON (cm.session_id) cm.session_id, cm.content
        FROM chat_messages cm
        INNER JOIN chat_sessions cs ON cm.session_id = cs.id
        WHERE cs.user_id = ${userId}
        AND to_tsvector('simple', cm.content) @@ plainto_tsquery('simple', ${searchTerm})
        ORDER BY cm.session_id, cm.created_at DESC
      `;

      // Build snippet map: extract ~140 chars centred around the matched term
      for (const row of matchingSessions) {
        snippetMap.set(row.session_id, extractSearchSnippet(row.content, searchTerm));
      }

      const sessionIds = matchingSessions.map(s => s.session_id);

      // Also search in session titles
      const titleMatchingSessions = await prisma.chatSession.findMany({
        where: { userId, title: { contains: searchTerm, mode: 'insensitive' } },
        select: { id: true },
      });

      const allMatchingIds = [...new Set([...sessionIds, ...titleMatchingSessions.map(s => s.id)])];

      if (allMatchingIds.length === 0) {
        res.json({
          success: true,
          data: {
            sessions: [],
            pagination: { page: Number(page), limit: Number(limit), total: 0, hasMore: false },
            searchQuery: searchTerm,
          },
        });
        return;
      }

      whereClause = { userId, isArchived: showArchived, id: { in: allMatchingIds } };
    }

    const sessions = await prisma.chatSession.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    const total = await prisma.chatSession.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title,
          isPinned: s.isPinned,
          isArchived: s.isArchived,
          lastMessage: s.messages[0]?.content?.substring(0, 100),
          matchSnippet: snippetMap.get(s.id) ?? null,
          lastMessageAt: s.messages[0]?.createdAt || s.createdAt,
          messageCount: s._count.messages,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          hasMore: total > Number(page) * Number(limit),
        },
        searchQuery: search || null,
      },
    });
  } catch (error) {
    console.error('[Chat] Error listing sessions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list sessions' },
    });
  }
}

/**
 * GET /api/v1/chat/sessions/:id
 * Get a specific chat session with messages
 */
export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: Number(limit),
          ...(before ? { cursor: { id: String(before) }, skip: 1 } : {}),
        },
      },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content,
          metadata: m.metadata,
          createdAt: m.createdAt,
        })),
        hasMore: session.messages.length === Number(limit),
      },
    });
  } catch (error) {
    console.error('[Chat] Error getting session:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get session' },
    });
  }
}

// ENH-09: Varied Oracle greeting pool (language-aware, randomly selected)
const ORACLE_GREETINGS: Record<string, string[]> = {
  bg: [
    'Здравей! Аз съм AstroLogAI, твоят личен астролог. Какво те интересува днес?',
    'Добре дошъл. Звездите слушат — какво искаш да разкриеш?',
    'Небесната карта е отворена. Откъде да започнем?',
    'Оракулът е тук. Попитай какво пазят звездите за теб.',
    'Космосът говори на тези, които слушат. Какво те вълнува?',
  ],
  en: [
    'Hello! I am AstroLogAI, your personal astrologer. What would you like to know today?',
    'Welcome. The stars are listening — what do you wish to explore?',
    'The celestial map is open. Where shall we begin?',
    'The Oracle is here. Ask what the stars hold for you.',
    'The cosmos speaks to those who listen. What is on your mind?',
  ],
};

function getOracleGreeting(language: string): string {
  const lang = language === 'bg' ? 'bg' : 'en';
  const pool = ORACLE_GREETINGS[lang];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * POST /api/v1/chat/sessions
 * Create a new chat session
 */
export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { title, birthProfileId } = req.body;
    const userLanguage = req.user?.language || 'en';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || (userLanguage === 'bg' ? 'Нов разговор' : 'New Conversation'),
        birthProfileId,
      },
    });

    // Register session so invalidateUserSessions can find and delete it
    redisClient.sadd(`user_sessions:${userId}`, session.id).catch(() => {});

    const welcomeMessage = getOracleGreeting(userLanguage);

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
        },
        welcomeMessage: {
          role: 'assistant',
          content: welcomeMessage,
        },
      },
    });
  } catch (error) {
    console.error('[Chat] Error creating session:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create session' },
    });
  }
}

/**
 * DELETE /api/v1/chat/sessions/:id
 * Delete a chat session
 */
export async function deleteSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
      return;
    }

    // US-09: Clear Redis context for this session
    await clearSessionContext(id);

    await prisma.chatSession.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Session deleted successfully' },
    });
  } catch (error) {
    console.error('[Chat] Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete session' },
    });
  }
}

/**
 * POST /api/v1/chat/new
 * Start a new conversation with fresh context
 * US-09: New Conversation - clears session context
 */
export async function startNewConversation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { title, birthProfileId } = req.body;
    const userLanguage = req.user?.language || 'en';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    // Create a new session with fresh context
    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || (userLanguage === 'bg' ? 'Нов разговор' : 'New Conversation'),
        birthProfileId,
      },
    });

    // Register session so invalidateUserSessions can find and delete it
    redisClient.sadd(`user_sessions:${userId}`, session.id).catch(() => {});

    // US-09: Initialize Redis context for the new session
    await storeSessionContext(
      session.id,
      userId,
      [], // No previous messages
      undefined // No summary
    );

    const welcomeMessage = getOracleGreeting(userLanguage);

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
        },
        welcomeMessage: {
          role: 'assistant',
          content: welcomeMessage,
        },
      },
    });
  } catch (error) {
    console.error('[Chat] Error starting new conversation:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to start new conversation' },
    });
  }
}

/**
 * DELETE /api/v1/chat/sessions
 * Clear all chat sessions for the user
 * US-08: Chat History - Clear all history
 */
export async function clearAllSessions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const userLanguage = req.user?.language || 'en';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    // Count sessions before deletion
    const sessionCount = await prisma.chatSession.count({ where: { userId } });

    // Delete all sessions (cascade will delete messages)
    await prisma.chatSession.deleteMany({ where: { userId } });

    // US-09: Clear Redis session contexts
    await clearUserSessionContexts(userId);

    res.json({
      success: true,
      data: {
        message: userLanguage === 'bg' 
          ? `Успешно изтрити ${sessionCount} разговори`
          : `Successfully deleted ${sessionCount} conversations`,
        deletedCount: sessionCount,
      },
    });
  } catch (error) {
    console.error('[Chat] Error clearing all sessions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to clear chat history' },
    });
  }
}

/**
 * PATCH /api/v1/chat/sessions/:id
 * Update a chat session (e.g., rename title)
 * US-08: Chat History - Rename conversation
 */
export async function updateSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, isPinned, isArchived } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    // At least one field must be provided
    if (title === undefined && isPinned === undefined && isArchived === undefined) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } });
      return;
    }

    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title must be a non-empty string' } });
        return;
      }
      data.title = title.trim().substring(0, 100);
    }
    if (isPinned !== undefined) data.isPinned = Boolean(isPinned);
    if (isArchived !== undefined) data.isArchived = Boolean(isArchived);

    const updated = await prisma.chatSession.update({ where: { id }, data });

    res.json({ success: true, data: { session: { id: updated.id, title: updated.title, isPinned: updated.isPinned, isArchived: updated.isArchived, updatedAt: updated.updatedAt } } });
  } catch (error) {
    console.error('[Chat] Error updating session:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update session' } });
  }
}

/**
 * POST /api/v1/chat/sessions/:id/share
 * Generate a public share token for the session
 */
export async function shareSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }); return; }

    // Reuse existing token or generate new one
    const token = session.sharedToken ?? require('crypto').randomBytes(12).toString('hex');
    await prisma.chatSession.update({ where: { id }, data: { sharedToken: token } });

    const frontendUrl = process.env.FRONTEND_URL || 'https://astrologa.bg';
    res.json({ success: true, data: { shareUrl: `${frontendUrl}/share/${token}` } });
  } catch (error) {
    console.error('[Chat] Error sharing session:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to share session' } });
  }
}

/**
 * DELETE /api/v1/chat/sessions/:id/share
 * Revoke the public share token
 */
export async function unshareSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }); return; }

    await prisma.chatSession.update({ where: { id }, data: { sharedToken: null } });
    res.json({ success: true });
  } catch (error) {
    console.error('[Chat] Error unsharing session:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to unshare session' } });
  }
}

/**
 * GET /api/v1/chat/share/:token
 * Public endpoint — returns a shared session's title + messages (no auth required)
 */
export async function getSharedSession(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    const session = await prisma.chatSession.findUnique({
      where: { sharedToken: token },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Shared conversation not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title || 'Oracle conversation',
          createdAt: session.createdAt,
          messages: session.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error('[Chat] Error fetching shared session:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch shared session' } });
  }
}

/**
 * POST /api/v1/chat/sessions/:id/rate
 * Submit a 1-5 star rating for a session (ENH-25)
 */
export async function rateSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { rating } = req.body;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

    const r = parseInt(rating, 10);
    if (!r || r < 1 || r > 5) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Rating must be 1-5' } });
      return;
    }

    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }); return; }

    await prisma.chatSession.update({ where: { id }, data: { rating: r } });
    res.json({ success: true });
  } catch (error) {
    console.error('[Chat] Error rating session:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to rate session' } });
  }
}

/**
 * GET /api/v1/chat/usage
 * Get user's chat usage statistics
 */
export async function getUsage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const userTier = (req.user?.tier as Tier) || 'FREE';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    const stats = await getUserUsageStats(userId, userTier);

    res.json({
      success: true,
      data: {
        tier: userTier,
        usage: stats,
      },
    });
  } catch (error) {
    console.error('[Chat] Error getting usage:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get usage' },
    });
  }
}

/**
 * POST /api/v1/chat/sessions/:id/import
 * Import guest messages into an existing session
 * Used when a guest user registers to migrate their homepage chat
 */
export async function importGuestMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id: sessionId } = req.params;
    const { messages } = req.body as {
      messages: Array<{ role: string; content: string; timestamp?: string }>;
    };

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'messages array required and must not be empty' } });
      return;
    }

    if (messages.length > 50) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot import more than 50 messages at once' } });
      return;
    }

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    // Normalize: 'oracle' → 'ASSISTANT', 'user' → 'USER', skip empty
    const normalizedMsgs = messages
      .filter(m => m.content?.trim())
      .map(m => ({
        sessionId,
        role: (m.role === 'oracle' || m.role === 'assistant') ? 'ASSISTANT' : 'USER',
        content: m.content.trim(),
        ...(m.timestamp ? { createdAt: new Date(m.timestamp) } : {}),
      }));

    if (normalizedMsgs.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid messages to import' } });
      return;
    }

    await prisma.chatMessage.createMany({ data: normalizedMsgs });

    // Update session title if still default
    if (!session.title || session.title === 'New conversation' || session.title === 'Нов разговор') {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: 'My first reading', updatedAt: new Date() },
      });
    }

    console.log(`[Chat] Imported ${normalizedMsgs.length} guest messages into session ${sessionId} for user ${userId}`);

    res.json({ success: true, data: { imported: normalizedMsgs.length, sessionId } });
  } catch (error) {
    console.error('[Chat] Error importing guest messages:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to import guest messages' } });
  }
}

export default {
  sendMessage,
  listSessions,
  getSession,
  createSession,
  deleteSession,
  getUsage,
  shareSession,
  unshareSession,
  getSharedSession,
  rateSession,
};
