"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var chatController_exports = {};
__export(chatController_exports, {
  clearAllSessions: () => clearAllSessions,
  createSession: () => createSession,
  default: () => chatController_default,
  deleteSession: () => deleteSession,
  getSession: () => getSession,
  getSharedSession: () => getSharedSession,
  getUsage: () => getUsage,
  importGuestMessages: () => importGuestMessages,
  listSessions: () => listSessions,
  rateSession: () => rateSession,
  sendMessage: () => sendMessage,
  shareSession: () => shareSession,
  startNewConversation: () => startNewConversation,
  unshareSession: () => unshareSession,
  updateSession: () => updateSession
});
module.exports = __toCommonJS(chatController_exports);
var import_client = require("@prisma/client");
var import_redis = require("../utils/redis");
var import_llm = require("../services/llm");
var import_transits = require("../services/transits");
var import_queryLimit = require("../middleware/queryLimit");
var import_streakService = require("../services/streakService");
var import_credits = require("../services/credits");
var import_memory_retrieval = require("../services/memory-retrieval");
const prisma = new import_client.PrismaClient();
function extractSearchSnippet(content, term, maxLen = 140) {
  const idx = content.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return content.length > maxLen ? content.substring(0, maxLen) + "\u2026" : content;
  const start = Math.max(0, idx - 50);
  const end = Math.min(content.length, idx + term.length + 90);
  let snippet = content.substring(start, end);
  if (start > 0) snippet = "\u2026" + snippet;
  if (end < content.length) snippet += "\u2026";
  return snippet;
}
const MAX_CONTEXT_MESSAGES = 10;
const SUMMARY_THRESHOLD = 20;
function estimateCostCents(model, inputTokens, outputTokens) {
  const isHaiku = model.includes("haiku");
  const isOpus = model.includes("opus");
  const inputRate = isHaiku ? 0.025 : isOpus ? 1.5 : 0.3;
  const outputRate = isHaiku ? 0.125 : isOpus ? 7.5 : 1.5;
  return Math.round(inputTokens / 1e3 * inputRate + outputTokens / 1e3 * outputRate);
}
async function getOrCreateSession(userId, sessionId, birthProfileId, language = "en") {
  if (sessionId) {
    const cachedContext = await (0, import_redis.getSessionContext)(sessionId);
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: MAX_CONTEXT_MESSAGES
          // Last 10 messages for DB
        }
      }
    });
    if (existing) {
      if (!cachedContext && existing.messages.length > 0) {
        const summary = existing.summary || void 0;
        await (0, import_redis.storeSessionContext)(
          existing.id,
          userId,
          existing.messages.map((m) => ({ role: m.role.toLowerCase(), content: m.content })),
          summary || void 0
        );
      }
      return existing;
    }
  }
  return prisma.chatSession.create({
    data: {
      userId,
      birthProfileId,
      title: language === "bg" ? "\u041D\u043E\u0432 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440" : "New Conversation"
    },
    include: {
      messages: true
    }
  });
}
async function generateAndStoreSessionSummary(sessionId, userId, allMessages, language) {
  const lang = language === "en" ? "en" : "bg";
  const summary = await (0, import_llm.generateSessionSummary)(allMessages, lang);
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { summary }
  });
  await (0, import_redis.updateSessionSummary)(sessionId, summary);
  return summary;
}
async function sendMessage(req, res) {
  try {
    const startTime = Date.now();
    const { content, sessionId, birthProfileId, creditAction } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email || "";
    const userTier = req.user?.tier || "FREE";
    const userLanguage = req.user?.language === "bg" ? "bg" : "en";
    const isAdmin = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).includes(userEmail);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Message content is required" }
      });
      return;
    }
    const session = await getOrCreateSession(userId, sessionId, birthProfileId, userLanguage);
    const TIER_ORDER = { FREE: 0, PRO: 1, PREMIUM: 2 };
    const CREDIT_ACTION_TIER = {
      oracle_sonnet: "PRO",
      oracle_opus: "PREMIUM"
    };
    const CREDIT_ACTION_COST = {
      oracle_sonnet: 2,
      oracle_opus: 4
    };
    let effectiveTier = userTier;
    let creditDeducted = false;
    if (session.creditTier) {
      effectiveTier = session.creditTier;
    } else if (creditAction && CREDIT_ACTION_TIER[creditAction] && session.messages.length === 0) {
      const requestedTier = CREDIT_ACTION_TIER[creditAction];
      if ((TIER_ORDER[requestedTier] ?? 0) > (TIER_ORDER[userTier] ?? 0)) {
        try {
          await prisma.userCredits.upsert({
            where: { userId },
            create: { userId },
            update: {}
          });
          await (0, import_credits.deductCredits)(
            userId,
            CREDIT_ACTION_COST[creditAction],
            `Oracle session (${creditAction})`,
            "oracle_session",
            session.id
          );
          creditDeducted = true;
          effectiveTier = requestedTier;
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { creditTier: requestedTier }
          });
        } catch (creditErr) {
          if (creditErr?.code === "INSUFFICIENT_CREDITS") {
            res.status(402).json({
              success: false,
              error: {
                code: "INSUFFICIENT_CREDITS",
                message: "Insufficient credits for this Oracle session",
                required: creditErr.required,
                available: creditErr.available
              }
            });
            return;
          }
          throw creditErr;
        }
      }
    }
    let chartSummary;
    let rawChartData = null;
    if (session.birthProfileId || birthProfileId) {
      const profileId = session.birthProfileId || birthProfileId;
      const birthProfile = await prisma.birthProfile.findUnique({
        where: { id: profileId },
        include: { birthChart: true }
      });
      if (birthProfile?.birthChart?.chartData) {
        const chart = birthProfile.birthChart.chartData;
        rawChartData = chart;
        chartSummary = (0, import_llm.generateChartSummary)(chart, userLanguage);
      }
    } else {
      const userChart = await prisma.birthChart.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      if (userChart?.chartData) {
        const chart = userChart.chartData;
        rawChartData = chart;
        chartSummary = (0, import_llm.generateChartSummary)(chart, userLanguage);
      }
    }
    const conversationHistory = session.messages.map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content
    }));
    const sessionContext = await (0, import_redis.getSessionContext)(session.id);
    const sessionSummary = sessionContext?.summary || session.summary || void 0;
    const recentMessages = sessionContext?.recentMessages || session.messages.slice(-MAX_CONTEXT_MESSAGES).map((m) => ({
      role: m.role.toLowerCase(),
      content: m.content
    }));
    let transitsSummary;
    if (chartSummary && rawChartData) {
      try {
        const { skyPositions, aspectsToNatal, moonPhase } = await (0, import_transits.getActiveTransitsForUser)(rawChartData);
        const aspectLines = aspectsToNatal.slice(0, 12).map(
          (a) => `- ${a.transitPlanetBg} ${a.aspectBg} natal ${a.natalPlanetBg} | orb ${a.orb}\xB0 | ${a.influence} | ${a.description}`
        ).join("\n");
        const skyLines = skyPositions.map(
          (p) => `${p.planetBg}: ${p.signBg} ${p.degree}\xB0${p.retrograde ? " \u211E" : ""}`
        ).join(", ");
        transitsSummary = `TODAY'S SKY (${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}):
${skyLines}

Moon: ${moonPhase.phaseBg} (${moonPhase.illumination}% illuminated) in ${moonPhase.moonSignBg}

ACTIVE TRANSITS TO NATAL CHART (sorted by orb \u2014 tightest = most powerful):
${aspectLines || "No major aspects within orb today."}`;
      } catch (err) {
        console.warn("[Chat] Failed to compute active transits for system prompt:", err instanceof Error ? err.message : err);
      }
    }
    const memories = await (0, import_memory_retrieval.retrieveOracleMemories)(userId, content.trim(), effectiveTier);
    const systemPrompt = await (0, import_llm.buildSystemPrompt)({
      chartSummary,
      transitsSummary,
      language: userLanguage,
      conversationHistory,
      sessionSummary,
      // US-09: Add session summary for follow-up context
      recentMessages,
      // US-09: Add recent messages for context
      memories,
      tier: effectiveTier
    });
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: content.trim() }
    ];
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: content.trim()
      }
    });
    if (session.messages.length === 0) {
      const title = content.trim().substring(0, 50) + (content.length > 50 ? "..." : "");
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { title }
      });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });
    const orchestratorStatus = (0, import_llm.getOrchestratorStatus)();
    res.setHeader("X-Provider", orchestratorStatus.activeProvider);
    res.write(`event: metadata
data: ${JSON.stringify({
      sessionId: session.id,
      messageId: userMessage.id,
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        limit: rateLimit.limit
      }
    })}

`);
    let fullResponse = "";
    let assistantMessageId;
    let hasError = false;
    try {
      for await (const chunk of (0, import_llm.streamChatCompletion)(messages, {
        tier: effectiveTier,
        userId,
        userIp: req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      })) {
        if (aborted) break;
        if (chunk.error) {
          hasError = true;
          res.write(`event: error
data: ${JSON.stringify({
            message: chunk.error
          })}

`);
          break;
        }
        fullResponse += chunk.content;
        res.write(`event: chunk
data: ${JSON.stringify({
          content: chunk.content,
          done: chunk.done
        })}

`);
        if (chunk.done) {
          break;
        }
      }
    } catch (streamError) {
      hasError = true;
      const errorMessage = streamError instanceof Error ? streamError.message : "Streaming error";
      res.write(`event: error
data: ${JSON.stringify({
        message: errorMessage
      })}

`);
    }
    if (hasError && creditDeducted) {
      (0, import_credits.refundCredits)(userId, CREDIT_ACTION_COST[creditAction], `Auto-refund: LLM error for ${creditAction}`, "oracle_session", session.id).catch((err) => console.error("[Chat] Credit refund failed (non-fatal):", err));
      prisma.chatSession.update({ where: { id: session.id }, data: { creditTier: null } }).catch(() => {
      });
    }
    const latencyMs = Date.now() - startTime;
    const finalStatus = (0, import_llm.getOrchestratorStatus)();
    let dailyLimitReached = false;
    if (!hasError && fullResponse && userTier === "FREE" && !isAdmin && userId) {
      try {
        const [newCount, limit] = await Promise.all([
          (0, import_queryLimit.incrementDailyQuery)(userId),
          (0, import_queryLimit.getFreeTierDailyQueryLimit)()
        ]);
        if (newCount >= limit) {
          dailyLimitReached = true;
        }
      } catch (err) {
        console.error("[Chat] Failed to update daily query counter (non-fatal):", err);
      }
    }
    res.write(`event: complete
data: ${JSON.stringify({
      messageId: assistantMessageId,
      content: fullResponse,
      hasError,
      provider: finalStatus.activeProvider,
      latencyMs,
      dailyLimitReached
    })}

`);
    res.end();
    if (!hasError && fullResponse) {
      (async () => {
        try {
          const assistantMessage = await prisma.chatMessage.create({
            data: {
              sessionId: session.id,
              role: "ASSISTANT",
              content: fullResponse,
              metadata: {
                model: process.env.LLM_MODEL || "glm-5",
                tokensUsed: Math.ceil(fullResponse.length / 4)
              }
            }
          });
          assistantMessageId = assistantMessage.id;
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { updatedAt: /* @__PURE__ */ new Date() }
          });
          const updatedMessages = [
            ...session.messages.map((m) => ({ role: m.role.toLowerCase(), content: m.content })),
            { role: "user", content: content.trim() },
            { role: "assistant", content: fullResponse }
          ];
          const currentSummary = session.summary || (await (0, import_redis.getSessionContext)(session.id))?.summary || void 0;
          await (0, import_redis.storeSessionContext)(session.id, userId, updatedMessages, currentSummary);
          const totalMessages = session.messages.length + 2;
          if (totalMessages >= SUMMARY_THRESHOLD && !session.summary) {
            generateAndStoreSessionSummary(session.id, userId, updatedMessages, userLanguage).then((summary) => {
              console.log(`[Chat] Session ${session.id} summary generated: ${summary.substring(0, 50)}...`);
            }).catch((err) => {
              console.error("[Chat] Failed to generate session summary:", err);
            });
          }
          const modelUsed = process.env.LLM_MODEL || "unknown";
          const today = /* @__PURE__ */ new Date();
          today.setHours(0, 0, 0, 0);
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
              costUsdCents: estimateCostCents(modelUsed, Number(approxInput), Number(approxOutput))
            },
            update: {
              requestCount: { increment: 1 },
              inputTokens: { increment: approxInput },
              outputTokens: { increment: approxOutput },
              totalTokens: { increment: approxInput + approxOutput },
              costUsdCents: { increment: estimateCostCents(modelUsed, Number(approxInput), Number(approxOutput)) }
            }
          });
          if (userId) {
            (0, import_streakService.updateStreak)(userId).catch(
              (err) => console.error("[Chat] Failed to update streak (non-fatal):", err)
            );
          }
        } catch (err) {
          console.error("[Chat] Failed to persist assistant message (non-fatal):", err);
        }
      })();
    }
  } catch (error) {
    console.error("[Chat] Error sending message:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while processing your message"
        }
      });
    } else {
      res.write(`event: error
data: ${JSON.stringify({
        message: "An internal error occurred"
      })}

`);
      res.end();
    }
  }
}
async function listSessions(req, res) {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, search, archived } = req.query;
    const userLanguage = req.user?.language || "en";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const showArchived = archived === "true";
    let whereClause = { userId, isArchived: showArchived };
    const snippetMap = /* @__PURE__ */ new Map();
    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchTerm = search.trim();
      const matchingSessions = await prisma.$queryRaw`
        SELECT DISTINCT ON (cm.session_id) cm.session_id, cm.content
        FROM chat_messages cm
        INNER JOIN chat_sessions cs ON cm.session_id = cs.id
        WHERE cs.user_id = ${userId}
        AND to_tsvector('simple', cm.content) @@ plainto_tsquery('simple', ${searchTerm})
        ORDER BY cm.session_id, cm.created_at DESC
      `;
      for (const row of matchingSessions) {
        snippetMap.set(row.session_id, extractSearchSnippet(row.content, searchTerm));
      }
      const sessionIds = matchingSessions.map((s) => s.session_id);
      const titleMatchingSessions = await prisma.chatSession.findMany({
        where: { userId, title: { contains: searchTerm, mode: "insensitive" } },
        select: { id: true }
      });
      const allMatchingIds = [.../* @__PURE__ */ new Set([...sessionIds, ...titleMatchingSessions.map((s) => s.id)])];
      if (allMatchingIds.length === 0) {
        res.json({
          success: true,
          data: {
            sessions: [],
            pagination: { page: Number(page), limit: Number(limit), total: 0, hasMore: false },
            searchQuery: searchTerm
          }
        });
        return;
      }
      whereClause = { userId, isArchived: showArchived, id: { in: allMatchingIds } };
    }
    const sessions = await prisma.chatSession.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } }
      }
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
          updatedAt: s.updatedAt
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          hasMore: total > Number(page) * Number(limit)
        },
        searchQuery: search || null
      }
    });
  } catch (error) {
    console.error("[Chat] Error listing sessions:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to list sessions" }
    });
  }
}
async function getSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { before, limit = 50 } = req.query;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: Number(limit),
          ...before ? { cursor: { id: String(before) }, skip: 1 } : {}
        }
      }
    });
    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" }
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
          updatedAt: session.updatedAt
        },
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content,
          metadata: m.metadata,
          createdAt: m.createdAt
        })),
        hasMore: session.messages.length === Number(limit)
      }
    });
  } catch (error) {
    console.error("[Chat] Error getting session:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to get session" }
    });
  }
}
const ORACLE_GREETINGS = {
  bg: [
    "\u0417\u0434\u0440\u0430\u0432\u0435\u0439! \u0410\u0437 \u0441\u044A\u043C AstroLogAI, \u0442\u0432\u043E\u044F\u0442 \u043B\u0438\u0447\u0435\u043D \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u041A\u0430\u043A\u0432\u043E \u0442\u0435 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u0443\u0432\u0430 \u0434\u043D\u0435\u0441?",
    "\u0414\u043E\u0431\u0440\u0435 \u0434\u043E\u0448\u044A\u043B. \u0417\u0432\u0435\u0437\u0434\u0438\u0442\u0435 \u0441\u043B\u0443\u0448\u0430\u0442 \u2014 \u043A\u0430\u043A\u0432\u043E \u0438\u0441\u043A\u0430\u0448 \u0434\u0430 \u0440\u0430\u0437\u043A\u0440\u0438\u0435\u0448?",
    "\u041D\u0435\u0431\u0435\u0441\u043D\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u0435 \u043E\u0442\u0432\u043E\u0440\u0435\u043D\u0430. \u041E\u0442\u043A\u044A\u0434\u0435 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0435\u043C?",
    "\u041E\u0440\u0430\u043A\u0443\u043B\u044A\u0442 \u0435 \u0442\u0443\u043A. \u041F\u043E\u043F\u0438\u0442\u0430\u0439 \u043A\u0430\u043A\u0432\u043E \u043F\u0430\u0437\u044F\u0442 \u0437\u0432\u0435\u0437\u0434\u0438\u0442\u0435 \u0437\u0430 \u0442\u0435\u0431.",
    "\u041A\u043E\u0441\u043C\u043E\u0441\u044A\u0442 \u0433\u043E\u0432\u043E\u0440\u0438 \u043D\u0430 \u0442\u0435\u0437\u0438, \u043A\u043E\u0438\u0442\u043E \u0441\u043B\u0443\u0448\u0430\u0442. \u041A\u0430\u043A\u0432\u043E \u0442\u0435 \u0432\u044A\u043B\u043D\u0443\u0432\u0430?"
  ],
  en: [
    "Hello! I am AstroLogAI, your personal astrologer. What would you like to know today?",
    "Welcome. The stars are listening \u2014 what do you wish to explore?",
    "The celestial map is open. Where shall we begin?",
    "The Oracle is here. Ask what the stars hold for you.",
    "The cosmos speaks to those who listen. What is on your mind?"
  ]
};
function getOracleGreeting(language) {
  const lang = language === "bg" ? "bg" : "en";
  const pool = ORACLE_GREETINGS[lang];
  return pool[Math.floor(Math.random() * pool.length)];
}
async function createSession(req, res) {
  try {
    const userId = req.user?.id;
    const { title, birthProfileId } = req.body;
    const userLanguage = req.user?.language || "en";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || (userLanguage === "bg" ? "\u041D\u043E\u0432 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440" : "New Conversation"),
        birthProfileId
      }
    });
    import_redis.redisClient.sadd(`user_sessions:${userId}`, session.id).catch(() => {
    });
    const welcomeMessage = getOracleGreeting(userLanguage);
    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt
        },
        welcomeMessage: {
          role: "assistant",
          content: welcomeMessage
        }
      }
    });
  } catch (error) {
    console.error("[Chat] Error creating session:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create session" }
    });
  }
}
async function deleteSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const session = await prisma.chatSession.findFirst({
      where: { id, userId }
    });
    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" }
      });
      return;
    }
    await (0, import_redis.clearSessionContext)(id);
    await prisma.chatSession.delete({ where: { id } });
    res.json({
      success: true,
      data: { message: "Session deleted successfully" }
    });
  } catch (error) {
    console.error("[Chat] Error deleting session:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete session" }
    });
  }
}
async function startNewConversation(req, res) {
  try {
    const userId = req.user?.id;
    const { title, birthProfileId } = req.body;
    const userLanguage = req.user?.language || "en";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || (userLanguage === "bg" ? "\u041D\u043E\u0432 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440" : "New Conversation"),
        birthProfileId
      }
    });
    import_redis.redisClient.sadd(`user_sessions:${userId}`, session.id).catch(() => {
    });
    await (0, import_redis.storeSessionContext)(
      session.id,
      userId,
      [],
      // No previous messages
      void 0
      // No summary
    );
    const welcomeMessage = getOracleGreeting(userLanguage);
    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt
        },
        welcomeMessage: {
          role: "assistant",
          content: welcomeMessage
        }
      }
    });
  } catch (error) {
    console.error("[Chat] Error starting new conversation:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to start new conversation" }
    });
  }
}
async function clearAllSessions(req, res) {
  try {
    const userId = req.user?.id;
    const userLanguage = req.user?.language || "en";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const sessionCount = await prisma.chatSession.count({ where: { userId } });
    await prisma.chatSession.deleteMany({ where: { userId } });
    await (0, import_redis.clearUserSessionContexts)(userId);
    res.json({
      success: true,
      data: {
        message: userLanguage === "bg" ? `\u0423\u0441\u043F\u0435\u0448\u043D\u043E \u0438\u0437\u0442\u0440\u0438\u0442\u0438 ${sessionCount} \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0438` : `Successfully deleted ${sessionCount} conversations`,
        deletedCount: sessionCount
      }
    });
  } catch (error) {
    console.error("[Chat] Error clearing all sessions:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to clear chat history" }
    });
  }
}
async function updateSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, isPinned, isArchived } = req.body;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User not authenticated" } });
      return;
    }
    if (title === void 0 && isPinned === void 0 && isArchived === void 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "No fields to update" } });
      return;
    }
    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Session not found" } });
      return;
    }
    const data = {};
    if (title !== void 0) {
      if (typeof title !== "string" || title.trim().length === 0) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Title must be a non-empty string" } });
        return;
      }
      data.title = title.trim().substring(0, 100);
    }
    if (isPinned !== void 0) data.isPinned = Boolean(isPinned);
    if (isArchived !== void 0) data.isArchived = Boolean(isArchived);
    const updated = await prisma.chatSession.update({ where: { id }, data });
    res.json({ success: true, data: { session: { id: updated.id, title: updated.title, isPinned: updated.isPinned, isArchived: updated.isArchived, updatedAt: updated.updatedAt } } });
  } catch (error) {
    console.error("[Chat] Error updating session:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update session" } });
  }
}
async function shareSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      return;
    }
    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Session not found" } });
      return;
    }
    const token = session.sharedToken ?? require("crypto").randomBytes(12).toString("hex");
    await prisma.chatSession.update({ where: { id }, data: { sharedToken: token } });
    const frontendUrl = process.env.FRONTEND_URL || "https://astrologa.bg";
    res.json({ success: true, data: { shareUrl: `${frontendUrl}/share/${token}` } });
  } catch (error) {
    console.error("[Chat] Error sharing session:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to share session" } });
  }
}
async function unshareSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      return;
    }
    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Session not found" } });
      return;
    }
    await prisma.chatSession.update({ where: { id }, data: { sharedToken: null } });
    res.json({ success: true });
  } catch (error) {
    console.error("[Chat] Error unsharing session:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to unshare session" } });
  }
}
async function getSharedSession(req, res) {
  try {
    const { token } = req.params;
    const session = await prisma.chatSession.findUnique({
      where: { sharedToken: token },
      include: {
        messages: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!session) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Shared conversation not found" } });
      return;
    }
    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title || "Oracle conversation",
          createdAt: session.createdAt,
          messages: session.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt
          }))
        }
      }
    });
  } catch (error) {
    console.error("[Chat] Error fetching shared session:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch shared session" } });
  }
}
async function rateSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { rating } = req.body;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      return;
    }
    const r = parseInt(rating, 10);
    if (!r || r < 1 || r > 5) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Rating must be 1-5" } });
      return;
    }
    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Session not found" } });
      return;
    }
    await prisma.chatSession.update({ where: { id }, data: { rating: r } });
    res.json({ success: true });
  } catch (error) {
    console.error("[Chat] Error rating session:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to rate session" } });
  }
}
async function getUsage(req, res) {
  try {
    const userId = req.user?.id;
    const userTier = req.user?.tier || "FREE";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const stats = await (0, import_queryLimit.getUserUsageStats)(userId, userTier);
    res.json({
      success: true,
      data: {
        tier: userTier,
        usage: stats
      }
    });
  } catch (error) {
    console.error("[Chat] Error getting usage:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to get usage" }
    });
  }
}
async function importGuestMessages(req, res) {
  try {
    const userId = req.user?.id;
    const { id: sessionId } = req.params;
    const { messages } = req.body;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User not authenticated" } });
      return;
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "messages array required and must not be empty" } });
      return;
    }
    if (messages.length > 50) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Cannot import more than 50 messages at once" } });
      return;
    }
    const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Session not found" } });
      return;
    }
    const normalizedMsgs = messages.filter((m) => m.content?.trim()).map((m) => ({
      sessionId,
      role: m.role === "oracle" || m.role === "assistant" ? "ASSISTANT" : "USER",
      content: m.content.trim(),
      ...m.timestamp ? { createdAt: new Date(m.timestamp) } : {}
    }));
    if (normalizedMsgs.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "No valid messages to import" } });
      return;
    }
    await prisma.chatMessage.createMany({ data: normalizedMsgs });
    if (!session.title || session.title === "New conversation" || session.title === "\u041D\u043E\u0432 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440") {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: "My first reading", updatedAt: /* @__PURE__ */ new Date() }
      });
    }
    console.log(`[Chat] Imported ${normalizedMsgs.length} guest messages into session ${sessionId} for user ${userId}`);
    res.json({ success: true, data: { imported: normalizedMsgs.length, sessionId } });
  } catch (error) {
    console.error("[Chat] Error importing guest messages:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to import guest messages" } });
  }
}
var chatController_default = {
  sendMessage,
  listSessions,
  getSession,
  createSession,
  deleteSession,
  getUsage,
  shareSession,
  unshareSession,
  getSharedSession,
  rateSession
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clearAllSessions,
  createSession,
  deleteSession,
  getSession,
  getSharedSession,
  getUsage,
  importGuestMessages,
  listSessions,
  rateSession,
  sendMessage,
  shareSession,
  startNewConversation,
  unshareSession,
  updateSession
});
