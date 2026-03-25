/**
 * Credits Routes — FEAT-10: One-time credit purchases
 *
 * GET  /api/v1/credits/balance       — current balance + upsell data
 * GET  /api/v1/credits/transactions  — paginated transaction history
 * POST /api/v1/credits/checkout      — create Stripe one-time Checkout session
 * POST /api/v1/credits/spend         — deduct credits for a premium action
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import Stripe from 'stripe';
import { deductCredits } from '../services/credits';

// Credit costs per action — must match frontend CREDIT_COSTS in credits-api.ts
const CREDIT_COSTS: Record<string, number> = {
  oracle_sonnet: 2,
  oracle_opus:   4,
  solar_return:  1,
  lunar_return:  1,
  synastry:      3,
  natal_pdf:     1,
};

const router = Router();

// Stripe (lazy init)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}

// Pack definitions — must match frontend CREDIT_PACKS
const PACK_INFO: Record<string, { credits: number; amountCents: number; priceId: string | undefined }> = {
  starter:    { credits: 3,  amountCents: 299,  priceId: process.env.STRIPE_CREDITS_STARTER_PRICE_ID },
  popular:    { credits: 10, amountCents: 799,  priceId: process.env.STRIPE_CREDITS_POPULAR_PRICE_ID },
  best_value: { credits: 25, amountCents: 1499, priceId: process.env.STRIPE_CREDITS_BEST_VALUE_PRICE_ID },
};

router.use(authMiddleware);

// ─── GET /balance ──────────────────────────────────────────────────────────────

router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Auto-create credits row if missing
    const credits = await prisma.userCredits.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // EUR spent on credit purchases in last 30 days (for upsell threshold)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const spentResult = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        type: 'purchase',
        createdAt: { gte: thirtyDaysAgo },
        purchaseAmountCents: { not: null },
      },
      _sum: { purchaseAmountCents: true },
    });

    const spentEurLast30Days = ((spentResult._sum.purchaseAmountCents ?? 0) / 100);

    res.json({
      success: true,
      data: {
        balance: credits.balance,
        totalPurchased: credits.totalPurchased,
        totalSpent: credits.totalSpent,
        spentEurLast30Days,
      },
    });
  } catch (err) {
    console.error('[credits/balance]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /transactions ─────────────────────────────────────────────────────────

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: transactions });
  } catch (err) {
    console.error('[credits/transactions]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /checkout ────────────────────────────────────────────────────────────

router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!stripe) {
      return res.status(503).json({ error: 'Payment system unavailable' });
    }

    const { packId, currency = 'EUR' } = req.body as { packId: string; currency?: string };
    const pack = PACK_INFO[packId];

    if (!pack) {
      return res.status(400).json({ error: `Unknown pack: ${packId}` });
    }

    if (!pack.priceId) {
      return res.status(503).json({ error: `Stripe price not configured for pack: ${packId}` });
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, subscription: { select: { stripeCustomerId: true } } },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId } });
      customerId = customer.id;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: pack.priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${frontendUrl}/dashboard?credits=purchased&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard?credits=cancelled`,
      metadata: {
        userId,
        packId,
        type: 'credits',
      },
    });

    res.json({ success: true, data: { checkoutUrl: session.url } });
  } catch (err) {
    console.error('[credits/checkout]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /spend ───────────────────────────────────────────────────────────────

router.post('/spend', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { action, relatedEntityId } = req.body as { action: string; relatedEntityId?: string };

    const cost = CREDIT_COSTS[action];
    if (cost === undefined) {
      return res.status(400).json({ error: `Unknown credit action: ${action}` });
    }

    // Auto-create credits row if missing (0 balance)
    await prisma.userCredits.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const { newBalance } = await deductCredits(
      userId,
      cost,
      `${action} credit spend`,
      action,
      relatedEntityId
    );

    res.json({ success: true, data: { newBalance, cost, action } });
  } catch (err: any) {
    if (err?.code === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: err.required,
        available: err.available,
      });
    }
    console.error('[credits/spend]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
