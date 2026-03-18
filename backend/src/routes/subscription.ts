/**
 * Subscription Routes
 * Handles Stripe subscription management, plans, and status
 * 
 * US-36: Free-tier Query Limit Enforcement
 * - Enhanced /status endpoint with detailed usage stats
 * - Query limit checking and enforcement
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import Stripe from 'stripe';
import { getUserUsageStats, checkQueryLimit } from '../middleware/queryLimit';
import { TIER_CONFIG, getEffectiveMonthlyLimit, getTierLimits } from '../config/subscription-tiers';

const router = Router();

// Initialize Stripe (will use env variable if available)
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
} catch (error) {
  console.warn('Stripe initialization failed:', error);
}

// Subscription plans configuration
interface PlanConfig {
  id: string;
  name: { bg: string; en: string };
  description: { bg: string; en: string };
  price: { monthly: number; yearly: number };
  priceBgn: { monthly: number; yearly: number };
  currency: string;
  features: { key: string; included: boolean; name: { bg: string; en: string } }[];
  notIncluded: { key: string; name: { bg: string; en: string } }[];
  queriesLimit: number;
  popular?: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  FREE: {
    id: 'free',
    name: { bg: 'Безплатен', en: 'Free' },
    description: { bg: 'Започнете своето астрологично пътуване', en: 'Start your astrological journey' },
    price: { monthly: 0, yearly: 0 },
    priceBgn: { monthly: 0, yearly: 0 },
    currency: 'EUR',
    features: [
      { key: '10_queries_month', included: true, name: { bg: '10 заявки месечно', en: '10 queries per month' } },
      { key: 'basic_horoscope', included: true, name: { bg: 'Основен хороскоп', en: 'Basic horoscope' } },
      { key: 'limited_chart', included: true, name: { bg: 'Ограничен достъп до картата', en: 'Limited chart access' } },
    ],
    notIncluded: [
      { key: 'unlimited_queries', name: { bg: 'Неограничени заявки', en: 'Unlimited queries' } },
      { key: 'vedic_astrology', name: { bg: 'Ведическа астрология', en: 'Vedic astrology' } },
      { key: 'relationship_analysis', name: { bg: 'Анализ на връзки', en: 'Relationship analysis' } },
      { key: 'daily_forecast', name: { bg: 'Дневни прогнози', en: 'Daily forecasts' } },
      { key: 'weekly_forecast', name: { bg: 'Седмични прогнози', en: 'Weekly forecasts' } },
    ],
    queriesLimit: 10,
  },
  PRO: {
    id: 'pro',
    name: { bg: 'Про', en: 'Pro' },
    description: { bg: 'Пълна астрологична персонализация', en: 'Full astrological personalization' },
    price: { monthly: 10, yearly: 96 }, // ~20% discount for yearly
    priceBgn: { monthly: 20, yearly: 192 }, // Fixed BGN price for simplicity
    currency: 'EUR',
    popular: true,
    features: [
      { key: 'unlimited_queries', included: true, name: { bg: 'Неограничени заявки', en: 'Unlimited queries' } },
      { key: 'core_astrology', included: true, name: { bg: 'Основна астрология (20+ API)', en: 'Core astrology (20+ APIs)' } },
      { key: 'vedic_astrology', included: true, name: { bg: 'Ведическа астрология (15+)', en: 'Vedic astrology (15+)' } },
      { key: 'relationship_analysis', included: true, name: { bg: 'Анализ на връзки', en: 'Relationship analysis' } },
      { key: 'daily_forecast', included: true, name: { bg: 'Дневни прогнози', en: 'Daily forecasts' } },
      { key: 'weekly_forecast', included: true, name: { bg: 'Седмични прогнози', en: 'Weekly forecasts' } },
      { key: 'full_chart_access', included: true, name: { bg: 'Пълен достъп до картата', en: 'Full chart access' } },
    ],
    notIncluded: [
      { key: 'business_astrology', name: { bg: 'Бизнес астрология', en: 'Business astrology' } },
      { key: 'tarot_readings', name: { bg: 'Тарот гадания', en: 'Tarot readings' } },
      { key: 'numerology', name: { bg: 'Нумерология', en: 'Numerology' } },
      { key: 'chinese_astrology', name: { bg: 'Китайска астрология', en: 'Chinese astrology' } },
    ],
    queriesLimit: -1, // unlimited
    stripePriceIdMonthly: process.env.STRIPE_PRO_PRICE_ID_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRO_PRICE_ID_YEARLY,
  },
  PREMIUM: {
    id: 'premium',
    name: { bg: 'Премиум', en: 'Premium' },
    description: { bg: 'Пълен достъп до всичко', en: 'Full access to everything' },
    price: { monthly: 20, yearly: 192 }, // ~20% discount for yearly
    priceBgn: { monthly: 40, yearly: 384 }, // Fixed BGN price for simplicity
    currency: 'EUR',
    features: [
      { key: 'everything_in_pro', included: true, name: { bg: 'Всичко от Про плана', en: 'Everything in Pro' } },
      { key: 'business_astrology', included: true, name: { bg: 'Бизнес астрология', en: 'Business astrology' } },
      { key: 'tarot_readings', included: true, name: { bg: 'Тарот гадания', en: 'Tarot readings' } },
      { key: 'numerology', included: true, name: { bg: 'Нумерология', en: 'Numerology' } },
      { key: 'chinese_astrology', included: true, name: { bg: 'Китайска астрология', en: 'Chinese astrology' } },
      { key: 'priority_support', included: true, name: { bg: 'Приоритетна поддръжка', en: 'Priority support' } },
    ],
    notIncluded: [],
    queriesLimit: -1, // unlimited
    stripePriceIdMonthly: process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY,
  },
};

// EUR to BGN conversion rate
const EUR_TO_BGN = 1.96;

// Helper to get user's current usage (US-36: Uses centralized limit config)
async function getUserUsage(userId: string): Promise<{ queriesThisMonth: number; limit: number | 'unlimited' }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });
  
  const tier = user?.tier || 'FREE';
  const stats = await getUserUsageStats(userId, tier);
  
  return {
    queriesThisMonth: stats.used,
    limit: stats.limit,
  };
}

// GET /api/v1/subscription/plans - Get all available subscription plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    // Get user's language preference (default to Bulgarian)
    const acceptLanguage = req.headers['accept-language'];
    const lang = acceptLanguage?.includes('en') ? 'en' : 'bg';
    
    // Get user's current subscription status if authenticated
    let userSubscription = null;
    let userUsage = null;
    
    if (req.headers.authorization) {
      try {
        const userId = (req as any).user?.id;
        if (userId) {
          userSubscription = await prisma.subscription.findUnique({
            where: { userId },
          });
          userUsage = await getUserUsage(userId);
        }
      } catch (e) {
        // User not authenticated, continue without user-specific data
      }
    }
    
    // Format plans for response
    const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name[lang],
      description: plan.description[lang],
      price: {
        monthly: plan.price.monthly,
        yearly: plan.price.yearly,
        currency: plan.currency,
      },
      priceBgn: {
        monthly: plan.priceBgn.monthly,
        yearly: plan.priceBgn.yearly,
        currency: 'BGN',
      },
      features: plan.features.map((f) => f.name[lang]),
      notIncluded: plan.notIncluded.map((f) => f.name[lang]),
      popular: plan.popular || false,
      queriesLimit: plan.queriesLimit,
    }));
    
    res.json({
      success: true,
      data: {
        plans,
        currentSubscription: userSubscription ? {
          tier: userSubscription.tier,
          status: userSubscription.status,
        } : null,
        userUsage: userUsage || null,
        currency: lang === 'bg' ? 'BGN' : 'EUR',
        conversionRate: EUR_TO_BGN,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch subscription plans',
      },
    });
  }
});

// GET /api/v1/subscription/status - Get user's current subscription status
// US-36: Enhanced with detailed query limit info
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    // Get user's tier from User model as fallback
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, language: true, dailyQueryCount: true, lastQueryDate: true },
    });
    
    const lang = user?.language || 'bg';
    
    // Determine effective tier
    const effectiveTier = subscription?.tier || user?.tier || 'FREE';
    const effectiveStatus = subscription?.status || 'ACTIVE';
    
    // US-36: Get detailed usage stats
    const usageStats = await getUserUsageStats(userId, effectiveTier);
    
    // Check current query limit status
    const limitStatus = await checkQueryLimit(userId, effectiveTier);
    
    // For FREE tier (daily-limited), compute daily usage directly from user record
    const tierCfg = getTierLimits(effectiveTier);
    let usageBlock: Record<string, unknown>;
    if (tierCfg.dailyQueries) {
      const now = new Date();
      const last = user?.lastQueryDate;
      const isNewDay = !last || (
        last.getDate() !== now.getDate() ||
        last.getMonth() !== now.getMonth() ||
        last.getFullYear() !== now.getFullYear()
      );
      const dailyUsed = isNewDay ? 0 : (user?.dailyQueryCount ?? 0);
      const dailyLimit = tierCfg.dailyQueries;
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      usageBlock = {
        queriesThisMonth: dailyUsed,
        queriesLimit: dailyLimit,
        queriesRemaining: Math.max(0, dailyLimit - dailyUsed),
        percentage: Math.round((dailyUsed / dailyLimit) * 100),
        resetDate: tomorrow.toISOString(),
        resetType: 'daily',
      };
    } else {
      usageBlock = {
        queriesThisMonth: usageStats.used,
        queriesLimit: usageStats.limit,
        queriesRemaining: usageStats.remaining,
        percentage: usageStats.percentage,
        resetDate: usageStats.resetAt,
        resetType: 'monthly',
      };
    }

    // Build response
    const response: any = {
      tier: effectiveTier,
      status: effectiveStatus,
      usage: usageBlock,
      // US-36: Additional limit details for UI
      limits: {
        monthly: usageStats.limit,
        burst: limitStatus.burstRemaining,
        canMakeQuery: limitStatus.allowed,
        limitReached: !limitStatus.allowed && limitStatus.limitType === 'monthly',
        nearLimit: usageStats.percentage !== null && usageStats.percentage >= 80,
      },
      features: getFeaturesForTier(effectiveTier),
      tierConfig: TIER_CONFIG[effectiveTier],
    };
    
    // Add billing info if subscription is active
    if (subscription && effectiveStatus === 'ACTIVE') {
      response.billing = {
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        scheduledDowngrade: subscription.scheduledDowngrade,
        stripeCustomerId: subscription.stripeCustomerId,
      };
    }
    
    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch subscription status',
      },
    });
  }
});

// POST /api/v1/subscription/checkout - Create Stripe checkout session
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tier, billingPeriod = 'monthly', promoCode } = req.body;
    
    // Validate tier
    if (!['PRO', 'PREMIUM'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TIER',
          message: 'Invalid subscription tier',
        },
      });
    }
    
    // Check if Stripe is configured
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Payment processing is not available',
        },
      });
    }
    
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, referredBySlug: true },
    });
    
    // Get or create Stripe customer
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    let customerId = subscription?.stripeCustomerId;
    
    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.fullName || undefined,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;
      
      // Save customer ID
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          tier: 'FREE',
          status: 'ACTIVE',
        },
        update: {
          stripeCustomerId: customerId,
        },
      });
    }
    
    // Get price ID based on tier and billing period
    const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
    const priceId = billingPeriod === 'yearly' 
      ? plan.stripePriceIdYearly 
      : plan.stripePriceIdMonthly;
    
    if (!priceId) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'PRICE_NOT_CONFIGURED',
          message: 'This subscription plan is not available',
        },
      });
    }
    
    // Resolve optional discount — user-entered promo code takes priority over referral
    let discounts: { promotion_code: string }[] | undefined;
    try {
      if (promoCode) {
        // Direct promo code entered by user
        const dc = await prisma.discountCode.findUnique({
          where: { code: promoCode.trim().toUpperCase(), isActive: true },
          select: { stripePromotionCodeId: true },
        });
        if (dc?.stripePromotionCodeId) {
          discounts = [{ promotion_code: dc.stripePromotionCodeId }];
        }
      } else if (user?.referredBySlug) {
        // Fall back to discount from referral link
        const referralLink = await prisma.referralLink.findUnique({
          where: { slug: user.referredBySlug, isActive: true },
          select: { discountCode: true },
        });
        if (referralLink?.discountCode) {
          const dc = await prisma.discountCode.findUnique({
            where: { code: referralLink.discountCode, isActive: true },
            select: { stripePromotionCodeId: true },
          });
          if (dc?.stripePromotionCodeId) {
            discounts = [{ promotion_code: dc.stripePromotionCodeId }];
          }
        }
      }
    } catch (err) {
      console.warn('[Checkout] Failed to resolve discount:', err);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      ...(discounts ? { discounts } : {}),
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?checkout=cancel`,
      metadata: {
        userId,
        tier,
        billingPeriod,
      },
    });
    
    res.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECKOUT_ERROR',
        message: 'Failed to create checkout session',
      },
    });
  }
});

// POST /api/v1/subscription/portal - Create Stripe customer portal session
router.post('/portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Payment processing is not available',
        },
      });
    }
    
    const userId = (req as any).user.id;
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription found',
        },
      });
    }
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
    });
    
    res.json({
      success: true,
      data: {
        portalUrl: session.url,
      },
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PORTAL_ERROR',
        message: 'Failed to create portal session',
      },
    });
  }
});

// POST /api/v1/subscription/cancel - Cancel subscription
router.post('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription to cancel',
        },
      });
    }
    
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Payment processing is not available',
        },
      });
    }
    
    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    
    // Update database
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
    
    res.json({
      success: true,
      data: {
        message: 'Subscription will be canceled at the end of the billing period',
        cancelDate: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_ERROR',
        message: 'Failed to cancel subscription',
      },
    });
  }
});

// POST /api/v1/subscription/reactivate - Reactivate cancelled subscription
router.post('/reactivate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No subscription found to reactivate',
        },
      });
    }
    
    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_CANCELLED',
          message: 'Subscription is not scheduled for cancellation',
        },
      });
    }
    
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Payment processing is not available',
        },
      });
    }
    
    // Reactivate by removing cancel_at_period_end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    
    // Update database
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false,
      },
    });
    
    res.json({
      success: true,
      data: {
        message: 'Subscription reactivated successfully',
        nextPaymentDate: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REACTIVATE_ERROR',
        message: 'Failed to reactivate subscription',
      },
    });
  }
});

// GET /api/v1/subscription/invoices - Get past invoices
router.get('/invoices', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    if (!subscription?.stripeCustomerId) {
      return res.json({
        success: true,
        data: {
          invoices: [],
        },
      });
    }
    
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Payment processing is not available',
        },
      });
    }
    
    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 24, // Last 2 years of monthly invoices
    });
    
    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      createdAt: new Date(invoice.created * 1000).toISOString(),
      paidAt: invoice.status === 'paid' ? new Date(invoice.created * 1000).toISOString() : null,
      invoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      description: invoice.lines.data[0]?.description || 'Subscription',
    }));
    
    res.json({
      success: true,
      data: {
        invoices: formattedInvoices,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INVOICES_ERROR',
        message: 'Failed to fetch invoices',
      },
    });
  }
});

/**
 * Send subscription confirmation email
 * US-22: User receives confirmation email with receipt
 */
