"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = sendMessage;
exports.listSessions = listSessions;
exports.getSession = getSession;
exports.createSession = createSession;
exports.deleteSession = deleteSession;
exports.startNewConversation = startNewConversation;
exports.clearAllSessions = clearAllSessions;
exports.updateSession = updateSession;
exports.getUsage = getUsage;
const client_1 = require("@prisma/client");
const redis_1 = require("../utils/redis");
const llm_1 = require("../services/llm");
const transits_1 = require("../services/transits");
const subscription_tiers_1 = require("../config/subscription-tiers");
const prisma = new client_1.PrismaClient();
// ============================================
// Rate Limiting Configuration (US-36, US-37)
// ============================================
// Using centralized subscription-tiers.ts config
// FREE: 10 queries/month, 10/min burst
// PRO: unlimited, 60/min burst
// PREMIUM: unlimited, no burst limit
const RATE_LIMIT_WINDOW = 60; // 1 minute for burst
const MAX_CONTEXT_MESSAGES = 10; // Last 10 messages for context
const SUMMARY_THRESHOLD = 20; // Generate summary after 20 messages
// ============================================
// Helper Functions
// ============================================
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthResetDate() {
    const now = new Date();
    const resetDay = (0, subscription_tiers_1.getMonthlyResetDay)();
    const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    return new Date(nextYear, nextMonth, resetDay);
}
async function checkRateLimit(userId, tier) {
    // Get burst limit from centralized config
    const burstLimit = (0, subscription_tiers_1.getBurstLimit)(tier);
    const isUnlimitedBurstTier = (0, subscription_tiers_1.isUnlimitedBurst)(tier);
    // Burst rate limiting (per minute) - skip for unlimited tiers
    if (!isUnlimitedBurstTier) {
        const burstKey = `ratelimit:burst:${userId}`;
        const burstCount = parseInt(await redis_1.redisClient.get(burstKey) || '0', 10);
        if (burstCount >= burstLimit) {
            return {
                allowed: false,
                remaining: 0,
                limit: burstLimit,
                resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW * 1000)
            };
        }
    }
    // Monthly rate limiting (for FREE tier)
    if (!(0, subscription_tiers_1.isUnlimitedTier)(tier)) {
        const monthlyLimit = (0, subscription_tiers_1.getEffectiveMonthlyLimit)(tier);
        const month = getCurrentMonth();
        const monthKey = `ratelimit:monthly:${userId}:${month}`;
        const monthCount = parseInt(await redis_1.redisClient.get(monthKey) || '0', 10);
        if (monthCount >= monthlyLimit) {
            return {
                allowed: false,
                remaining: 0,
                limit: monthlyLimit,
                resetAt: getMonthResetDate()
            };
        }
        return {
            allowed: true,
            remaining: monthlyLimit - monthCount,
            limit: monthlyLimit
        };
    }
    return {
        allowed: true,
        remaining: Infinity,
        limit: 'unlimited'
    };
}
async function incrementRateLimit(userId) {
    // Increment burst counter
    const burstKey = `ratelimit:burst:${userId}`;
    const burstCount = await redis_1.redisClient.incr(burstKey);
    if (burstCount === 1) {
        await redis_1.redisClient.expire(burstKey, RATE_LIMIT_WINDOW);
    }
    // Increment monthly counter
    const month = getCurrentMonth();
    const monthKey = `ratelimit:monthly:${userId}:${month}`;
    const monthCount = await redis_1.redisClient.incr(monthKey);
    if (monthCount === 1) {
        // Set expiry to end of month
        const ttl = Math.floor((getMonthResetDate().getTime() - Date.now()) / 1000);
        await redis_1.redisClient.expire(monthKey, ttl);
    }
}
async function getOrCreateSession(userId, sessionId, birthProfileId) {
    if (sessionId) {
        // Try to get from Redis first for faster context
        const cachedContext = await (0, redis_1.getSessionContext)(sessionId);
        const existing = await prisma.chatSession.findFirst({
            where: { id: sessionId, userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: MAX_CONTEXT_MESSAGES // Last 10 messages for DB
                }
            },
        });
        if (existing) {
            // Sync Redis context if not present but session exists
            if (!cachedContext && existing.messages.length > 0) {
                const summary = existing.summary || undefined;
                await (0, redis_1.storeSessionContext)(existing.id, userId, existing.messages.map(m => ({ role: m.role.toLowerCase(), content: m.content })), summary || undefined);
            }
            return existing;
        }
    }
    // Create new session
    return prisma.chatSession.create({
        data: {
            userId,
            birthProfileId,
            title: 'Нов разговор', // Will be updated after first message
        },
        include: {
            messages: true
        },
    });
}
// ============================================
// Session Summary Generation (US-09)
// ============================================
async function generateAndStoreSessionSummary(sessionId, userId, allMessages, language) {
    // Generate summary using LLM
    const lang = (language === 'en' ? 'en' : 'bg');
    const summary = await (0, llm_1.generateSessionSummary)(allMessages, lang);
    // Store summary in database
    await prisma.chatSession.update({
        where: { id: sessionId },
        data: { summary },
    });
    // Update Redis context
    await (0, redis_1.updateSessionSummary)(sessionId, summary);
    return summary;
}
// ============================================
// Controller Functions
// ============================================
/**
 * POST /api/v1/chat/message
 * Send a message to the AI astrologer with streaming response
 */
