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
var credits_exports = {};
__export(credits_exports, {
  default: () => credits_default
});
module.exports = __toCommonJS(credits_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_prisma = require("../utils/prisma");
var import_stripe = __toESM(require("stripe"));
var import_credits = require("../services/credits");
const CREDIT_COSTS = {
  oracle_sonnet: 2,
  oracle_opus: 4,
  solar_return: 1,
  lunar_return: 1,
  synastry: 3,
  natal_pdf: 1
};
const router = (0, import_express.Router)();
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
}
const PACK_INFO = {
  starter: { credits: 3, amountCents: 299, priceId: process.env.STRIPE_CREDITS_STARTER_PRICE_ID },
  popular: { credits: 10, amountCents: 799, priceId: process.env.STRIPE_CREDITS_POPULAR_PRICE_ID },
  best_value: { credits: 25, amountCents: 1499, priceId: process.env.STRIPE_CREDITS_BEST_VALUE_PRICE_ID }
};
router.use(import_auth.authMiddleware);
router.get("/balance", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const credits = await import_prisma.prisma.userCredits.upsert({
      where: { userId },
      create: { userId },
      update: {}
    });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
    const spentResult = await import_prisma.prisma.creditTransaction.aggregate({
      where: {
        userId,
        type: "purchase",
        createdAt: { gte: thirtyDaysAgo },
        purchaseAmountCents: { not: null }
      },
      _sum: { purchaseAmountCents: true }
    });
    const spentEurLast30Days = (spentResult._sum.purchaseAmountCents ?? 0) / 100;
    res.json({
      success: true,
      data: {
        balance: credits.balance,
        totalPurchased: credits.totalPurchased,
        totalSpent: credits.totalSpent,
        spentEurLast30Days
      }
    });
  } catch (err) {
    console.error("[credits/balance]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/transactions", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const transactions = await import_prisma.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        createdAt: true
      }
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    console.error("[credits/transactions]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/checkout", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!stripe) {
      return res.status(503).json({ error: "Payment system unavailable" });
    }
    const { packId, currency = "EUR" } = req.body;
    const pack = PACK_INFO[packId];
    if (!pack) {
      return res.status(400).json({ error: `Unknown pack: ${packId}` });
    }
    if (!pack.priceId) {
      return res.status(503).json({ error: `Stripe price not configured for pack: ${packId}` });
    }
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, subscription: { select: { stripeCustomerId: true } } }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId } });
      customerId = customer.id;
    }
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3003";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: pack.priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${frontendUrl}/dashboard?credits=purchased&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard?credits=cancelled`,
      metadata: {
        userId,
        packId,
        type: "credits"
      }
    });
    res.json({ success: true, data: { checkoutUrl: session.url } });
  } catch (err) {
    console.error("[credits/checkout]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/spend", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { action, relatedEntityId } = req.body;
    const cost = CREDIT_COSTS[action];
    if (cost === void 0) {
      return res.status(400).json({ error: `Unknown credit action: ${action}` });
    }
    await import_prisma.prisma.userCredits.upsert({
      where: { userId },
      create: { userId },
      update: {}
    });
    const { newBalance } = await (0, import_credits.deductCredits)(
      userId,
      cost,
      `${action} credit spend`,
      action,
      relatedEntityId
    );
    res.json({ success: true, data: { newBalance, cost, action } });
  } catch (err) {
    if (err?.code === "INSUFFICIENT_CREDITS") {
      return res.status(402).json({
        error: "Insufficient credits",
        code: "INSUFFICIENT_CREDITS",
        required: err.required,
        available: err.available
      });
    }
    console.error("[credits/spend]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
var credits_default = router;
