"use strict";
/**
 * Credits Routes — FEAT-10: One-time credit purchases
 *
 * GET  /api/v1/credits/balance       — current balance + upsell data
 * GET  /api/v1/credits/transactions  — paginated transaction history
 * POST /api/v1/credits/checkout      — create Stripe one-time Checkout session
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../utils/prisma");
const stripe_1 = require("stripe");
const router = (0, express_1.Router)();
// Stripe (lazy init)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}
// Pack definitions — must match frontend CREDIT_PACKS
const PACK_INFO = {
    starter: { credits: 3, amountCents: 299, get priceId() { return process.env.STRIPE_CREDITS_STARTER_PRICE_ID; } },
    popular: { credits: 10, amountCents: 799, get priceId() { return process.env.STRIPE_CREDITS_POPULAR_PRICE_ID; } },
    best_value: { credits: 25, amountCents: 1499, get priceId() { return process.env.STRIPE_CREDITS_BEST_VALUE_PRICE_ID; } },
};
router.use(auth_1.authMiddleware);
// GET /balance
router.get('/balance', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const credits = await prisma_1.prisma.userCredits.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const spentResult = await prisma_1.prisma.creditTransaction.aggregate({
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
    }
    catch (err) {
        console.error('[credits/balance]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /transactions
router.get('/transactions', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;
        const transactions = await prisma_1.prisma.creditTransaction.findMany({
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
    }
    catch (err) {
        console.error('[credits/transactions]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /checkout
router.post('/checkout', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!stripe)
            return res.status(503).json({ error: 'Payment system unavailable' });
        const { packId, currency = 'EUR' } = req.body;
        const pack = PACK_INFO[packId];
        if (!pack)
            return res.status(400).json({ error: `Unknown pack: ${packId}` });
        if (!pack.priceId)
            return res.status(503).json({ error: `Stripe price not configured for pack: ${packId}` });
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, subscription: { select: { stripeCustomerId: true } } },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
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
    }
    catch (err) {
        console.error('[credits/checkout]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