async function sendMessage(req, res) {
    try {
        // US-34: Track latency for response headers
        const startTime = Date.now();
        const { content, sessionId, birthProfileId } = req.body;
        const userId = req.user?.id;
        const userTier = req.user?.tier || 'FREE';
        // US-25: Get from user preferences, ensure valid type
        const userLanguage = (req.user?.language === 'en' ? 'en' : 'bg');
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
        // Check rate limit
        const rateLimit = await checkRateLimit(userId, userTier);
        if (!rateLimit.allowed) {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: userLanguage === 'bg'
                        ? 'Достигнахте лимита на заявките. Моля, опитайте по-късно или надградете плана си.'
                        : 'Rate limit exceeded. Please try again later or upgrade your plan.',
                    limit: rateLimit.limit,
                    remaining: rateLimit.remaining,
                    resetAt: rateLimit.resetAt,
                    upgradeUrl: '/subscription',
                },
            });
            return;
        }
        // Get or create session
        const session = await getOrCreateSession(userId, sessionId, birthProfileId);
        // Get user's birth chart for context
        let chartSummary;
        let rawChartData = null;
        if (session.birthProfileId || birthProfileId) {
            const profileId = session.birthProfileId || birthProfileId;
            const birthProfile = await prisma.birthProfile.findUnique({
                where: { id: profileId },
                include: { birthChart: true },
            });
            if (birthProfile?.birthChart?.chartData) {
                const chart = birthProfile.birthChart.chartData;
                rawChartData = chart;
                chartSummary = (0, llm_1.generateChartSummary)(chart, userLanguage);
            }
        }
        else {
            // Try to get user's primary birth chart
            const userChart = await prisma.birthChart.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
            if (userChart?.chartData) {
                const chart = userChart.chartData;
                rawChartData = chart;
                chartSummary = (0, llm_1.generateChartSummary)(chart, userLanguage);
            }
        }
        // Build messages array for LLM
        const conversationHistory = session.messages.map((msg) => ({
            role: msg.role.toLowerCase(),
            content: msg.content,
        }));
        // US-09: Get session context from Redis for enhanced context
        const sessionContext = await (0, redis_1.getSessionContext)(session.id);
        const sessionSummary = sessionContext?.summary || session.summary || undefined;
        const recentMessages = sessionContext?.recentMessages ||
            session.messages.slice(-MAX_CONTEXT_MESSAGES).map(m => ({
                role: m.role.toLowerCase(),
                content: m.content
            }));
        // Pre-compute active transits for Oracle context (avoids tool calls for this universal data)
        let transitsSummary;
        if (chartSummary && rawChartData) {
            try {
                const { skyPositions, aspectsToNatal, moonPhase } = await transits_1.getActiveTransitsForUser(rawChartData);
                const aspectLines = aspectsToNatal.slice(0, 12).map(a => `- ${a.transitPlanetBg} ${a.aspectBg} natal ${a.natalPlanetBg} | orb ${a.orb}° | ${a.influence} | ${a.description}`).join('\n');
                const skyLines = skyPositions.map(p => `${p.planetBg}: ${p.signBg} ${p.degree}°${p.retrograde ? ' ℞' : ''}`).join(', ');
                transitsSummary = `TODAY'S SKY (${new Date().toISOString().split('T')[0]}):
${skyLines}

Moon: ${moonPhase.phaseBg} (${moonPhase.illumination}% illuminated) in ${moonPhase.moonSignBg}

ACTIVE TRANSITS TO NATAL CHART (sorted by orb — tightest = most powerful):
${aspectLines || 'No major aspects within orb today.'}`;
            }
            catch (err) {
                console.warn('[Chat] Failed to compute active transits for system prompt:', err instanceof Error ? err.message : err);
                // Non-fatal — Oracle continues without transit context
            }
        }
        const systemPrompt = (0, llm_1.buildSystemPrompt)({
            chartSummary,
            transitsSummary,
            language: userLanguage,
            conversationHistory,
            sessionSummary, // US-09: Add session summary for follow-up context
            recentMessages, // US-09: Add recent messages for context
        });
        const messages = [
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
        // Increment rate limit counter
        await incrementRateLimit(userId);
        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        // US-34: Get initial provider info for headers
        const orchestratorStatus = (0, llm_1.getOrchestratorStatus)();
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
        let assistantMessageId;
        let hasError = false;
        try {
            for await (const chunk of (0, llm_1.streamChatCompletion)(messages)) {
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
        }
        catch (streamError) {
            hasError = true;
            const errorMessage = streamError instanceof Error ? streamError.message : 'Streaming error';
            res.write(`event: error\ndata: ${JSON.stringify({
                message: errorMessage
            })}\n\n`);
        }
        // Save assistant response if no error
        if (!hasError && fullResponse) {
            const assistantMessage = await prisma.chatMessage.create({
                data: {
                    sessionId: session.id,
                    role: 'ASSISTANT',
                    content: fullResponse,
                    metadata: {
                        model: process.env.LLM_MODEL || 'glm-5',
                        tokensUsed: Math.ceil(fullResponse.length / 4), // Rough estimate
                    },
                },
            });
            assistantMessageId = assistantMessage.id;
            // Update session updatedAt
            await prisma.chatSession.update({
                where: { id: session.id },
                data: { updatedAt: new Date() },
            });
            // US-09: Update Redis session context with new messages
            const updatedMessages = [
                ...session.messages.map(m => ({ role: m.role.toLowerCase(), content: m.content })),
                { role: 'user', content: content.trim() },
                { role: 'assistant', content: fullResponse },
            ];
            // Get current summary from DB or Redis
            const currentSummary = session.summary ||
                (await (0, redis_1.getSessionContext)(session.id))?.summary || undefined;
            // Store updated context in Redis
            await (0, redis_1.storeSessionContext)(session.id, userId, updatedMessages, currentSummary);
            // US-09: Generate session summary if threshold reached
            const totalMessages = session.messages.length + 2; // +2 for new messages
            if (totalMessages >= SUMMARY_THRESHOLD && !session.summary) {
                // Generate summary in background (non-blocking)
                generateAndStoreSessionSummary(session.id, userId, updatedMessages, userLanguage)
                    .then(summary => {
                    console.log(`[Chat] Session ${session.id} summary generated: ${summary.substring(0, 50)}...`);
                })
                    .catch(err => {
                    console.error('[Chat] Failed to generate session summary:', err);
                });
            }
        }
        // Send completion event
        const latencyMs = Date.now() - startTime;
        const finalStatus = (0, llm_1.getOrchestratorStatus)();
        // US-34: Add latency header
        res.setHeader('X-Latency', `${latencyMs}ms`);
        res.setHeader('X-Provider', finalStatus.activeProvider);
        res.write(`event: complete\ndata: ${JSON.stringify({
            messageId: assistantMessageId,
            content: fullResponse,
            hasError,
            provider: finalStatus.activeProvider,
            latencyMs,
        })}\n\n`);
        res.end();
    }
    catch (error) {
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
        }
        else {
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
async function listSessions(req, res) {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 20, search } = req.query;
        const userLanguage = req.user?.language || 'bg';
        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
            });
            return;
        }
        // Build where clause
        let whereClause = { userId };
        // Full-text search on message content (US-08)
        if (search && typeof search === 'string' && search.trim().length > 0) {
            const searchTerm = search.trim();
            // Use PostgreSQL full-text search via Prisma raw query for better search
            // First find session IDs that contain matching messages
            const matchingSessions = await prisma.$queryRaw `
        SELECT DISTINCT cm.session_id
        FROM chat_messages cm
        INNER JOIN chat_sessions cs ON cm.session_id = cs.id
        WHERE cs.user_id = ${userId}
        AND to_tsvector('simple', cm.content) @@ plainto_tsquery('simple', ${searchTerm})
        ORDER BY cm.session_id
      `;
            const sessionIds = matchingSessions.map(s => s.session_id);
            // Also search in session titles
            const titleMatchingSessions = await prisma.chatSession.findMany({
                where: {
                    userId,
                    title: { contains: searchTerm, mode: 'insensitive' },
                },
                select: { id: true },
            });
            const titleSessionIds = titleMatchingSessions.map(s => s.id);
            // Combine both sets
            const allMatchingIds = [...new Set([...sessionIds, ...titleSessionIds])];
            if (allMatchingIds.length === 0) {
                // No matches found
                res.json({
                    success: true,
                    data: {
                        sessions: [],
                        pagination: {
                            page: Number(page),
                            limit: Number(limit),
                            total: 0,
                            hasMore: false,
                        },
                        searchQuery: searchTerm,
                    },
                });
                return;
            }
            whereClause = { userId, id: { in: allMatchingIds } };
        }
        const sessions = await prisma.chatSession.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
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
                    lastMessage: s.messages[0]?.content?.substring(0, 100),
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
    }
    catch (error) {
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
async function getSession(req, res) {
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
    }
    catch (error) {
        console.error('[Chat] Error getting session:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to get session' },
        });
    }
}
/**
 * POST /api/v1/chat/sessions
 * Create a new chat session
 */