async function sendSubscriptionConfirmationEmail(
  userEmail: string,
  tier: string,
  billingPeriod: string,
  amount: number,
  currency: string,
  language: string = 'bg'
): Promise<void> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const planName = tier === 'PRO' 
      ? (language === 'bg' ? 'Про' : 'Pro')
      : (language === 'bg' ? 'Премиум' : 'Premium');
    
    const periodText = billingPeriod === 'yearly'
      ? (language === 'bg' ? 'Годишен' : 'Yearly')
      : (language === 'bg' ? 'Месечен' : 'Monthly');
    
    const emailSubject = language === 'bg'
      ? `Потвърждение за абонамент - AstroLogAI ${planName}`
      : `Subscription Confirmed - AstroLogAI ${planName}`;
    
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${language === 'en' ? 'en/' : ''}dashboard`;
    
    const emailHtml = language === 'bg'
      ? `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">✨ AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">Абонаментът е активиран!</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Благодарим ви за избора на <strong style="color: #8B5CF6;">AstroLogAI ${planName}</strong>!
            Вашето астрологично пътуване започва сега.
          </p>
          <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Детайли на абонамента</h3>
            <table style="width: 100%; color: #A1A1AA; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0;">План:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Период:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA;">${periodText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Сума:</td>
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA; font-weight: bold;">${currency === 'EUR' ? '€' : ''}${amount.toFixed(2)} ${currency}</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Започнете да използвате
            </a>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10B981; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #10B981; font-size: 14px; margin: 0;">
              ✓ Неограничени заявки към AI астролога<br>
              ✓ Пълен достъп до всички функции<br>
              ✓ Приоритетна поддръжка
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            Можете да управлявате абонамента си по всяко време от настройките на профила.
          </p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            © 2026 AstroLogAI. Всички права запазени.<br>
            За въпроси: support@astrologaai.com
          </p>
        </div>
      `
      : `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">✨ AstroLogAI</h1>
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
                <td style="padding: 8px 0; text-align: right; color: #FAFAFA; font-weight: bold;">${currency === 'EUR' ? '€' : ''}${amount.toFixed(2)} ${currency}</td>
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
              ✓ Unlimited AI astrologer queries<br>
              ✓ Full access to all features<br>
              ✓ Priority support
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            You can manage your subscription anytime from your profile settings.
          </p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            © 2026 AstroLogAI. All rights reserved.<br>
            Questions? support@astrologaai.com
          </p>
        </div>
      `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
      to: userEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log(`[Subscription] Confirmation email sent to: ${userEmail}`);
  } catch (emailError) {
    console.error('[Subscription] Failed to send confirmation email:', emailError);
    // Don't throw - email failure shouldn't affect subscription activation
  }
}

// POST /api/v1/subscription/webhook - Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ received: true });
  }
  
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET is not set — refusing to process unverified webhook');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!sig) {
    console.warn('[Webhook] Request missing stripe-signature header — rejecting');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, tier, billingPeriod = 'monthly' } = session.metadata || {};
        
        if (userId && tier) {
          // Get user for email and language preference
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, language: true },
          });

          // Use actual Stripe subscription period dates (not hardcoded 30 days)
          const stripeSubscription = await stripe!.subscriptions.retrieve(session.subscription as string);
          const periodStart = new Date(stripeSubscription.current_period_start * 1000);
          const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              tier: tier as any,
              status: 'ACTIVE',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              tier: tier as any,
              status: 'ACTIVE',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            },
          });
          
          // Update user tier
          await prisma.user.update({
            where: { id: userId },
            data: { tier: tier as any },
          });

          // Record referral conversion if this user was referred
          try {
            const referredUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { referredBySlug: true },
            });
            if (referredUser?.referredBySlug) {
              const referralLink = await prisma.referralLink.findUnique({
                where: { slug: referredUser.referredBySlug },
                select: { id: true, commissionRate: true },
              });
              if (referralLink) {
                // Idempotency guard — prevent double-creation if webhook fires twice
                const existing = await prisma.referralConversion.findFirst({
                  where: { userId },
                  select: { id: true },
                });
                if (!existing) {
                  const amountTotal = (session as any).amount_total ?? 0;
                  const commissionCents = Math.round(amountTotal * referralLink.commissionRate);
                  await prisma.referralConversion.create({
                    data: {
                      linkId: referralLink.id,
                      userId,
                      tier: tier as any,
                      revenueEurCents: amountTotal,
                      commissionCents,
                    },
                  });
                  console.log(`[Webhook] ReferralConversion created for user ${userId} via slug ${referredUser.referredBySlug}`);
                }
              }
            }
          } catch (err) {
            console.error('[Webhook] Failed to record referral conversion:', err);
            // Non-fatal — don't fail the webhook
          }

          // Send confirmation email (US-22)
          if (user?.email) {
            const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
            const amount = billingPeriod === 'yearly' 
              ? plan.price.yearly 
              : plan.price.monthly;
            
            await sendSubscriptionConfirmationEmail(
              user.email,
              tier,
              billingPeriod,
              amount,
              'EUR',
              user.language || 'bg'
            );
          }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        
        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: mapStripeSubscriptionStatus(subscription.status),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        
        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: 'CANCELED',
              tier: 'FREE',
            },
          });
          
          // Update user tier to FREE
          await prisma.user.update({
            where: { id: dbSubscription.userId },
            data: { tier: 'FREE' },
          });
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        
        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: 'PAST_DUE',
            },
          });
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        
        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: 'ACTIVE',
              currentPeriodStart: new Date(invoice.period_start * 1000),
              currentPeriodEnd: new Date(invoice.period_end * 1000),
            },
          });
        }
        break;
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ received: true, error: 'Webhook handler failed' });
  }
});

// Helper functions
function getNextMonthResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

function getFeaturesForTier(tier: string): string[] {
  const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
  if (!plan) return [];
  return plan.features.map((f) => f.key);
}

function getLimitsForTier(tier: string): { queries: number | 'unlimited'; partners: number; conversations: string } {
  const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
  if (!plan) return { queries: 10, partners: 0, conversations: 'limited' };
  
  return {
    queries: plan.queriesLimit === -1 ? 'unlimited' : plan.queriesLimit,
    partners: tier === 'FREE' ? 0 : tier === 'PRO' ? 10 : -1,
    conversations: plan.queriesLimit === -1 ? 'unlimited' : 'limited',
  };
}

function mapStripeSubscriptionStatus(status: string): 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'TRIALING' {
  const statusMap: Record<string, 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'TRIALING'> = {
    active: 'ACTIVE',
    canceled: 'CANCELED',
    past_due: 'PAST_DUE',
    unpaid: 'UNPAID',
    trialing: 'TRIALING',
  };
  return statusMap[status] || 'ACTIVE';
}

export default router;
