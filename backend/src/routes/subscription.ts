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
import { getUserUsageStats } from '../middleware/queryLimit';
import { TIER_CONFIG, getEffectiveMonthlyLimit } from '../config/subscription-tiers';

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
    price: { monthly: 9.99, yearly: 89.88 }, // 25% off yearly
    priceBgn: { monthly: 19.56, yearly: 175.96 }, // Fixed BGN price for simplicity
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
    price: { monthly: 19.99, yearly: 179.88 }, // 25% off yearly
    priceBgn: { monthly: 39.10, yearly: 351.96 }, // Fixed BGN price for simplicity
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
      select: { tier: true, language: true },
    });
    
    const lang = user?.language || 'bg';
    
    // Determine effective tier
    const effectiveTier = subscription?.tier || user?.tier || 'FREE';
    const effectiveStatus = subscription?.status || 'ACTIVE';

    // Get real usage stats for this user
    const usageStats = await getUserUsageStats(userId, effectiveTier);

    // Build response
    const response: any = {
      tier: effectiveTier,
      status: effectiveStatus,
      usage: {
        queriesThisMonth: usageStats.used,
        queriesLimit: usageStats.limit,
        queriesRemaining: usageStats.remaining,
        percentage: usageStats.percentage,
        resetDate: usageStats.resetAt,
      },
      limits: {
        monthly: usageStats.limit,
        burst: 10,
        canMakeQuery: usageStats.remaining === 'unlimited' || (typeof usageStats.remaining === 'number' && usageStats.remaining > 0),
        limitReached: typeof usageStats.remaining === 'number' && usageStats.remaining <= 0,
        nearLimit: usageStats.percentage !== null && usageStats.percentage >= 67,
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

// POST /api/v1/subscription/pause - Pause subscription billing for 1 or 2 months
router.post('/pause', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { months } = req.body;

    if (months !== 1 && months !== 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MONTHS', message: 'months must be 1 or 2' },
      });
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId } });

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' },
      });
    }

    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Payment processing not available' },
      });
    }

    const resumesAt = Math.floor(Date.now() / 1000) + months * 30 * 24 * 60 * 60;

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: { behavior: 'void', resumes_at: resumesAt },
    });

    res.json({
      success: true,
      data: {
        message: `Subscription paused for ${months} month${months > 1 ? 's' : ''}`,
        resumesAt: new Date(resumesAt * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PAUSE_ERROR', message: 'Failed to pause subscription' },
    });
  }
});