async function createSession(req, res) {
    try {
        const userId = req.user?.id;
        const { title, birthProfileId } = req.body;
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
                title: title || 'Нов разговор',
                birthProfileId,
            },
        });
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
                    content: 'Здравей! Аз съм AstroLogAI, твоят личен астролог. Какво те интересува днес?',
                },
            },
        });
    }
    catch (error) {
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
async function deleteSession(req, res) {
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
        await (0, redis_1.clearSessionContext)(id);
        await prisma.chatSession.delete({ where: { id } });
        res.json({
            success: true,
            data: { message: 'Session deleted successfully' },
        });
    }
    catch (error) {
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
async function startNewConversation(req, res) {
    try {
        const userId = req.user?.id;
        const { title, birthProfileId } = req.body;
        const userLanguage = req.user?.language || 'bg';
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
                title: title || 'Нов разговор',
                birthProfileId,
            },
        });
        // US-09: Initialize Redis context for the new session
        await (0, redis_1.storeSessionContext)(session.id, userId, [], // No previous messages
        undefined // No summary
        );
        const welcomeMessage = userLanguage === 'bg'
            ? 'Здравей! Аз съм AstroLogAI, твоят личен астролог. Какво те интересува днес?'
            : 'Hello! I am AstroLogAI, your personal astrologer. What would you like to know today?';
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
    }
    catch (error) {
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
async function clearAllSessions(req, res) {
    try {
        const userId = req.user?.id;
        const userLanguage = req.user?.language || 'bg';
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
        // Clear rate limit counters for the month
        const month = getCurrentMonth();
        const monthKey = `ratelimit:monthly:${userId}:${month}`;
        await redis_1.redisClient.del(monthKey);
        // US-09: Clear Redis session contexts
        await (0, redis_1.clearUserSessionContexts)(userId);
        res.json({
            success: true,
            data: {
                message: userLanguage === 'bg'
                    ? `Успешно изтрити ${sessionCount} разговори`
                    : `Successfully deleted ${sessionCount} conversations`,
                deletedCount: sessionCount,
            },
        });
    }
    catch (error) {
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
async function updateSession(req, res) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { title } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
            });
            return;
        }
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Title is required' },
            });
            return;
        }
        // Verify session belongs to user
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
        // Update title
        const updated = await prisma.chatSession.update({
            where: { id },
            data: { title: title.trim().substring(0, 100) },
        });
        res.json({
            success: true,
            data: {
                session: {
                    id: updated.id,
                    title: updated.title,
                    updatedAt: updated.updatedAt,
                },
            },
        });
    }
    catch (error) {
        console.error('[Chat] Error updating session:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update session' },
        });
    }
}
/**
 * GET /api/v1/chat/usage
 * Get user's chat usage statistics
 */
