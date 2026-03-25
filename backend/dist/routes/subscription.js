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
var subscription_exports = {};
__export(subscription_exports, {
  default: () => subscription_default
});
module.exports = __toCommonJS(subscription_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_prisma = require("../utils/prisma");
var import_stripe = __toESM(require("stripe"));
var import_queryLimit = require("../middleware/queryLimit");
var import_subscription_tiers = require("../config/subscription-tiers");
const router = (0, import_express.Router)();
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16"
    });
  }
} catch (error) {
  console.warn("Stripe initialization failed:", error);
}
const SUBSCRIPTION_PLANS = {
  FREE: {
    id: "free",
    name: { bg: "\u0411\u0435\u0437\u043F\u043B\u0430\u0442\u0435\u043D", en: "Free" },
    description: { bg: "\u0417\u0430\u043F\u043E\u0447\u043D\u0435\u0442\u0435 \u0441\u0432\u043E\u0435\u0442\u043E \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u043D\u043E \u043F\u044A\u0442\u0443\u0432\u0430\u043D\u0435", en: "Start your astrological journey" },
    price: { monthly: 0, yearly: 0 },
    priceBgn: { monthly: 0, yearly: 0 },
    currency: "EUR",
    features: [
      { key: "10_queries_month", included: true, name: { bg: "10 \u0437\u0430\u044F\u0432\u043A\u0438 \u043C\u0435\u0441\u0435\u0447\u043D\u043E", en: "10 queries per month" } },
      { key: "basic_horoscope", included: true, name: { bg: "\u041E\u0441\u043D\u043E\u0432\u0435\u043D \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F", en: "Basic horoscope" } },
      { key: "limited_chart", included: true, name: { bg: "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D \u0434\u043E\u0441\u0442\u044A\u043F \u0434\u043E \u043A\u0430\u0440\u0442\u0430\u0442\u0430", en: "Limited chart access" } }
    ],
    notIncluded: [
      { key: "unlimited_queries", name: { bg: "\u041D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438 \u0437\u0430\u044F\u0432\u043A\u0438", en: "Unlimited queries" } },
      { key: "vedic_astrology", name: { bg: "\u0412\u0435\u0434\u0438\u0447\u0435\u0441\u043A\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u044F", en: "Vedic astrology" } },
      { key: "relationship_analysis", name: { bg: "\u0410\u043D\u0430\u043B\u0438\u0437 \u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0438", en: "Relationship analysis" } },
      { key: "daily_forecast", name: { bg: "\u0414\u043D\u0435\u0432\u043D\u0438 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0438", en: "Daily forecasts" } },
      { key: "weekly_forecast", name: { bg: "\u0421\u0435\u0434\u043C\u0438\u0447\u043D\u0438 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0438", en: "Weekly forecasts" } }
    ],
    queriesLimit: 10
  },
  PRO: {
    id: "pro",
    name: { bg: "\u041F\u0440\u043E", en: "Pro" },
    description: { bg: "\u041F\u044A\u043B\u043D\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u043D\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F", en: "Full astrological personalization" },
    price: { monthly: 9.99, yearly: 89.88 },
    // 25% off yearly
    priceBgn: { monthly: 19.56, yearly: 175.96 },
    // Fixed BGN price for simplicity
    currency: "EUR",
    popular: true,
    features: [
      { key: "unlimited_queries", included: true, name: { bg: "\u041D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438 \u0437\u0430\u044F\u0432\u043A\u0438", en: "Unlimited queries" } },
      { key: "core_astrology", included: true, name: { bg: "\u041E\u0441\u043D\u043E\u0432\u043D\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u044F (20+ API)", en: "Core astrology (20+ APIs)" } },
      { key: "vedic_astrology", included: true, name: { bg: "\u0412\u0435\u0434\u0438\u0447\u0435\u0441\u043A\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u044F (15+)", en: "Vedic astrology (15+)" } },
      { key: "relationship_analysis", included: true, name: { bg: "\u0410\u043D\u0430\u043B\u0438\u0437 \u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0438", en: "Relationship analysis" } },
      { key: "daily_forecast", included: true, name: { bg: "\u0414\u043D\u0435\u0432\u043D\u0438 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0438", en: "Daily forecasts" } },
      { key: "weekly_forecast", included: true, name: { bg: "\u0421\u0435\u0434\u043C\u0438\u0447\u043D\u0438 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0438", en: "Weekly forecasts" } },
      { key: "full_chart_access", included: true, name: { bg: "\u041F\u044A\u043B\u0435\u043D \u0434\u043E\u0441\u0442\u044A\u043F \u0434\u043E \u043A\u0430\u0440\u0442\u0430\u0442\u0430", en: "Full chart access" } }
    ],
    notIncluded: [
      { key: "business_astrology", name: { bg: "\u0411\u0438\u0437\u043D\u0435\u0441 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u044F", en: "Business astrology" } },
      { key: "tarot_readings", name: { bg: "\u0422\u0430\u0440\u043E\u0442 \u0433\u0430\u0434\u0430\u043D\u0438\u044F", en: "Tarot readings" } },
      { key: "numerology", name: { bg: "\u041D\u0443\u043C\u0435\u0440\u043E\u043B\u043E\u0433\u0438\u044F", en: "Numerology" } },
      { key: "chinese_astrology", name: { bg: "\u041A\u0438\u0442\u0430\u0439\u0441\u043A\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u044F", en: "Chinese astrology" } }
    ],
    queriesLimit: -1,
    // unlimited
    stripePriceIdMonthly: process.env.STRIPE_PRO_PRICE_ID_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRO_PRICE_ID_YEARLY
  },
  PREMIUM: {
    id: "premium",
    name: { bg: "\u041F\u0440\u0435\u043C\u0438\u0443\u043C", en: "Premium" },
    description: { bg: "\u041F\u044A\u043B\u0435\u043D \u0434\u043E\u0441\u0442\u044A\u043F \u0434\u043E \u0432\u0441\u0438\u0447\u043A\u043E", en: "Full access to everything" },
    price: { monthly: 19.99, yearly: 179.88 },
    // 25% off yearly
    priceBgn: { monthly: 39.1, yearly: 351.96 },
    // Fixed BGN price for simplicity
    currency: "EUR",
    features: [
      { key: "everything_in_pro", included: true, name: { bg: "\u0412\u0441\u0438\u0447\u043A\u043E \u043E\u0442 \u041F\u0440\u043E \u043F\u043B\u0430\u043D\u0430", en: "Everything in Pro" } },
      { key: "business_astrology", included: true, name: { bg: "\u0411\u0438\u0437\u043D\u0435\u0441 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u044F", en: "Business astrology" } },
      { key: "tarot_readings", included: true, name: { bg: "\u0422\u0430\u0440\u043E\u0442 \u0433\u0430\u0434\u0430\u043D\u0438\u044F", en: "Tarot readings" } },
      { key: "numerology", included: true, name: { bg: "\u041D\u0443\u043C\u0435\u0440\u043E\u043B\u043E\u0433\u0438\u044F", en: "Numerology" } },
      { key: "chinese_astrology", included: true, name: { bg: "\u041A\u0438\u0442\u0430\u0439\u0441\u043A\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u044F", en: "Chinese astrology" } },
      { key: "priority_support", included: true, name: { bg: "\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u043D\u0430 \u043F\u043E\u0434\u0434\u0440\u044A\u0436\u043A\u0430", en: "Priority support" } }
    ],
    notIncluded: [],
    queriesLimit: -1,
    // unlimited
    stripePriceIdMonthly: process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY
  }
};
const EUR_TO_BGN = 1.96;
async function getUserUsage(userId) {
  const user = await import_prisma.prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true }
  });
  const tier = user?.tier || "FREE";
  const stats = await (0, import_queryLimit.getUserUsageStats)(userId, tier);
  return {
    queriesThisMonth: stats.used,
    limit: stats.limit
  };
}
router.get("/plans", async (req, res) => {
  try {
    const acceptLanguage = req.headers["accept-language"];
    const lang = acceptLanguage?.includes("en") ? "en" : "bg";
    let userSubscription = null;
    let userUsage = null;
    if (req.headers.authorization) {
      try {
        const userId = req.user?.id;
        if (userId) {
          userSubscription = await import_prisma.prisma.subscription.findUnique({
            where: { userId }
          });
          userUsage = await getUserUsage(userId);
        }
      } catch (e) {
      }
    }
    const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name[lang],
      description: plan.description[lang],
      price: {
        monthly: plan.price.monthly,
        yearly: plan.price.yearly,
        currency: plan.currency
      },
      priceBgn: {
        monthly: plan.priceBgn.monthly,
        yearly: plan.priceBgn.yearly,
        currency: "BGN"
      },
      features: plan.features.map((f) => f.name[lang]),
      notIncluded: plan.notIncluded.map((f) => f.name[lang]),
      popular: plan.popular || false,
      queriesLimit: plan.queriesLimit
    }));
    res.json({
      success: true,
      data: {
        plans,
        currentSubscription: userSubscription ? {
          tier: userSubscription.tier,
          status: userSubscription.status
        } : null,
        userUsage: userUsage || null,
        currency: lang === "bg" ? "BGN" : "EUR",
        conversionRate: EUR_TO_BGN
      }
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch subscription plans"
      }
    });
  }
});
router.get("/status", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await import_prisma.prisma.subscription.findUnique({
      where: { userId }
    });
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, language: true }
    });
    const lang = user?.language || "bg";
    const effectiveTier = subscription?.tier || user?.tier || "FREE";
    const effectiveStatus = subscription?.status || "ACTIVE";
    const usageStats = await (0, import_queryLimit.getUserUsageStats)(userId, effectiveTier);
    const response = {
      tier: effectiveTier,
      status: effectiveStatus,
      usage: {
        queriesThisMonth: usageStats.used,
        queriesLimit: usageStats.limit,
        queriesRemaining: usageStats.remaining,
        percentage: usageStats.percentage,
        resetDate: usageStats.resetAt
      },
      limits: {
        monthly: usageStats.limit,
        burst: 10,
        canMakeQuery: usageStats.remaining === "unlimited" || typeof usageStats.remaining === "number" && usageStats.remaining > 0,
        limitReached: typeof usageStats.remaining === "number" && usageStats.remaining <= 0,
        nearLimit: usageStats.percentage !== null && usageStats.percentage >= 67
      },
      features: getFeaturesForTier(effectiveTier),
      tierConfig: import_subscription_tiers.TIER_CONFIG[effectiveTier]
    };
    if (subscription && effectiveStatus === "ACTIVE") {
      response.billing = {
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        scheduledDowngrade: subscription.scheduledDowngrade,
        stripeCustomerId: subscription.stripeCustomerId
      };
    }
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch subscription status"
      }
    });
  }
});
router.post("/checkout", import_auth.authMiddleware, async (req, res) => {
  try {
    const { tier, billingPeriod = "monthly", promoCode } = req.body;
    if (!["PRO", "PREMIUM"].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TIER",
          message: "Invalid subscription tier"
        }
      });
    }
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: "STRIPE_NOT_CONFIGURED",
          message: "Payment processing is not available"
        }
      });
    }
    const userId = req.user.id;
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, referredBySlug: true }
    });
    let subscription = await import_prisma.prisma.subscription.findUnique({
      where: { userId }
    });
    let customerId = subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.fullName || void 0,
        metadata: {
          userId
        }
      });
      customerId = customer.id;
      await import_prisma.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          tier: "FREE",
          status: "ACTIVE"
        },
        update: {
          stripeCustomerId: customerId
        }
      });
    }
    const plan = SUBSCRIPTION_PLANS[tier];
    const priceId = billingPeriod === "yearly" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) {
      return res.status(503).json({
        success: false,
        error: {
          code: "PRICE_NOT_CONFIGURED",
          message: "This subscription plan is not available"
        }
      });
    }
    let discounts;
    try {
      if (promoCode) {
        const dc = await import_prisma.prisma.discountCode.findUnique({
          where: { code: promoCode.trim().toUpperCase(), isActive: true },
          select: { stripePromotionCodeId: true }
        });
        if (dc?.stripePromotionCodeId) {
          discounts = [{ promotion_code: dc.stripePromotionCodeId }];
        }
      } else if (user?.referredBySlug) {
        const referralLink = await import_prisma.prisma.referralLink.findUnique({
          where: { slug: user.referredBySlug, isActive: true },
          select: { discountCode: true }
        });
        if (referralLink?.discountCode) {
          const dc = await import_prisma.prisma.discountCode.findUnique({
            where: { code: referralLink.discountCode, isActive: true },
            select: { stripePromotionCodeId: true }
          });
          if (dc?.stripePromotionCodeId) {
            discounts = [{ promotion_code: dc.stripePromotionCodeId }];
          }
        }
      }
    } catch (err) {
      console.warn("[Checkout] Failed to resolve discount:", err);
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: "subscription",
      ...discounts ? { discounts } : {},
      success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/pricing?checkout=cancel`,
      metadata: {
        userId,
        tier,
        billingPeriod
      }
    });
    res.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id
      }
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "CHECKOUT_ERROR",
        message: "Failed to create checkout session"
      }
    });
  }
});
router.post("/portal", import_auth.authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: "STRIPE_NOT_CONFIGURED",
          message: "Payment processing is not available"
        }
      });
    }
    const userId = req.user.id;
    const subscription = await import_prisma.prisma.subscription.findUnique({
      where: { userId }
    });
    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_SUBSCRIPTION",
          message: "No active subscription found"
        }
      });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`
    });
    res.json({
      success: true,
      data: {
        portalUrl: session.url
      }
    });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "PORTAL_ERROR",
        message: "Failed to create portal session"
      }
    });
  }
});
router.post("/cancel", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await import_prisma.prisma.subscription.findUnique({
      where: { userId }
    });
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_SUBSCRIPTION",
          message: "No active subscription to cancel"
        }
      });
    }
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: "STRIPE_NOT_CONFIGURED",
          message: "Payment processing is not available"
        }
      });
    }
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    await import_prisma.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true
      }
    });
    res.json({
      success: true,
      data: {
        message: "Subscription will be canceled at the end of the billing period",
        cancelDate: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "CANCEL_ERROR",
        message: "Failed to cancel subscription"
      }
    });
  }
});
router.post("/reactivate", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await import_prisma.prisma.subscription.findUnique({
      where: { userId }
    });
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_SUBSCRIPTION",
          message: "No subscription found to reactivate"
        }
      });
    }
    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NOT_CANCELLED",
          message: "Subscription is not scheduled for cancellation"
        }
      });
    }
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: "STRIPE_NOT_CONFIGURED",
          message: "Payment processing is not available"
        }
      });
    }
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    });
    await import_prisma.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false
      }
    });
    res.json({
      success: true,
      data: {
        message: "Subscription reactivated successfully",
        nextPaymentDate: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "REACTIVATE_ERROR",
        message: "Failed to reactivate subscription"
      }
    });
  }
});
router.post("/pause", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { months } = req.body;
    if (months !== 1 && months !== 2) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_MONTHS", message: "months must be 1 or 2" }
      });
    }
    const subscription = await import_prisma.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: { code: "NO_SUBSCRIPTION", message: "No active subscription found" }
      });
    }
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Payment processing not available" }
      });
    }
    const resumesAt = Math.floor(Date.now() / 1e3) + months * 30 * 24 * 60 * 60;
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: { behavior: "void", resumes_at: resumesAt }
    });
    res.json({
      success: true,
      data: {
        message: `Subscription paused for ${months} month${months > 1 ? "s" : ""}`,
        resumesAt: new Date(resumesAt * 1e3).toISOString()
      }
    });
  } catch (error) {
    console.error("Error pausing subscription:", error);
    res.status(500).json({
      success: false,
      error: { code: "PAUSE_ERROR", message: "Failed to pause subscription" }
    });
  }
});
router.post("/resume", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await import_prisma.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: { code: "NO_SUBSCRIPTION", message: "No active subscription found" }
      });
    }
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Payment processing not available" }
      });
    }
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: ""
    });
    res.json({
      success: true,
      data: { message: "Subscription resumed" }
    });
  } catch (error) {
    console.error("Error resuming subscription:", error);
    res.status(500).json({
      success: false,
      error: { code: "RESUME_ERROR", message: "Failed to resume subscription" }
    });
  }
});
router.get("/invoices", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await import_prisma.prisma.subscription.findUnique({
      where: { userId }
    });
    if (!subscription?.stripeCustomerId) {
      return res.json({
        success: true,
        data: {
          invoices: []
        }
      });
    }
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: "STRIPE_NOT_CONFIGURED",
          message: "Payment processing is not available"
        }
      });
    }
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 24
      // Last 2 years of monthly invoices
    });
    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid / 100,
      // Convert from cents
      currency: invoice.currency.toUpperCase(),
      createdAt: new Date(invoice.created * 1e3).toISOString(),
      paidAt: invoice.status === "paid" ? new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1e3).toISOString() : null,
      invoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      description: invoice.lines.data[0]?.description || "Subscription"
    }));
    res.json({
      success: true,
      data: {
        invoices: formattedInvoices
      }
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INVOICES_ERROR",
        message: "Failed to fetch invoices"
      }
    });
  }
});
async function sendSubscriptionConfirmationEmail(userEmail, tier, billingPeriod, amount, currency, language = "bg") {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const planName = tier === "PRO" ? language === "bg" ? "\u041F\u0440\u043E" : "Pro" : language === "bg" ? "\u041F\u0440\u0435\u043C\u0438\u0443\u043C" : "Premium";
    const periodText = billingPeriod === "yearly" ? language === "bg" ? "\u0413\u043E\u0434\u0438\u0448\u0435\u043D" : "Yearly" : language === "bg" ? "\u041C\u0435\u0441\u0435\u0447\u0435\u043D" : "Monthly";
    const emailSubject = language === "bg" ? `\u041F\u043E\u0442\u0432\u044A\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0437\u0430 \u0430\u0431\u043E\u043D\u0430\u043C\u0435\u043D\u0442 - AstroLogAI ${planName}` : `Subscription Confirmed - AstroLogAI ${planName}`;
    const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/${language === "en" ? "en/" : ""}dashboard`;
    const emailHtml = language === "bg" ? `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">\u2728 AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">\u0410\u0431\u043E\u043D\u0430\u043C\u0435\u043D\u0442\u044A\u0442 \u0435 \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u0430\u043D!</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            \u0411\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u0438\u043C \u0432\u0438 \u0437\u0430 \u0438\u0437\u0431\u043E\u0440\u0430 \u043D\u0430 <strong style="color: #8B5CF6;">AstroLogAI ${planName}</strong>!
            \u0412\u0430\u0448\u0435\u0442\u043E \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u043D\u043E \u043F\u044A\u0442\u0443\u0432\u0430\u043D\u0435 \u0437\u0430\u043F\u043E\u0447\u0432\u0430 \u0441\u0435\u0433\u0430.
          </p>
          <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">\u0414\u0435\u0442\u0430\u0439\u043B\u0438 \u043D\u0430 \u0430\u0431\u043E\u043D\u0430\u043C\u0435\u043D\u0442\u0430</h3>
            <table style="width: 100%; color: #A1A1AA; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0;">\u041F\u043B\u0430\u043D:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">\u041F\u0435\u0440\u0438\u043E\u0434:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA;">${periodText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">\u0421\u0443\u043C\u0430:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA; font-weight: bold;">${currency === "EUR" ? "\u20AC" : ""}${amount.toFixed(2)} ${currency}</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              \u0417\u0430\u043F\u043E\u0447\u043D\u0435\u0442\u0435 \u0434\u0430 \u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0442\u0435
            </a>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10B981; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #10B981; font-size: 14px; margin: 0;">
              \u2713 \u041D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438 \u0437\u0430\u044F\u0432\u043A\u0438 \u043A\u044A\u043C AI \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0430<br>
              \u2713 \u041F\u044A\u043B\u0435\u043D \u0434\u043E\u0441\u0442\u044A\u043F \u0434\u043E \u0432\u0441\u0438\u0447\u043A\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u0438<br>
              \u2713 \u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u043D\u0430 \u043F\u043E\u0434\u0434\u0440\u044A\u0436\u043A\u0430
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            \u041C\u043E\u0436\u0435\u0442\u0435 \u0434\u0430 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0432\u0430\u0442\u0435 \u0430\u0431\u043E\u043D\u0430\u043C\u0435\u043D\u0442\u0430 \u0441\u0438 \u043F\u043E \u0432\u0441\u044F\u043A\u043E \u0432\u0440\u0435\u043C\u0435 \u043E\u0442 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438\u0442\u0435 \u043D\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u0430.
          </p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            \xA9 2026 AstroLogAI. \u0412\u0441\u0438\u0447\u043A\u0438 \u043F\u0440\u0430\u0432\u0430 \u0437\u0430\u043F\u0430\u0437\u0435\u043D\u0438.<br>
            \u0417\u0430 \u0432\u044A\u043F\u0440\u043E\u0441\u0438: support@astrologaai.com
          </p>
        </div>
      ` : `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">\u2728 AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">Subscription Activated!</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Thank you for choosing <strong style="color: #8B5CF6;">AstroLogAI ${planName}</strong>!
            Your astrological journey begins now.
          </p>
          <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Subscription Details</h3>
            <table style="width: 100%; color: #A1A1AA; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0;">Plan:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Period:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA;">${periodText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Amount:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA; font-weight: bold;">${currency === "EUR" ? "\u20AC" : ""}${amount.toFixed(2)} ${currency}</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Start Using Now
            </a>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10B981; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #10B981; font-size: 14px; margin: 0;">
              \u2713 Unlimited AI astrologer queries<br>
              \u2713 Full access to all features<br>
              \u2713 Priority support
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            You can manage your subscription anytime from your profile settings.
          </p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            \xA9 2026 AstroLogAI. All rights reserved.<br>
            Questions? support@astrologaai.com
          </p>
        </div>
      `;
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@astrologaai.com",
      to: userEmail,
      subject: emailSubject,
      html: emailHtml
    });
    console.log(`[Subscription] Confirmation email sent to: ${userEmail}`);
  } catch (emailError) {
    console.error("[Subscription] Failed to send confirmation email:", emailError);
  }
}
router.post("/webhook", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ received: true });
  }
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not set \u2014 refusing to process unverified webhook");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }
  if (!sig) {
    console.warn("[Webhook] Request missing stripe-signature header \u2014 rejecting");
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, type: paymentType, tier, billingPeriod = "monthly" } = session.metadata || {};
        if (paymentType === "credits") {
          await handleCreditsPurchaseWebhook(session);
          break;
        }
        if (userId && tier) {
          const user = await import_prisma.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, language: true }
          });
          const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
          const periodStart = new Date(stripeSubscription.current_period_start * 1e3);
          const periodEnd = new Date(stripeSubscription.current_period_end * 1e3);
          await import_prisma.prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              tier,
              status: "ACTIVE",
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd
            },
            update: {
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              tier,
              status: "ACTIVE",
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false
            }
          });
          await import_prisma.prisma.user.update({
            where: { id: userId },
            data: { tier }
          });
          try {
            const referredUser = await import_prisma.prisma.user.findUnique({
              where: { id: userId },
              select: { referredBySlug: true }
            });
            if (referredUser?.referredBySlug) {
              const referralLink = await import_prisma.prisma.referralLink.findUnique({
                where: { slug: referredUser.referredBySlug },
                select: { id: true, commissionRate: true }
              });
              if (referralLink) {
                const existing = await import_prisma.prisma.referralConversion.findFirst({
                  where: { userId },
                  select: { id: true }
                });
                if (!existing) {
                  const amountTotal = session.amount_total ?? 0;
                  const commissionCents = Math.round(amountTotal * referralLink.commissionRate);
                  await import_prisma.prisma.referralConversion.create({
                    data: {
                      linkId: referralLink.id,
                      userId,
                      tier,
                      revenueEurCents: amountTotal,
                      commissionCents
                    }
                  });
                  console.log(`[Webhook] ReferralConversion created for user ${userId} via slug ${referredUser.referredBySlug}`);
                }
              }
            }
          } catch (err) {
            console.error("[Webhook] Failed to record referral conversion:", err);
          }
          if (user?.email) {
            const plan = SUBSCRIPTION_PLANS[tier];
            const amount = billingPeriod === "yearly" ? plan.price.yearly : plan.price.monthly;
            await sendSubscriptionConfirmationEmail(
              user.email,
              tier,
              billingPeriod,
              amount,
              "EUR",
              user.language || "bg"
            );
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const dbSubscription = await import_prisma.prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId }
        });
        if (dbSubscription) {
          await import_prisma.prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: mapStripeSubscriptionStatus(subscription.status),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodStart: new Date(subscription.current_period_start * 1e3),
              currentPeriodEnd: new Date(subscription.current_period_end * 1e3)
            }
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const dbSubscription = await import_prisma.prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId }
        });
        if (dbSubscription) {
          await import_prisma.prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: "CANCELED",
              tier: "FREE"
            }
          });
          await import_prisma.prisma.user.update({
            where: { id: dbSubscription.userId },
            data: { tier: "FREE" }
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const dbSubscription = await import_prisma.prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId }
        });
        if (dbSubscription) {
          await import_prisma.prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: "PAST_DUE"
            }
          });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const dbSubscription = await import_prisma.prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId }
        });
        if (dbSubscription) {
          await import_prisma.prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: "ACTIVE",
              currentPeriodStart: new Date(invoice.period_start * 1e3),
              currentPeriodEnd: new Date(invoice.period_end * 1e3)
            }
          });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Error handling webhook event:", error);
    res.status(500).json({ received: true, error: "Webhook handler failed" });
  }
});
function getNextMonthResetDate() {
  const now = /* @__PURE__ */ new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
function getFeaturesForTier(tier) {
  const plan = SUBSCRIPTION_PLANS[tier];
  if (!plan) return [];
  return plan.features.map((f) => f.key);
}
function getLimitsForTier(tier) {
  const plan = SUBSCRIPTION_PLANS[tier];
  if (!plan) return { queries: 10, partners: 0, conversations: "limited" };
  return {
    queries: plan.queriesLimit === -1 ? "unlimited" : plan.queriesLimit,
    partners: tier === "FREE" ? 0 : tier === "PRO" ? 10 : -1,
    conversations: plan.queriesLimit === -1 ? "unlimited" : "limited"
  };
}
function mapStripeSubscriptionStatus(status) {
  const statusMap = {
    active: "ACTIVE",
    canceled: "CANCELED",
    past_due: "PAST_DUE",
    unpaid: "UNPAID",
    trialing: "TRIALING"
  };
  return statusMap[status] || "ACTIVE";
}
async function handleCreditsPurchaseWebhook(session) {
  const { userId, packId } = session.metadata || {};
  if (!userId || !packId) {
    console.error("[credits webhook] Missing userId or packId in metadata", session.id);
    return;
  }
  const PACK_INFO = {
    starter: { credits: 3, amountCents: 299 },
    popular: { credits: 10, amountCents: 799 },
    best_value: { credits: 25, amountCents: 1499 }
  };
  const pack = PACK_INFO[packId];
  if (!pack) {
    console.error("[credits webhook] Unknown packId:", packId);
    return;
  }
  const { credits, amountCents } = pack;
  const paymentIntentId = session.payment_intent;
  await import_prisma.prisma.$transaction(async (tx) => {
    if (paymentIntentId) {
      const existing = await tx.creditTransaction.findUnique({
        where: { stripePaymentIntentId: paymentIntentId }
      });
      if (existing) return;
    }
    const current = await tx.userCredits.upsert({
      where: { userId },
      create: { userId, balance: 0, totalPurchased: 0, totalSpent: 0 },
      update: {}
    });
    const newBalance = current.balance + credits;
    await tx.userCredits.update({
      where: { userId },
      data: {
        balance: newBalance,
        totalPurchased: { increment: credits }
      }
    });
    await tx.creditTransaction.create({
      data: {
        userId,
        type: "purchase",
        amount: credits,
        balanceAfter: newBalance,
        description: `Purchased ${credits} credits (${packId})`,
        stripePaymentIntentId: paymentIntentId ?? void 0,
        purchaseAmountCents: amountCents
      }
    });
  });
  console.log(`[credits] +${credits} credits for user ${userId} (pack: ${packId})`);
}
var subscription_default = router;
