/**
 * Admin API Routes
 * All endpoints require authenticated admin user (email in ADMIN_EMAILS env var).
 *
 * GET  /admin/overview           — user counts, tier breakdown, signups, MRR, conversion
 * GET  /admin/users              — paginated user list with filters
 * GET  /admin/users/:id          — user detail
 * PATCH /admin/users/:id/tier   — manually override user tier
 * PATCH /admin/users/:id/suspend — suspend / unsuspend account
 * GET  /admin/usage              — LLM token usage + latency stats from ChatMessage metadata
 * GET  /admin/revenue            — Stripe revenue data
 * GET  /admin/prompts            — list system prompts
 * GET  /admin/prompts/:name      — get prompt content + version history
 * PUT  /admin/prompts/:name      — save new version and activate
 * GET  /admin/config/models      — get model overrides per tier
 * PUT  /admin/config/models      — save model overrides per tier
 * GET  /admin/discounts          — list discount codes
 * POST /admin/discounts          — create discount code
 * PATCH /admin/discounts/:id     — activate / deactivate
 * GET  /admin/referrals          — list referral links with stats
 * POST /admin/referrals          — create referral link
 * PATCH /admin/referrals/:id     — activate / deactivate
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { prisma } from '../utils/prisma';
import Stripe from 'stripe';

const router = Router();
router.use(authMiddleware as any);
router.use(adminAuthMiddleware as any);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse date range from query params. Defaults to last 30 days. */
function parseDateRange(query: any): { start: Date; end: Date } {
  const now = new Date();
  const end = query.endDate ? new Date(query.endDate as string) : now;
  const start = query.startDate
    ? new Date(query.startDate as string)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Set end to end of day
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Estimate cost in EUR cents from token counts and model name. */
function estimateCostEurCents(inputTokens: number, outputTokens: number, model: string): number {
  // Rates per million tokens in EUR (approximate 2026 pricing)
  const rates: Record<string, { input: number; output: number }> = {
    'claude-haiku': { input: 0.23, output: 1.15 },
    'claude-sonnet': { input: 2.76, output: 13.80 },
    'claude-opus': { input: 13.80, output: 69.00 },
    'gpt-4o-mini': { input: 0.14, output: 0.55 },
    'gpt-4o': { input: 4.60, output: 13.80 },
  };

  const key = Object.keys(rates).find(k => model.includes(k.replace('claude-', '').replace('gpt-', '')))
    || (model.includes('haiku') ? 'claude-haiku' : model.includes('sonnet') ? 'claude-sonnet' : model.includes('opus') ? 'claude-opus' : null);

  if (!key) return 0;
  const rate = rates[key];
  const costEur = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  return Math.round(costEur * 100); // cents
}

// ── Seed default system prompts if none exist ─────────────────────────────────

const DEFAULT_PROMPTS = [
  { name: 'master', label: 'Master Prompt', content: '' }, // content seeded from llm-helpers on first save
  { name: 'free_addon', label: 'Free Tier Addon', content: '' },
  { name: 'pro_addon', label: 'Pro Tier Addon', content: '' },
  { name: 'premium_addon', label: 'Premium Tier Addon', content: '' },
  { name: 'forecast', label: 'Forecast Prompt', content: '' },
  { name: 'compatibility', label: 'Compatibility Prompt', content: '' },
];

async function ensureDefaultPrompts() {
  for (const p of DEFAULT_PROMPTS) {
    await prisma.systemPrompt.upsert({
      where: { name: p.name },
      create: { name: p.name, label: p.label, content: p.content, version: 1 },
      update: {},
    });
  }
}

// ── GET /admin/overview ───────────────────────────────────────────────────────

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req.query);

    const [totalUsers, tierCounts, newSignups, paidSubs, failedPayments] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['tier'], _count: { id: true } }),
      prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE', tier: { in: ['PRO', 'PREMIUM'] } },
        select: { tier: true },
      }),
      prisma.subscription.findMany({
        where: { status: 'PAST_DUE' },
        select: { userId: true, tier: true, currentPeriodEnd: true },
        take: 10,
      }),
    ]);

    const tierMap: Record<string, number> = { FREE: 0, PRO: 0, PREMIUM: 0 };
    tierCounts.forEach(t => { tierMap[t.tier] = t._count.id; });

    // MRR estimate (monthly prices: PRO €10, PREMIUM €20)
    const mrrCents = paidSubs.reduce((sum, s) => sum + (s.tier === 'PRO' ? 1000 : 2000), 0);

    const conversionRate = totalUsers > 0
      ? ((tierMap.PRO + tierMap.PREMIUM) / totalUsers * 100).toFixed(1)
      : '0.0';

    // Signups over last 30 days grouped by day
    const dailySignups = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT DATE("created_at") as day, COUNT(*) as count
      FROM users
      WHERE "created_at" >= ${start} AND "created_at" <= ${end}
      GROUP BY DATE("created_at")
      ORDER BY day ASC
    `;

    // Failed payment user details
    const failedUserIds = failedPayments.map(f => f.userId);
    const failedUsers = failedUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: failedUserIds } },
          select: { id: true, email: true, tier: true },
        })
      : [];

    const failedPaymentDetails = failedPayments.map(f => {
      const u = failedUsers.find(u => u.id === f.userId);
      const daysPastDue = f.currentPeriodEnd
        ? Math.floor((Date.now() - new Date(f.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        email: u?.email ?? 'Unknown',
        tier: f.tier,
        amount: f.tier === 'PRO' ? 10 : 20,
        daysPastDue,
      };
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        tiers: {
          FREE: tierMap.FREE,
          PRO: tierMap.PRO,
          PREMIUM: tierMap.PREMIUM,
          freeShare: totalUsers > 0 ? ((tierMap.FREE / totalUsers) * 100).toFixed(0) : '0',
          proShare: totalUsers > 0 ? ((tierMap.PRO / totalUsers) * 100).toFixed(0) : '0',
          premiumShare: totalUsers > 0 ? ((tierMap.PREMIUM / totalUsers) * 100).toFixed(0) : '0',
        },
        newSignups,
        conversionRate,
        mrrEur: (mrrCents / 100).toFixed(2),
        mrrBreakdown: {
          pro: (paidSubs.filter(s => s.tier === 'PRO').length * 10).toFixed(2),
          premium: (paidSubs.filter(s => s.tier === 'PREMIUM').length * 20).toFixed(2),
        },
        dailySignups: dailySignups.map(d => ({ day: d.day, count: Number(d.count) })),
        failedPayments: failedPaymentDetails,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
      },
    });
  } catch (err) {
    console.error('[Admin] overview error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/users ──────────────────────────────────────────────────────────

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const search = (req.query.search as string) || '';
    const tier = req.query.tier as string;
    const status = req.query.status as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tier && ['FREE', 'PRO', 'PREMIUM'].includes(tier)) {
      where.tier = tier;
    }

    where.createdAt = { gte: start, lte: end };

    // Status filter maps to subscription status
    const statusFilter = status && status !== 'ALL' ? status : null;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          subscription: { select: { status: true, tier: true, cancelAtPeriodEnd: true } },
          usageRecords: {
            orderBy: { month: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = users
      .filter(u => {
        if (!statusFilter) return true;
        const subStatus = u.subscription?.status ?? 'ACTIVE';
        if (statusFilter === 'SUSPENDED') return false; // placeholder
        return subStatus === statusFilter;
      })
      .map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        tier: u.tier,
        language: u.language,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        subscriptionStatus: u.subscription?.status ?? (u.tier === 'FREE' ? 'FREE' : 'ACTIVE'),
        cancelAtPeriodEnd: u.subscription?.cancelAtPeriodEnd ?? false,
        monthlyQueries: u.monthlyQueryCount,
        currentMonthUsage: u.usageRecords[0]?.queryCount ?? 0,
        bonusQueries: u.bonusQueries,
      }));

    res.json({
      success: true,
      data: {
        users: formatted,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('[Admin] users error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/users/:id ──────────────────────────────────────────────────────

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        subscription: true,
        usageRecords: { orderBy: { month: 'desc' }, take: 12 },
        chatSessions: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, title: true, updatedAt: true, createdAt: true },
        },
        partners: { select: { id: true, name: true, relationshipType: true, createdAt: true } },
      },
    });

    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── PATCH /admin/users/:id/tier ───────────────────────────────────────────────

router.patch('/users/:id/tier', async (req: Request, res: Response) => {
  try {
    const { tier } = req.body;
    if (!['FREE', 'PRO', 'PREMIUM'].includes(tier)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TIER' } });
    }

    await prisma.user.update({ where: { id: req.params.id }, data: { tier } });
    await prisma.subscription.upsert({
      where: { userId: req.params.id },
      create: { userId: req.params.id, tier, status: 'ACTIVE' },
      update: { tier },
    });

    res.json({ success: true, data: { message: `Tier updated to ${tier}` } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── PATCH /admin/users/:id/suspend ────────────────────────────────────────────

router.patch('/users/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { suspended } = req.body;
    // We use bonusQueries = -999 as a suspended marker (simple flag without schema change)
    // A proper implementation would add an `isSuspended` boolean column.
    await prisma.user.update({
      where: { id: req.params.id },
      data: { bonusQueries: suspended ? -999 : 0 },
    });
    res.json({ success: true, data: { suspended } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/usage ──────────────────────────────────────────────────────────

router.get('/usage', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req.query);

    // Aggregate from ChatMessage.metadata using raw SQL JSON extraction
    const rows = await prisma.$queryRaw<{
      day: string;
      tier: string;
      model: string;
      request_count: bigint;
      input_tokens: bigint;
      output_tokens: bigint;
      total_tokens: bigint;
      avg_latency: number;
      max_latency: number;
    }[]>`
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

    // Compute totals
    let totalRequests = 0;
    let totalInput = BigInt(0);
    let totalOutput = BigInt(0);
    let totalTokens = BigInt(0);
    let totalCostCents = 0;
    const latencies: number[] = [];
    const modelCosts: Record<string, { input: bigint; output: bigint; costCents: number }> = {};

    rows.forEach(r => {
      const input = Number(r.input_tokens);
      const output = Number(r.output_tokens);
      const count = Number(r.request_count);
      const cost = estimateCostEurCents(input, output, r.model || '');

      totalRequests += count;
      totalInput += r.input_tokens;
      totalOutput += r.output_tokens;
      totalTokens += r.total_tokens;
      totalCostCents += cost;

      if (r.max_latency > 0) latencies.push(r.max_latency);

      const mKey = r.model || 'unknown';
      if (!modelCosts[mKey]) modelCosts[mKey] = { input: BigInt(0), output: BigInt(0), costCents: 0 };
      modelCosts[mKey].input += r.input_tokens;
      modelCosts[mKey].output += r.output_tokens;
      modelCosts[mKey].costCents += cost;
    });

    // Latency percentiles (using max_latency per bucket as approximation)
    latencies.sort((a, b) => a - b);
    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[latencies.length - 1] : 0;

    // Daily chart data grouped by tier
    const dailyByTier: Record<string, any[]> = { FREE: [], PRO: [], PREMIUM: [] };
    const dayMap: Record<string, Record<string, bigint>> = {};
    rows.forEach(r => {
      const day = String(r.day);
      if (!dayMap[day]) dayMap[day] = { FREE: BigInt(0), PRO: BigInt(0), PREMIUM: BigInt(0) };
      const t = r.tier || 'FREE';
      if (t in dayMap[day]) dayMap[day][t] += r.total_tokens;
    });
    const dailyData = Object.entries(dayMap).map(([day, tiers]) => ({
      day,
      FREE: Number(tiers.FREE),
      PRO: Number(tiers.PRO),
      PREMIUM: Number(tiers.PREMIUM),
    }));

    // Top 10 heaviest users
    const heavyUsers = await prisma.$queryRaw<{
      user_id: string;
      request_count: bigint;
      total_tokens: bigint;
    }[]>`
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

    const heavyUserIds = heavyUsers.map(u => u.user_id);
    const heavyUserDetails = heavyUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: heavyUserIds } },
          select: { id: true, email: true, tier: true, lastQueryDate: true },
        })
      : [];

    const topUsers = heavyUsers.map(u => {
      const detail = heavyUserDetails.find(d => d.id === u.user_id);
      const requests = Number(u.request_count);
      const tokens = Number(u.total_tokens);
      // Rough cost estimate using average cost per token (use sonnet rate as default)
      const costEur = (tokens / 1_000_000) * 15;
      return {
        userId: u.user_id,
        email: detail?.email ?? 'Unknown',
        tier: detail?.tier ?? 'FREE',
        requests,
        tokens,
        costEur: costEur.toFixed(2),
        lastActive: detail?.lastQueryDate ?? null,
      };
    });

    res.json({
      success: true,
      data: {
        totals: {
          requests: totalRequests,
          inputTokens: Number(totalInput),
          outputTokens: Number(totalOutput),
          totalTokens: Number(totalTokens),
          costEur: (totalCostCents / 100).toFixed(2),
        },
        latency: { p50: Math.round(p50), p95: Math.round(p95), p99: Math.round(p99) },
        dailyData,
        modelBreakdown: Object.entries(modelCosts).map(([model, d]) => ({
          model,
          inputTokens: Number(d.input),
          outputTokens: Number(d.output),
          costEur: (d.costCents / 100).toFixed(2),
          costShare: totalCostCents > 0 ? ((d.costCents / totalCostCents) * 100).toFixed(0) : '0',
        })),
        topUsers,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
      },
    });
  } catch (err) {
    console.error('[Admin] usage error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/revenue ────────────────────────────────────────────────────────

router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req.query);

    let stripe: Stripe | null = null;
    if (process.env.STRIPE_SECRET_KEY) {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    }

    const [activeSubs, cancelledSubs, pastDueSubs] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE', tier: { in: ['PRO', 'PREMIUM'] } } }),
      prisma.subscription.count({ where: { status: 'CANCELED', updatedAt: { gte: start, lte: end } } }),
      prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    ]);

    // MRR breakdown
    const proCount = await prisma.subscription.count({ where: { status: 'ACTIVE', tier: 'PRO' } });
    const premiumCount = await prisma.subscription.count({ where: { status: 'ACTIVE', tier: 'PREMIUM' } });
    const mrrEur = proCount * 10 + premiumCount * 20;

    // New paid subscriptions in date range
    const newPaidSubs = await prisma.subscription.count({
      where: {
        tier: { in: ['PRO', 'PREMIUM'] },
        createdAt: { gte: start, lte: end },
      },
    });

    // Billing period split (yearly vs monthly) — from Stripe if available
    let yearlyCount = 0;
    let monthlyCount = activeSubs;
    if (stripe) {
      try {
        const stripeSubs = await stripe.subscriptions.list({ status: 'active', limit: 100 });
        yearlyCount = stripeSubs.data.filter(s =>
          s.items.data.some(i => i.price.recurring?.interval === 'year')
        ).length;
        monthlyCount = activeSubs - yearlyCount;
      } catch { /* non-blocking */ }
    }

    res.json({
      success: true,
      data: {
        mrrEur,
        proCount,
        premiumCount,
        activeSubs,
        cancelledInPeriod: cancelledSubs,
        pastDue: pastDueSubs,
        newPaidSubs,
        billingPeriodSplit: { monthly: monthlyCount, yearly: yearlyCount },
        dateRange: { start: start.toISOString(), end: end.toISOString() },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/prompts ────────────────────────────────────────────────────────

router.get('/prompts', async (_req: Request, res: Response) => {
  try {
    await ensureDefaultPrompts();
    const prompts = await prisma.systemPrompt.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, label: true, isActive: true, version: true, updatedAt: true },
    });
    res.json({ success: true, data: { prompts } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/prompts/:name ──────────────────────────────────────────────────

router.get('/prompts/:name', async (req: Request, res: Response) => {
  try {
    await ensureDefaultPrompts();
    const prompt = await prisma.systemPrompt.findUnique({
      where: { name: req.params.name },
      include: {
        history: {
          orderBy: { version: 'desc' },
          take: 10,
          select: { id: true, version: true, savedAt: true, savedBy: true, content: true },
        },
      },
    });
    if (!prompt) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    res.json({ success: true, data: { prompt } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── PUT /admin/prompts/:name ──────────────────────────────────────────────────

router.put('/prompts/:name', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CONTENT' } });
    }

    const existing = await prisma.systemPrompt.findUnique({ where: { name: req.params.name } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    const adminEmail = (req as any).user?.email ?? 'admin';
    const newVersion = existing.version + 1;

    // Archive current version
    await prisma.systemPromptHistory.create({
      data: {
        promptId: existing.id,
        content: existing.content,
        version: existing.version,
        savedBy: adminEmail,
      },
    });

    // Update with new content
    const updated = await prisma.systemPrompt.update({
      where: { name: req.params.name },
      data: { content: content.trim(), version: newVersion },
    });

    res.json({ success: true, data: { prompt: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── POST /admin/prompts/:name/restore/:version ────────────────────────────────

router.post('/prompts/:name/restore/:version', async (req: Request, res: Response) => {
  try {
    const targetVersion = parseInt(req.params.version);
    const existing = await prisma.systemPrompt.findUnique({ where: { name: req.params.name } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    const historyEntry = await prisma.systemPromptHistory.findFirst({
      where: { promptId: existing.id, version: targetVersion },
    });
    if (!historyEntry) return res.status(404).json({ success: false, error: { code: 'VERSION_NOT_FOUND' } });

    const adminEmail = (req as any).user?.email ?? 'admin';
    const newVersion = existing.version + 1;

    // Archive current before restoring
    await prisma.systemPromptHistory.create({
      data: { promptId: existing.id, content: existing.content, version: existing.version, savedBy: adminEmail },
    });

    const updated = await prisma.systemPrompt.update({
      where: { name: req.params.name },
      data: { content: historyEntry.content, version: newVersion },
    });

    res.json({ success: true, data: { prompt: updated, restoredFromVersion: targetVersion } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/config/models ──────────────────────────────────────────────────

router.get('/config/models', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.adminConfig.findMany({
      where: { key: { in: ['model_free', 'model_pro', 'model_premium'] } },
    });

    const defaults: Record<string, string> = {
      model_free: 'claude-haiku-4-5-20251001',
      model_pro: 'claude-sonnet-4-6',
      model_premium: 'claude-opus-4-6',
    };

    const result: Record<string, string> = { ...defaults };
    configs.forEach(c => { result[c.key] = c.value; });

    // Also include env overrides (env takes precedence over DB)
    if (process.env.MODEL_FREE) result.model_free = process.env.MODEL_FREE;
    if (process.env.MODEL_PRO) result.model_pro = process.env.MODEL_PRO;
    if (process.env.MODEL_PREMIUM) result.model_premium = process.env.MODEL_PREMIUM;

    res.json({
      success: true,
      data: {
        models: result,
        lastUpdated: configs.reduce((latest, c) => {
          return !latest || c.updatedAt > latest ? c.updatedAt : latest;
        }, null as Date | null),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── PUT /admin/config/models ──────────────────────────────────────────────────

router.put('/config/models', async (req: Request, res: Response) => {
  try {
    const { model_free, model_pro, model_premium } = req.body;
    const adminEmail = (req as any).user?.email ?? 'admin';

    const updates: Array<{ key: string; value: string }> = [];
    if (model_free) updates.push({ key: 'model_free', value: model_free });
    if (model_pro) updates.push({ key: 'model_pro', value: model_pro });
    if (model_premium) updates.push({ key: 'model_premium', value: model_premium });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES' } });
    }

    await Promise.all(updates.map(u =>
      prisma.adminConfig.upsert({
        where: { key: u.key },
        create: { key: u.key, value: u.value, updatedBy: adminEmail },
        update: { value: u.value, updatedBy: adminEmail },
      })
    ));

    res.json({ success: true, data: { updated: updates.map(u => u.key) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/discounts ──────────────────────────────────────────────────────

router.get('/discounts', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const statusFilter = req.query.status as string;

    const where: any = { createdAt: { gte: start, lte: end } };
    if (statusFilter === 'active') where.isActive = true;
    else if (statusFilter === 'expired') { where.expiresAt = { lt: new Date() }; }
    else if (statusFilter === 'depleted') { where.NOT = [{ maxUses: null }]; where.usesCount = { gte: prisma.discountCode.fields.maxUses }; }

    const codes = await prisma.discountCode.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
    });

    const formatted = codes.map(c => ({
      ...c,
      status: !c.isActive ? 'disabled'
        : c.expiresAt && c.expiresAt < new Date() ? 'expired'
        : c.maxUses !== null && c.usesCount >= c.maxUses ? 'depleted'
        : 'active',
    }));

    const totals = {
      active: formatted.filter(c => c.status === 'active').length,
      totalRedeemed: codes.reduce((s, c) => s + c.usesCount, 0),
      avgDiscount: codes.length > 0
        ? (codes.filter(c => c.discountType === 'percent').reduce((s, c) => s + c.discountValue, 0) /
           Math.max(1, codes.filter(c => c.discountType === 'percent').length)).toFixed(0)
        : '0',
    };

    res.json({ success: true, data: { codes: formatted, totals } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── POST /admin/discounts ─────────────────────────────────────────────────────

router.post('/discounts', async (req: Request, res: Response) => {
  try {
    const { code, discountType = 'percent', discountValue, appliesTo = 'ALL', maxUses, expiresAt } = req.body;

    if (!code || discountValue === undefined) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS' } });
    }

    // Create Stripe coupon if Stripe is configured
    let stripePromotionCodeId: string | null = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        const coupon = await stripe.coupons.create({
          id: code.toUpperCase(),
          ...(discountType === 'percent' ? { percent_off: discountValue } : { amount_off: discountValue * 100, currency: 'eur' }),
          duration: 'once',
          ...(maxUses ? { max_redemptions: maxUses } : {}),
          ...(expiresAt ? { redeem_by: Math.floor(new Date(expiresAt).getTime() / 1000) } : {}),
        });
        const promoCode = await stripe.promotionCodes.create({ coupon: coupon.id, code: code.toUpperCase() });
        stripePromotionCodeId = promoCode.id;
      } catch (stripeErr: any) {
        console.warn('[Admin] Stripe coupon creation failed (continuing without Stripe):', stripeErr.message);
      }
    }

    const discount = await prisma.discountCode.create({
      data: {
        code: code.toUpperCase(),
        stripePromotionCodeId,
        discountType,
        discountValue: parseInt(discountValue),
        appliesTo,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.json({ success: true, data: { discount } });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, error: { code: 'CODE_EXISTS', message: 'A discount code with this name already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── PATCH /admin/discounts/:id ────────────────────────────────────────────────

router.patch('/discounts/:id', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    const updated = await prisma.discountCode.update({
      where: { id: req.params.id },
      data: { isActive },
    });
    res.json({ success: true, data: { discount: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── GET /admin/referrals ──────────────────────────────────────────────────────

router.get('/referrals', async (_req: Request, res: Response) => {
  try {
    const links = await prisma.referralLink.findMany({
      include: {
        conversions: {
          select: { id: true, tier: true, revenueEurCents: true, commissionCents: true, convertedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = links.map(l => ({
      id: l.id,
      slug: l.slug,
      label: l.label,
      commissionRate: l.commissionRate,
      clicks: l.clicks,
      isActive: l.isActive,
      createdAt: l.createdAt,
      conversions: l.conversions.length,
      revenueEur: (l.conversions.reduce((s, c) => s + c.revenueEurCents, 0) / 100).toFixed(2),
      commissionEur: (l.conversions.reduce((s, c) => s + c.commissionCents, 0) / 100).toFixed(2),
    }));

    const totals = {
      activeLinks: formatted.filter(l => l.isActive).length,
      totalClicks: formatted.reduce((s, l) => s + l.clicks, 0),
      totalConversions: formatted.reduce((s, l) => s + l.conversions, 0),
      totalCommissionEur: (
        formatted.reduce((s, l) => s + parseFloat(l.commissionEur), 0)
      ).toFixed(2),
    };

    res.json({ success: true, data: { links: formatted, totals } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── POST /admin/referrals ─────────────────────────────────────────────────────

router.post('/referrals', async (req: Request, res: Response) => {
  try {
    const { slug, label, commissionRate = 0.2 } = req.body;
    if (!slug || !label) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS' } });
    }

    const link = await prisma.referralLink.create({
      data: { slug: slug.toLowerCase().replace(/\s+/g, '-'), label, commissionRate: parseFloat(commissionRate) },
    });

    res.json({ success: true, data: { link } });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, error: { code: 'SLUG_EXISTS', message: 'A referral link with this slug already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ── PATCH /admin/referrals/:id ────────────────────────────────────────────────

router.patch('/referrals/:id', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    const updated = await prisma.referralLink.update({
      where: { id: req.params.id },
      data: { isActive },
    });
    res.json({ success: true, data: { link: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

export default router;