async function getUsage(req, res) {
    try {
        const userId = req.user?.id;
        const userTier = req.user?.tier || 'FREE';
        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
            });
            return;
        }
        const limits = (0, subscription_tiers_1.getTierLimits)(userTier);
        const month = getCurrentMonth();
        const monthKey = `ratelimit:monthly:${userId}:${month}`;
        const used = parseInt(await redis_1.redisClient.get(monthKey) || '0', 10);
        const remaining = limits.monthlyQueries === Infinity ? Infinity : limits.monthlyQueries - used;
        res.json({
            success: true,
            data: {
                tier: userTier,
                usage: {
                    used,
                    limit: limits.monthlyQueries === Infinity ? 'unlimited' : limits.monthlyQueries,
                    remaining: remaining === Infinity ? 'unlimited' : remaining,
                    resetAt: getMonthResetDate(),
                },
            },
        });
    }
    catch (error) {
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
async function importGuestMessages(req, res) {
    try {
        const userId = req.user?.id;
        const { id: sessionId } = req.params;
        const { messages } = req.body;
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
    }
    catch (error) {
        console.error('[Chat] Error importing guest messages:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to import guest messages' } });
    }
}
exports.importGuestMessages = importGuestMessages;
exports.default = {
    sendMessage,
    listSessions,
    getSession,
    createSession,
    deleteSession,
    getUsage,
};
//# sourceMappingURL=chatController.js.map