// POST /api/v1/subscription/resume - Resume a paused subscription immediately
router.post('/resume', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const subscription = await prisma.subscription.findUnique({ where: { userId } });

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' },
      });
    }

    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Payment processing not available' },
      });
    }

    // Pass empty string to clear pause_collection
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: '' as any,
    });

    res.json({
      success: true,
      data: { message: 'Subscription resumed' },
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({
      success: false,
      error: { code: 'RESUME_ERROR', message: 'Failed to resume subscription' },
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
      paidAt: invoice.status === 'paid'
        ? new Date(((invoice.status_transitions as any)?.paid_at ?? invoice.created) * 1000).toISOString()
        : null,
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
        const { userId, type: paymentType, tier, billingPeriod = 'monthly' } = session.metadata || {};

        // Credits one-time purchase — handled in credits route webhook handler
        if (paymentType === 'credits') {
          await handleCreditsPurchaseWebhook(session);
          break;
        }

        // Gift purchase — giftCodeId in metadata signals a gift one-time payment
        if (session.metadata?.giftCodeId) {
          await handleGiftPaymentWebhook(session);
          break;
        }

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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string | null;
        if (paymentIntentId) {
          await cancelGiftCodeByPaymentIntent(paymentIntentId, 'charge.refunded');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await cancelGiftCodeByPaymentIntent(paymentIntent.id, 'payment_intent.payment_failed');
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

// ─── Gift webhook helpers ───────────────────────────────────────────────────

/**
 * Handle a Stripe `checkout.session.completed` event for gift purchases.
 * Idempotent: skips if GiftCode is already ACTIVE.
 * FEAT-14-D (PIX-212)
 */
async function handleGiftPaymentWebhook(session: Stripe.Checkout.Session): Promise<void> {
  const giftCodeId = session.metadata?.giftCodeId;
  if (!giftCodeId) return;

  const paymentIntentId = session.payment_intent as string | null;

  const giftCode = await prisma.giftCode.findUnique({ where: { id: giftCodeId } });
  if (!giftCode) {
    console.error('[gift webhook] GiftCode not found:', giftCodeId);
    return;
  }

  // Idempotency: already activated — skip
  if (giftCode.status !== 'PENDING_PAYMENT') {
    console.log(`[gift webhook] GiftCode ${giftCodeId} already in status ${giftCode.status} — skipping`);
    return;
  }

  await prisma.giftCode.update({
    where: { id: giftCodeId },
    data: {
      status: 'ACTIVE',
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId ?? undefined,
    },
  });

  console.log(`[gift webhook] GiftCode ${giftCode.code} activated (session: ${session.id})`);

  // Send purchase confirmation to purchaser
  await sendGiftPurchaseEmail(giftCode.purchaserEmail, giftCode.code, giftCode.durationMonths, giftCode.claimExpiresAt);

  // If recipient email was provided, notify them too
  if (giftCode.recipientEmail) {
    await sendGiftRecipientEmail(giftCode.recipientEmail, giftCode.code, giftCode.durationMonths, giftCode.claimExpiresAt);
  }
}

/**
 * Cancel a GiftCode (status → CANCELLED) by Stripe payment intent ID.
 * No-op if no matching gift code exists (most payment intents are not gifts).
 */
async function cancelGiftCodeByPaymentIntent(paymentIntentId: string, reason: string): Promise<void> {
  const giftCode = await prisma.giftCode.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!giftCode) return; // Not a gift payment — ignore

  if (giftCode.status === 'CANCELLED') {
    console.log(`[gift webhook] GiftCode ${giftCode.id} already CANCELLED — skipping (${reason})`);
    return;
  }

  await prisma.giftCode.update({
    where: { id: giftCode.id },
    data: { status: 'CANCELLED' },
  });

  console.log(`[gift webhook] GiftCode ${giftCode.code} cancelled via ${reason}`);
}

/**
 * Send gift purchase confirmation email to the purchaser.
 * Includes the gift code and a CTA to forward to the recipient.
 */
async function sendGiftPurchaseEmail(
  to: string,
  code: string,
  durationMonths: number,
  claimExpiresAt: Date
): Promise<void> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redeemUrl = `${frontendUrl}/en/redeem`;
    const expiryDate = claimExpiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const durationLabel = durationMonths === 1 ? '1 month' : `${durationMonths} months`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
      to,
      subject: `Your AstroLogAI gift is ready — ${durationLabel} of PREMIUM`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">✨ AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 16px;">Your gift is ready!</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Thank you for purchasing a <strong style="color: #8B5CF6;">${durationLabel} AstroLogAI PREMIUM</strong> gift.
            Share the code below with your recipient — or forward this email to them.
          </p>
          <div style="background: #12121A; border: 1px solid #8B5CF6; border-radius: 12px; padding: 28px; text-align: center; margin: 28px 0;">
            <p style="color: #A1A1AA; font-size: 14px; margin: 0 0 12px 0;">Gift code</p>
            <p style="color: #FAFAFA; font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 0;">${code}</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${redeemUrl}?code=${code}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Redeem at AstroLogAI
            </a>
          </div>
          <p style="color: #71717A; font-size: 14px;">Code valid until: <strong style="color: #A1A1AA;">${expiryDate}</strong></p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            © 2026 AstroLogAI. All rights reserved.<br>Questions? support@astrologaai.com
          </p>
        </div>
      `,
    });

    console.log(`[gift email] Purchase confirmation sent to ${to}`);
  } catch (err) {
    console.error('[gift email] Failed to send purchase confirmation:', err);
    // Non-fatal — don't block webhook response
  }
}

/**
 * Send gift notification email to the recipient.
 * Sent immediately when recipientEmail is provided at purchase time.
 */
async function sendGiftRecipientEmail(
  to: string,
  code: string,
  durationMonths: number,
  claimExpiresAt: Date
): Promise<void> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redeemUrl = `${frontendUrl}/en/redeem`;
    const expiryDate = claimExpiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const durationLabel = durationMonths === 1 ? '1 month' : `${durationMonths} months`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
      to,
      subject: `You've received an AstroLogAI gift — ${durationLabel} of PREMIUM ✨`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">✨ AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 16px;">You've received a gift!</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Someone special sent you <strong style="color: #8B5CF6;">${durationLabel} of AstroLogAI PREMIUM</strong> —
            unlimited AI astrology, natal charts, transits, compatibility reports, and more.
          </p>
          <div style="background: #12121A; border: 1px solid #8B5CF6; border-radius: 12px; padding: 28px; text-align: center; margin: 28px 0;">
            <p style="color: #A1A1AA; font-size: 14px; margin: 0 0 12px 0;">Your gift code</p>
            <p style="color: #FAFAFA; font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 0;">${code}</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${redeemUrl}?code=${code}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Activate Your Gift
            </a>
          </div>
          <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8B5CF6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #A1A1AA; font-size: 14px; margin: 0;">
              ✓ Unlimited AI astrologer conversations<br>
              ✓ Full natal chart + transit analysis<br>
              ✓ Compatibility reports<br>
              ✓ Best Days personal calendar<br>
              ✓ Solar Return report
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px;">Code valid until: <strong style="color: #A1A1AA;">${expiryDate}</strong></p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            © 2026 AstroLogAI. All rights reserved.<br>Questions? support@astrologaai.com
          </p>
        </div>
      `,
    });

    console.log(`[gift email] Recipient notification sent to ${to}`);
  } catch (err) {
    console.error('[gift email] Failed to send recipient notification:', err);
    // Non-fatal
  }
}

// ─── Credits webhook helper ────────────────────────────────────────────────

/**
 * Handle a Stripe `checkout.session.completed` event for credits purchases.
 * Called when session.metadata.type === 'credits'.
 * Idempotent: uses stripePaymentIntentId unique constraint to prevent double-credit.
 */
async function handleCreditsPurchaseWebhook(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, packId } = session.metadata || {};
  if (!userId || !packId) {
    console.error('[credits webhook] Missing userId or packId in metadata', session.id);
    return;
  }

  const PACK_INFO: Record<string, { credits: number; amountCents: number }> = {
    starter:    { credits: 3,  amountCents: 299  },
    popular:    { credits: 10, amountCents: 799  },
    best_value: { credits: 25, amountCents: 1499 },
  };

  const pack = PACK_INFO[packId];
  if (!pack) {
    console.error('[credits webhook] Unknown packId:', packId);
    return;
  }

  const { credits, amountCents } = pack;

  const paymentIntentId = session.payment_intent as string | null;

  await prisma.$transaction(async (tx) => {
    // Idempotency: skip if this payment_intent was already processed
    if (paymentIntentId) {
      const existing = await tx.creditTransaction.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });
      if (existing) return;
    }

    // Upsert balance row
    const current = await tx.userCredits.upsert({
      where: { userId },
      create: { userId, balance: 0, totalPurchased: 0, totalSpent: 0 },
      update: {},
    });

    const newBalance = current.balance + credits;

    await tx.userCredits.update({
      where: { userId },
      data: {
        balance: newBalance,
        totalPurchased: { increment: credits },
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: 'purchase',
        amount: credits,
        balanceAfter: newBalance,
        description: `Purchased ${credits} credits (${packId})`,
        stripePaymentIntentId: paymentIntentId ?? undefined,
        purchaseAmountCents: amountCents,
      },
    });
  });

  console.log(`[credits] +${credits} credits for user ${userId} (pack: ${packId})`);
}

export default router;
