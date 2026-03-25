"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var admin_exports = {};
__export(admin_exports, {
  default: () => admin_default
});
module.exports = __toCommonJS(admin_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_adminAuth = require("../middleware/adminAuth");
var import_prisma = require("../utils/prisma");
var import_stripe = __toESM(require("stripe"));
var import_cost_calculator = require("../services/cost-calculator");
const router = (0, import_express.Router)();
router.use(import_auth.authMiddleware);
router.use(import_adminAuth.adminAuthMiddleware);
function parseDateRange(query) {
  const now = /* @__PURE__ */ new Date();
  const end = query.endDate ? new Date(query.endDate) : now;
  const start = query.startDate ? new Date(query.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function estimateCostEurCents(inputTokens, outputTokens, model) {
  const rates = {
    "claude-haiku": { input: 0.23, output: 1.15 },
    "claude-sonnet": { input: 2.76, output: 13.8 },
    "claude-opus": { input: 13.8, output: 69 },
    "gpt-4o-mini": { input: 0.14, output: 0.55 },
    "gpt-4o": { input: 4.6, output: 13.8 }
  };
  const key = Object.keys(rates).find((k) => model.includes(k.replace("claude-", "").replace("gpt-", ""))) || (model.includes("haiku") ? "claude-haiku" : model.includes("sonnet") ? "claude-sonnet" : model.includes("opus") ? "claude-opus" : null);
  if (!key) return 0;
  const rate = rates[key];
  const costEur = inputTokens / 1e6 * rate.input + outputTokens / 1e6 * rate.output;
  return Math.round(costEur * 100);
}
const DEFAULT_PROMPTS = [
  { name: "master", label: "Master Prompt", content: "" },
  // content seeded from llm-helpers on first save
  { name: "free_addon", label: "Free Tier Addon", content: "" },
  { name: "pro_addon", label: "Pro Tier Addon", content: "" },
  { name: "premium_addon", label: "Premium Tier Addon", content: "" },
  { name: "forecast", label: "Forecast Prompt", content: "" },
  { name: "compatibility", label: "Compatibility Prompt", content: "" }
];
async function ensureDefaultPrompts() {
  for (const p of DEFAULT_PROMPTS) {
    await import_prisma.prisma.systemPrompt.upsert({
      where: { name: p.name },
      create: { name: p.name, label: p.label, content: p.content, version: 1 },
      update: {}
    });
  }
}
router.get("/overview", async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const [totalUsers, tierCounts, newSignups, paidSubs, failedPayments] = await Promise.all([
      import_prisma.prisma.user.count(),
      import_prisma.prisma.user.groupBy({ by: ["tier"], _count: { id: true } }),
      import_prisma.prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      import_prisma.prisma.subscription.findMany({
        where: { status: "ACTIVE", tier: { in: ["PRO", "PREMIUM"] } },
        select: { tier: true }
      }),
      import_prisma.prisma.subscription.findMany({
        where: { status: "PAST_DUE" },
        select: { userId: true, tier: true, currentPeriodEnd: true },
        take: 10
      })
    ]);
    const tierMap = { FREE: 0, PRO: 0, PREMIUM: 0 };
    tierCounts.forEach((t) => {
      tierMap[t.tier] = t._count.id;
    });
    const mrrCents = paidSubs.reduce((sum, s) => sum + (s.tier === "PRO" ? 1e3 : 2e3), 0);
    const conversionRate = totalUsers > 0 ? ((tierMap.PRO + tierMap.PREMIUM) / totalUsers * 100).toFixed(1) : "0.0";
    const dailySignups = await import_prisma.prisma.$queryRaw`
      SELECT DATE("created_at") as day, COUNT(*) as count
      FROM users
      WHERE "created_at" >= ${start} AND "created_at" <= ${end}
      GROUP BY DATE("created_at")
      ORDER BY day ASC
    `;
    const failedUserIds = failedPayments.map((f) => f.userId);
    const failedUsers = failedUserIds.length > 0 ? await import_prisma.prisma.user.findMany({
      where: { id: { in: failedUserIds } },
      select: { id: true, email: true, tier: true }
    }) : [];
    const failedPaymentDetails = failedPayments.map((f) => {
      const u = failedUsers.find((u2) => u2.id === f.userId);
      const daysPastDue = f.currentPeriodEnd ? Math.floor((Date.now() - new Date(f.currentPeriodEnd).getTime()) / (1e3 * 60 * 60 * 24)) : null;
      return {
        email: u?.email ?? "Unknown",
        tier: f.tier,
        amount: f.tier === "PRO" ? 10 : 20,
        daysPastDue
      };
    });
    res.json({
      success: true,
      data: {
        totalUsers,
        byTier: {
          FREE: tierMap.FREE,
          PRO: tierMap.PRO,
          PREMIUM: tierMap.PREMIUM
        },
        newSignups,
        conversionRate: totalUsers > 0 ? (tierMap.PRO + tierMap.PREMIUM) / totalUsers * 100 : 0,
        mrrEstimate: mrrCents / 100,
        failedPayments: failedPaymentDetails.length,
        dailySignups: dailySignups.map((d) => ({ date: d.day, count: Number(d.count) })),
        dateRange: { start: start.toISOString(), end: end.toISOString() }
      }
    });
  } catch (err) {
    console.error("[Admin] overview error:", err);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/users", async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const search = req.query.search || "";
    const tier = req.query.tier;
    const status = req.query.status;
    const flaggedHighCost = req.query.flagged === "highcost";
    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } }
      ];
    }
    if (tier && ["FREE", "PRO", "PREMIUM"].includes(tier)) {
      where.tier = tier;
    }
    where.createdAt = { gte: start, lte: end };
    const statusFilter = status && status !== "ALL" ? status : null;
    const now = /* @__PURE__ */ new Date();
    const billingStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prices = await (0, import_cost_calculator.getAdminPrices)();
    const thresholds = {
      FREE: prices["alert_threshold_free_eur_cents"] ?? 200,
      PRO: prices["alert_threshold_pro_eur_cents"] ?? 500,
      PREMIUM: prices["alert_threshold_premium_eur_cents"] ?? 1e3
    };
    const [users, total] = await Promise.all([
      import_prisma.prisma.user.findMany({
        where,
        include: {
          subscription: { select: { status: true, tier: true, cancelAtPeriodEnd: true } },
          usageRecords: { orderBy: { month: "desc" }, take: 1 }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      import_prisma.prisma.user.count({ where })
    ]);
    const usersWithCost = await Promise.all(
      users.map(async (u) => {
        const costEurCents = await (0, import_cost_calculator.getUserCostEurCents)(u.id, billingStart, now);
        const threshold = thresholds[u.tier] ?? Infinity;
        const aboveThreshold = costEurCents >= threshold;
        return { user: u, costEurCents, aboveThreshold };
      })
    );
    const formatted = usersWithCost.filter(({ user: u, aboveThreshold }) => {
      if (flaggedHighCost && !aboveThreshold) return false;
      if (!statusFilter) return true;
      if (statusFilter === "SUSPENDED") return u.isSuspended;
      const subStatus = u.subscription?.status ?? "ACTIVE";
      return subStatus === statusFilter;
    }).map(({ user: u, costEurCents, aboveThreshold }) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      tier: u.tier,
      createdAt: u.createdAt,
      lastActive: u.lastQueryDate?.toISOString() ?? null,
      queryCount: u.usageRecords[0]?.queryCount ?? u.monthlyQueryCount,
      isSuspended: u.isSuspended,
      costEurCents,
      aboveThreshold
    }));
    res.json({
      success: true,
      data: {
        users: formatted,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        thresholds
      }
    });
  } catch (err) {
    console.error("[Admin] users error:", err);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/users/:id", async (req, res) => {
  try {
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        subscription: true,
        usageRecords: { orderBy: { month: "desc" }, take: 12 },
        chatSessions: {
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { id: true, title: true, updatedAt: true, createdAt: true }
        },
        partners: { select: { id: true, name: true, relationshipType: true, createdAt: true } }
      }
    });
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND" } });
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.patch("/users/:id/tier", async (req, res) => {
  try {
    const { tier } = req.body;
    if (!["FREE", "PRO", "PREMIUM"].includes(tier)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_TIER" } });
    }
    await import_prisma.prisma.user.update({ where: { id: req.params.id }, data: { tier } });
    await import_prisma.prisma.subscription.upsert({
      where: { userId: req.params.id },
      create: { userId: req.params.id, tier, status: "ACTIVE" },
      update: { tier }
    });
    res.json({ success: true, data: { message: `Tier updated to ${tier}` } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.patch("/users/:id/suspend", async (req, res) => {
  try {
    const { suspended } = req.body;
    await import_prisma.prisma.user.update({
      where: { id: req.params.id },
      data: { isSuspended: !!suspended }
    });
    res.json({ success: true, data: { suspended: !!suspended } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/usage", async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const rows = await import_prisma.prisma.$queryRaw`
      SELECT
        DATE("created_at") as day,
        metadata->>'tier' as tier,
        metadata->>'model' as model,
        COUNT(*) as request_count,
        COALESCE(SUM((metadata->>'inputTokens')::bigint), 0) as input_tokens,
        COALESCE(SUM((metadata->>'outputTokens')::bigint), 0) as output_tokens,
        COALESCE(SUM((metadata->>'totalTokens')::bigint), 0) as total_tokens,
        COALESCE(AVG((metadata->>'latencyMs')::float), 0) as avg_latency,
        COALESCE(MAX((metadata->>'latencyMs')::float), 0) as max_latency
      FROM chat_messages
      WHERE role = 'ASSISTANT'
        AND metadata IS NOT NULL
        AND metadata->>'model' IS NOT NULL
        AND "created_at" >= ${start}
        AND "created_at" <= ${end}
      GROUP BY DATE("created_at"), metadata->>'tier', metadata->>'model'
      ORDER BY day ASC
    `;
    let totalRequests = 0;
    let totalInput = BigInt(0);
    let totalOutput = BigInt(0);
    let totalCostCents = 0;
    let totalWeightedLatency = 0;
    const latencies = [];
    const modelCosts = {};
    const dayAgg = {};
    const tierAgg = {};
    rows.forEach((r) => {
      const input = Number(r.input_tokens);
      const output = Number(r.output_tokens);
      const count = Number(r.request_count);
      const cost = estimateCostEurCents(input, output, r.model || "");
      const avgLat = r.avg_latency || 0;
      totalRequests += count;
      totalInput += r.input_tokens;
      totalOutput += r.output_tokens;
      totalCostCents += cost;
      totalWeightedLatency += avgLat * count;
      if (r.max_latency > 0) latencies.push(r.max_latency);
      const day = String(r.day);
      if (!dayAgg[day]) dayAgg[day] = { requests: 0, inputTokens: 0, outputTokens: 0, costCents: 0, weightedLatency: 0 };
      dayAgg[day].requests += count;
      dayAgg[day].inputTokens += input;
      dayAgg[day].outputTokens += output;
      dayAgg[day].costCents += cost;
      dayAgg[day].weightedLatency += avgLat * count;
      const tier = r.tier || "FREE";
      if (!tierAgg[tier]) tierAgg[tier] = { requests: 0, inputTokens: 0, outputTokens: 0, costCents: 0 };
      tierAgg[tier].requests += count;
      tierAgg[tier].inputTokens += input;
      tierAgg[tier].outputTokens += output;
      tierAgg[tier].costCents += cost;
      const mKey = r.model || "unknown";
      if (!modelCosts[mKey]) modelCosts[mKey] = { requests: 0, input: BigInt(0), output: BigInt(0), costCents: 0 };
      modelCosts[mKey].requests += count;
      modelCosts[mKey].input += r.input_tokens;
      modelCosts[mKey].output += r.output_tokens;
      modelCosts[mKey].costCents += cost;
    });
    latencies.sort((a, b) => a - b);
    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
    const avgLatencyMs = totalRequests > 0 ? Math.round(totalWeightedLatency / totalRequests) : 0;
    const byDay = Object.entries(dayAgg).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      date,
      requests: d.requests,
      inputTokens: d.inputTokens,
      outputTokens: d.outputTokens,
      costUsdCents: d.costCents,
      avgLatencyMs: d.requests > 0 ? Math.round(d.weightedLatency / d.requests) : 0
    }));
    const byTier = Object.entries(tierAgg).map(([tier, d]) => ({
      tier,
      requests: d.requests,
      inputTokens: d.inputTokens,
      outputTokens: d.outputTokens,
      costUsdCents: d.costCents
    }));
    const heavyUsers = await import_prisma.prisma.$queryRaw`
      SELECT
        s.user_id,
        COUNT(*) as request_count,
        COALESCE(SUM((m.metadata->>'totalTokens')::bigint), 0) as total_tokens
      FROM chat_messages m
      JOIN chat_sessions s ON m.session_id = s.id
      WHERE m.role = 'ASSISTANT'
        AND m.metadata IS NOT NULL
        AND m."created_at" >= ${start}
        AND m."created_at" <= ${end}
      GROUP BY s.user_id
      ORDER BY total_tokens DESC
      LIMIT 10
    `;
    const heavyUserIds = heavyUsers.map((u) => u.user_id);
    const heavyUserDetails = heavyUserIds.length > 0 ? await import_prisma.prisma.user.findMany({
      where: { id: { in: heavyUserIds } },
      select: { id: true, email: true, tier: true, lastQueryDate: true }
    }) : [];
    const topUsers = heavyUsers.map((u) => {
      const detail = heavyUserDetails.find((d) => d.id === u.user_id);
      const requests = Number(u.request_count);
      const tokens = Number(u.total_tokens);
      const costEur = tokens / 1e6 * 15;
      return {
        userId: u.user_id,
        email: detail?.email ?? "Unknown",
        tier: detail?.tier ?? "FREE",
        requests,
        tokens,
        costEur: costEur.toFixed(2),
        lastActive: detail?.lastQueryDate ?? null
      };
    });
    res.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          totalInputTokens: Number(totalInput),
          totalOutputTokens: Number(totalOutput),
          totalCostUsdCents: totalCostCents,
          avgLatencyMs,
          p50LatencyMs: Math.round(p50),
          p95LatencyMs: Math.round(p95),
          p99LatencyMs: Math.round(p99)
        },
        byDay,
        byTier,
        byModel: Object.entries(modelCosts).map(([model, d]) => ({
          model,
          requests: d.requests,
          costUsdCents: d.costCents
        })),
        topUsers: topUsers.map((u) => ({
          userId: u.userId,
          email: u.email,
          requests: u.requests,
          totalTokens: u.tokens
        })),
        dateRange: { start: start.toISOString(), end: end.toISOString() }
      }
    });
  } catch (err) {
    console.error("[Admin] usage error:", err);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/ratings", async (_req, res) => {
  try {
    const [avgResult, lowRated, ratingDist] = await Promise.all([
      // Average rating across all rated sessions
      import_prisma.prisma.chatSession.aggregate({
        where: { rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true }
      }),
      // Low-rated sessions (1-2 stars) — most recent 20
      import_prisma.prisma.chatSession.findMany({
        where: { rating: { lte: 2 } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          rating: true,
          updatedAt: true,
          user: { select: { email: true } }
        }
      }),
      // Rating distribution (count per star)
      import_prisma.prisma.$queryRaw`
        SELECT rating, COUNT(*) as count
        FROM chat_sessions
        WHERE rating IS NOT NULL
        GROUP BY rating
        ORDER BY rating ASC
      `
    ]);
    res.json({
      success: true,
      data: {
        avgRating: avgResult._avg.rating ? Number(avgResult._avg.rating.toFixed(2)) : null,
        totalRated: avgResult._count.rating,
        distribution: ratingDist.map((r) => ({ stars: r.rating, count: Number(r.count) })),
        lowRated: lowRated.map((s) => ({
          id: s.id,
          title: s.title || "Untitled",
          rating: s.rating,
          updatedAt: s.updatedAt,
          email: s.user?.email ?? "Unknown"
        }))
      }
    });
  } catch (err) {
    console.error("[Admin] ratings error:", err);
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/revenue", async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    let stripe = null;
    if (process.env.STRIPE_SECRET_KEY) {
      stripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
    }
    const [activeSubs, cancelledSubs, pastDueSubs] = await Promise.all([
      import_prisma.prisma.subscription.count({ where: { status: "ACTIVE", tier: { in: ["PRO", "PREMIUM"] } } }),
      import_prisma.prisma.subscription.count({ where: { status: "CANCELED", updatedAt: { gte: start, lte: end } } }),
      import_prisma.prisma.subscription.count({ where: { status: "PAST_DUE" } })
    ]);
    const proCount = await import_prisma.prisma.subscription.count({ where: { status: "ACTIVE", tier: "PRO" } });
    const premiumCount = await import_prisma.prisma.subscription.count({ where: { status: "ACTIVE", tier: "PREMIUM" } });
    const mrrEur = proCount * 10 + premiumCount * 20;
    const newPaidSubs = await import_prisma.prisma.subscription.count({
      where: {
        tier: { in: ["PRO", "PREMIUM"] },
        createdAt: { gte: start, lte: end }
      }
    });
    let yearlyCount = 0;
    let monthlyCount = activeSubs;
    if (stripe) {
      try {
        const stripeSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
        yearlyCount = stripeSubs.data.filter(
          (s) => s.items.data.some((i) => i.price.recurring?.interval === "year")
        ).length;
        monthlyCount = activeSubs - yearlyCount;
      } catch {
      }
    }
    const mrrCents = mrrEur * 100;
    const avgCentsPerSub = activeSubs > 0 ? Math.round(mrrCents / activeSubs) : 0;
    res.json({
      success: true,
      data: {
        active: activeSubs,
        cancelled: cancelledSubs,
        pastDue: pastDueSubs,
        totalRevenueCents: mrrCents,
        mrrCents,
        billingBreakdown: {
          monthly: { count: monthlyCount, revenueCents: monthlyCount * avgCentsPerSub },
          yearly: { count: yearlyCount, revenueCents: yearlyCount * avgCentsPerSub }
        },
        newSubscriptions: newPaidSubs,
        churnCount: cancelledSubs,
        stripeConfigured: !!stripe,
        dateRange: { start: start.toISOString(), end: end.toISOString() }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/prompts", async (_req, res) => {
  try {
    await ensureDefaultPrompts();
    const prompts = await import_prisma.prisma.systemPrompt.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, label: true, isActive: true, version: true, updatedAt: true }
    });
    res.json({ success: true, data: prompts });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/prompts/:name", async (req, res) => {
  try {
    await ensureDefaultPrompts();
    const prompt = await import_prisma.prisma.systemPrompt.findUnique({
      where: { name: req.params.name },
      include: {
        history: {
          orderBy: { version: "desc" },
          take: 10,
          select: { id: true, version: true, savedAt: true, savedBy: true, content: true }
        }
      }
    });
    if (!prompt) return res.status(404).json({ success: false, error: { code: "NOT_FOUND" } });
    res.json({ success: true, data: { prompt } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.put("/prompts/:name", async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: { code: "INVALID_CONTENT" } });
    }
    const existing = await import_prisma.prisma.systemPrompt.findUnique({ where: { name: req.params.name } });
    if (!existing) return res.status(404).json({ success: false, error: { code: "NOT_FOUND" } });
    const adminEmail = req.user?.email ?? "admin";
    const newVersion = existing.version + 1;
    await import_prisma.prisma.systemPromptHistory.create({
      data: {
        promptId: existing.id,
        content: existing.content,
        version: existing.version,
        savedBy: adminEmail
      }
    });
    const updated = await import_prisma.prisma.systemPrompt.update({
      where: { name: req.params.name },
      data: { content: content.trim(), version: newVersion }
    });
    res.json({ success: true, data: { prompt: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.post("/prompts/:name/restore/:version", async (req, res) => {
  try {
    const targetVersion = parseInt(req.params.version);
    const existing = await import_prisma.prisma.systemPrompt.findUnique({ where: { name: req.params.name } });
    if (!existing) return res.status(404).json({ success: false, error: { code: "NOT_FOUND" } });
    const historyEntry = await import_prisma.prisma.systemPromptHistory.findFirst({
      where: { promptId: existing.id, version: targetVersion }
    });
    if (!historyEntry) return res.status(404).json({ success: false, error: { code: "VERSION_NOT_FOUND" } });
    const adminEmail = req.user?.email ?? "admin";
    const newVersion = existing.version + 1;
    await import_prisma.prisma.systemPromptHistory.create({
      data: { promptId: existing.id, content: existing.content, version: existing.version, savedBy: adminEmail }
    });
    const updated = await import_prisma.prisma.systemPrompt.update({
      where: { name: req.params.name },
      data: { content: historyEntry.content, version: newVersion }
    });
    res.json({ success: true, data: { prompt: updated, restoredFromVersion: targetVersion } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/config/models", async (_req, res) => {
  try {
    let resolveModel2 = function(key, defaultVal) {
      const envVar = key === "model_free" ? process.env.MODEL_FREE : key === "model_pro" ? process.env.MODEL_PRO : process.env.MODEL_PREMIUM;
      if (envVar) return { model: envVar, source: "env" };
      if (dbMap[key]) return { model: dbMap[key], source: "db" };
      return { model: defaultVal, source: "env" };
    };
    var resolveModel = resolveModel2;
    const configs = await import_prisma.prisma.adminConfig.findMany({
      where: { key: { in: ["model_free", "model_pro", "model_premium"] } }
    });
    const dbMap = {};
    configs.forEach((c) => {
      dbMap[c.key] = c.value;
    });
    res.json({
      success: true,
      data: {
        FREE: resolveModel2("model_free", "claude-haiku-4-5-20251001"),
        PRO: resolveModel2("model_pro", "claude-sonnet-4-6"),
        PREMIUM: resolveModel2("model_premium", "claude-opus-4-6")
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.put("/config/models", async (req, res) => {
  try {
    const { model_free, model_pro, model_premium } = req.body;
    const adminEmail = req.user?.email ?? "admin";
    const updates = [];
    if (model_free) updates.push({ key: "model_free", value: model_free });
    if (model_pro) updates.push({ key: "model_pro", value: model_pro });
    if (model_premium) updates.push({ key: "model_premium", value: model_premium });
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { code: "NO_UPDATES" } });
    }
    await Promise.all(updates.map(
      (u) => import_prisma.prisma.adminConfig.upsert({
        where: { key: u.key },
        create: { key: u.key, value: u.value, updatedBy: adminEmail },
        update: { value: u.value, updatedBy: adminEmail }
      })
    ));
    res.json({ success: true, data: { updated: updates.map((u) => u.key) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/config/free-tier-limits", async (_req, res) => {
  try {
    const config = await import_prisma.prisma.adminConfig.findUnique({ where: { key: "free_tier_daily_query_limit" } });
    const value = config?.value ? parseInt(config.value, 10) : 3;
    res.json({ success: true, data: { freeTierDailyQueryLimit: value } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.put("/config/free-tier-limits", async (req, res) => {
  try {
    const { freeTierDailyQueryLimit } = req.body;
    const adminEmail = req.user?.email ?? "admin";
    const limit = parseInt(freeTierDailyQueryLimit, 10);
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ success: false, error: { code: "INVALID_VALUE", message: "Limit must be a number >= 1" } });
    }
    await import_prisma.prisma.adminConfig.upsert({
      where: { key: "free_tier_daily_query_limit" },
      create: { key: "free_tier_daily_query_limit", value: String(limit), updatedBy: adminEmail },
      update: { value: String(limit), updatedBy: adminEmail }
    });
    res.json({ success: true, data: { freeTierDailyQueryLimit: limit } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/discounts", async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const statusFilter = req.query.status;
    const where = { createdAt: { gte: start, lte: end } };
    if (statusFilter === "active") where.isActive = true;
    else if (statusFilter === "expired") {
      where.expiresAt = { lt: /* @__PURE__ */ new Date() };
    } else if (statusFilter === "depleted") {
      where.NOT = [{ maxUses: null }];
      where.usesCount = { gte: import_prisma.prisma.discountCode.fields.maxUses };
    }
    const codes = await import_prisma.prisma.discountCode.findMany({
      where: {},
      orderBy: { createdAt: "desc" }
    });
    const formatted = codes.map((c) => ({
      ...c,
      status: !c.isActive ? "disabled" : c.expiresAt && c.expiresAt < /* @__PURE__ */ new Date() ? "expired" : c.maxUses !== null && c.usesCount >= c.maxUses ? "depleted" : "active"
    }));
    const totals = {
      active: formatted.filter((c) => c.status === "active").length,
      totalRedeemed: codes.reduce((s, c) => s + c.usesCount, 0),
      avgDiscount: codes.length > 0 ? (codes.filter((c) => c.discountType === "percent").reduce((s, c) => s + c.discountValue, 0) / Math.max(1, codes.filter((c) => c.discountType === "percent").length)).toFixed(0) : "0"
    };
    res.json({ success: true, data: { codes: formatted, totals } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.post("/discounts", async (req, res) => {
  try {
    const { code, discountType = "percent", discountValue, appliesTo = "ALL", maxUses, expiresAt } = req.body;
    if (!code || discountValue === void 0) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS" } });
    }
    let stripePromotionCodeId = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
        const coupon = await stripe.coupons.create({
          id: code.toUpperCase(),
          ...discountType === "percent" ? { percent_off: discountValue } : { amount_off: discountValue * 100, currency: "eur" },
          duration: "once",
          ...maxUses ? { max_redemptions: maxUses } : {},
          ...expiresAt ? { redeem_by: Math.floor(new Date(expiresAt).getTime() / 1e3) } : {}
        });
        const promoCode = await stripe.promotionCodes.create({ coupon: coupon.id, code: code.toUpperCase() });
        stripePromotionCodeId = promoCode.id;
      } catch (stripeErr) {
        console.warn("[Admin] Stripe coupon creation failed (continuing without Stripe):", stripeErr.message);
      }
    }
    const discount = await import_prisma.prisma.discountCode.create({
      data: {
        code: code.toUpperCase(),
        stripePromotionCodeId,
        discountType,
        discountValue: parseInt(discountValue),
        appliesTo,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    res.json({ success: true, data: { discount } });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ success: false, error: { code: "CODE_EXISTS", message: "A discount code with this name already exists" } });
    }
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.patch("/discounts/:id", async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await import_prisma.prisma.discountCode.update({
      where: { id: req.params.id },
      data: { isActive }
    });
    res.json({ success: true, data: { discount: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.get("/referrals", async (_req, res) => {
  try {
    const links = await import_prisma.prisma.referralLink.findMany({
      include: {
        conversions: {
          select: { id: true, tier: true, revenueEurCents: true, commissionCents: true, convertedAt: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const formatted = links.map((l) => {
      const byTier = { FREE: 0, PRO: 0, PREMIUM: 0 };
      l.conversions.forEach((c) => {
        if (c.tier in byTier) byTier[c.tier]++;
      });
      return {
        id: l.id,
        slug: l.slug,
        label: l.label,
        commissionRate: l.commissionRate,
        discountCode: l.discountCode ?? null,
        clicks: l.clicks,
        isActive: l.isActive,
        createdAt: l.createdAt,
        totalConversions: l.conversions.length,
        conversionsByTier: byTier,
        revenueEurCents: l.conversions.reduce((s, c) => s + c.revenueEurCents, 0),
        totalCommissionCents: l.conversions.reduce((s, c) => s + c.commissionCents, 0)
      };
    });
    const totals = {
      activeLinks: formatted.filter((l) => l.isActive).length,
      totalClicks: formatted.reduce((s, l) => s + l.clicks, 0),
      totalConversions: formatted.reduce((s, l) => s + l.totalConversions, 0),
      totalCommissionEur: (formatted.reduce((s, l) => s + l.totalCommissionCents, 0) / 100).toFixed(2)
    };
    res.json({ success: true, data: { links: formatted, totals } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.post("/referrals", async (req, res) => {
  try {
    const { slug, label, commissionRate = 0.2, discountCode } = req.body;
    if (!slug || !label) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS" } });
    }
    const link = await import_prisma.prisma.referralLink.create({
      data: {
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        label,
        commissionRate: parseFloat(commissionRate),
        discountCode: discountCode?.trim() || null
      }
    });
    res.json({ success: true, data: { link } });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ success: false, error: { code: "SLUG_EXISTS", message: "A referral link with this slug already exists" } });
    }
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
router.patch("/referrals/:id", async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await import_prisma.prisma.referralLink.update({
      where: { id: req.params.id },
      data: { isActive }
    });
    res.json({ success: true, data: { link: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR" } });
  }
});
var admin_default = router;
