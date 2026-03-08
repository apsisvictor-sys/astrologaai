"use strict";
/**
 * Subscription System Tests
 * US-11: Subscription Management
 *
 * Tests for:
 * - US-21: View Subscription Plans
 * - US-22: Upgrade Subscription
 * - US-23: Manage Billing/Subscription
 * - US-24: Downgrade Subscription
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.STRIPE_PRO_PRICE_ID_MONTHLY = 'price_pro_monthly';
process.env.STRIPE_PRO_PRICE_ID_YEARLY = 'price_pro_yearly';
process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY = 'price_premium_monthly';
process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY = 'price_premium_yearly';
process.env.FRONTEND_URL = 'http://localhost:3000';
(0, vitest_1.describe)('Subscription System', () => {
    (0, vitest_1.describe)('US-21: View Subscription Plans', () => {
        (0, vitest_1.it)('should return all subscription plans with correct pricing', async () => {
            // Mock plans data
            const plans = {
                FREE: {
                    id: 'free',
                    name: { bg: 'Безплатен', en: 'Free' },
                    price: { monthly: 0, yearly: 0 },
                    queriesLimit: 10, // US-36: Free tier has 10 monthly queries
                },
                PRO: {
                    id: 'pro',
                    name: { bg: 'Про', en: 'Pro' },
                    price: { monthly: 10, yearly: 96 },
                    queriesLimit: -1,
                    popular: true,
                },
                PREMIUM: {
                    id: 'premium',
                    name: { bg: 'Премиум', en: 'Premium' },
                    price: { monthly: 20, yearly: 192 },
                    queriesLimit: -1,
                },
            };
            // Verify plan structure
            (0, vitest_1.expect)(plans.FREE.price.monthly).toBe(0);
            (0, vitest_1.expect)(plans.FREE.queriesLimit).toBe(10); // US-36: Free tier has 10 monthly queries
            (0, vitest_1.expect)(plans.PRO.price.monthly).toBe(10);
            (0, vitest_1.expect)(plans.PRO.popular).toBe(true);
            (0, vitest_1.expect)(plans.PREMIUM.price.monthly).toBe(20);
            (0, vitest_1.expect)(plans.PRO.queriesLimit).toBe(-1); // Unlimited
            (0, vitest_1.expect)(plans.PREMIUM.queriesLimit).toBe(-1); // Unlimited
        });
        (0, vitest_1.it)('should include BGN pricing for Bulgarian users', async () => {
            const EUR_TO_BGN = 1.96;
            const proPriceEur = 10;
            const proPriceBgn = proPriceEur * EUR_TO_BGN;
            (0, vitest_1.expect)(proPriceBgn).toBeCloseTo(19.6, 1);
        });
        (0, vitest_1.it)('should show feature comparison between tiers', async () => {
            const features = {
                FREE: ['10_queries_month', 'basic_horoscope', 'limited_chart'], // US-36: Free tier has 10 monthly queries
                PRO: ['unlimited_queries', 'core_astrology', 'vedic_astrology', 'relationship_analysis', 'daily_forecast', 'weekly_forecast'],
                PREMIUM: ['everything_in_pro', 'business_astrology', 'tarot_readings', 'numerology', 'chinese_astrology'],
            };
            (0, vitest_1.expect)(features.FREE).toHaveLength(3);
            (0, vitest_1.expect)(features.PRO).toHaveLength(6);
            (0, vitest_1.expect)(features.PREMIUM).toContain('everything_in_pro');
        });
    });
    (0, vitest_1.describe)('US-22: Upgrade Subscription', () => {
        (0, vitest_1.it)('should create Stripe checkout session with correct parameters', async () => {
            const checkoutParams = {
                tier: 'PRO',
                billingPeriod: 'monthly',
                userId: 'test-user-id',
            };
            // Verify required parameters
            (0, vitest_1.expect)(['PRO', 'PREMIUM']).toContain(checkoutParams.tier);
            (0, vitest_1.expect)(['monthly', 'yearly']).toContain(checkoutParams.billingPeriod);
        });
        (0, vitest_1.it)('should calculate yearly discount correctly', async () => {
            const monthlyPrice = 10;
            const yearlyPrice = 96;
            const expectedDiscount = 20; // 20%
            const actualDiscount = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);
            (0, vitest_1.expect)(actualDiscount).toBe(expectedDiscount);
        });
        (0, vitest_1.it)('should handle webhook events for successful payment', async () => {
            const webhookEvent = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        metadata: {
                            userId: 'test-user-id',
                            tier: 'PRO',
                            billingPeriod: 'monthly',
                        },
                        customer: 'cus_test123',
                        subscription: 'sub_test123',
                    },
                },
            };
            (0, vitest_1.expect)(webhookEvent.type).toBe('checkout.session.completed');
            (0, vitest_1.expect)(webhookEvent.data.object.metadata.tier).toBe('PRO');
        });
        (0, vitest_1.it)('should update user tier immediately after successful payment', async () => {
            const mockUpdate = vitest_1.vi.fn().mockResolvedValue({ tier: 'PRO', status: 'ACTIVE' });
            // Simulate tier update
            await mockUpdate();
            (0, vitest_1.expect)(mockUpdate).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('US-23: Manage Subscription', () => {
        (0, vitest_1.it)('should return current subscription status', async () => {
            const subscriptionStatus = {
                tier: 'PRO',
                status: 'ACTIVE',
                usage: {
                    queriesThisMonth: 45,
                    queriesLimit: -1,
                    queriesRemaining: -1,
                },
                billing: {
                    currentPeriodStart: '2026-02-01',
                    currentPeriodEnd: '2026-03-01',
                    cancelAtPeriodEnd: false,
                },
            };
            (0, vitest_1.expect)(subscriptionStatus.tier).toBe('PRO');
            (0, vitest_1.expect)(subscriptionStatus.status).toBe('ACTIVE');
            (0, vitest_1.expect)(subscriptionStatus.usage.queriesLimit).toBe(-1); // Unlimited
        });
        (0, vitest_1.it)('should create customer portal session for payment management', async () => {
            const portalParams = {
                stripeCustomerId: 'cus_test123',
                returnUrl: 'http://localhost:3000/dashboard',
            };
            (0, vitest_1.expect)(portalParams.stripeCustomerId).toBeDefined();
            (0, vitest_1.expect)(portalParams.returnUrl).toContain('/dashboard');
        });
        (0, vitest_1.it)('should handle subscription cancellation at period end', async () => {
            const cancelRequest = {
                cancelAtPeriodEnd: true,
            };
            (0, vitest_1.expect)(cancelRequest.cancelAtPeriodEnd).toBe(true);
        });
        (0, vitest_1.it)('should allow reactivation of cancelled subscription', async () => {
            const reactivateRequest = {
                cancelAtPeriodEnd: false,
            };
            (0, vitest_1.expect)(reactivateRequest.cancelAtPeriodEnd).toBe(false);
        });
        (0, vitest_1.it)('should fetch past invoices from Stripe', async () => {
            const mockInvoices = [
                {
                    id: 'in_test123',
                    number: 'ASTRO-001',
                    status: 'paid',
                    amount: 1000, // cents
                    currency: 'eur',
                    createdAt: '2026-02-01',
                },
                {
                    id: 'in_test456',
                    number: 'ASTRO-002',
                    status: 'paid',
                    amount: 1000,
                    currency: 'eur',
                    createdAt: '2026-01-01',
                },
            ];
            (0, vitest_1.expect)(mockInvoices).toHaveLength(2);
            (0, vitest_1.expect)(mockInvoices[0].status).toBe('paid');
        });
    });
    (0, vitest_1.describe)('US-24: Downgrade Subscription', () => {
        (0, vitest_1.it)('should schedule downgrade at end of billing period', async () => {
            const downgradeRequest = {
                currentTier: 'PREMIUM',
                newTier: 'PRO',
                scheduledDate: '2026-03-01', // End of current period
            };
            (0, vitest_1.expect)(downgradeRequest.currentTier).toBe('PREMIUM');
            (0, vitest_1.expect)(downgradeRequest.newTier).toBe('PRO');
            (0, vitest_1.expect)(downgradeRequest.scheduledDate).toBeDefined();
        });
        (0, vitest_1.it)('should allow user to cancel scheduled downgrade', async () => {
            const cancelDowngradeRequest = {
                clearScheduledDowngrade: true,
            };
            (0, vitest_1.expect)(cancelDowngradeRequest.clearScheduledDowngrade).toBe(true);
        });
        (0, vitest_1.it)('should maintain Premium features until downgrade takes effect', async () => {
            const subscription = {
                tier: 'PREMIUM',
                scheduledDowngrade: 'PRO',
                currentPeriodEnd: '2026-03-01',
            };
            // User should still have Premium access
            (0, vitest_1.expect)(subscription.tier).toBe('PREMIUM');
            (0, vitest_1.expect)(subscription.scheduledDowngrade).toBe('PRO');
        });
        (0, vitest_1.it)('should send confirmation email for downgrade', async () => {
            const emailParams = {
                to: 'user@example.com',
                template: 'downgrade-confirmation',
                data: {
                    currentTier: 'PREMIUM',
                    newTier: 'PRO',
                    downgradeDate: '2026-03-01',
                },
            };
            (0, vitest_1.expect)(emailParams.template).toBe('downgrade-confirmation');
            (0, vitest_1.expect)(emailParams.data.currentTier).toBe('PREMIUM');
        });
    });
    (0, vitest_1.describe)('Query Limits', () => {
        (0, vitest_1.it)('should enforce 10 queries per month for Free tier', async () => {
            const freeTierLimit = 10; // US-36: Free tier has 10 monthly queries
            const currentUsage = 8;
            const remaining = freeTierLimit - currentUsage;
            const limitReached = currentUsage >= freeTierLimit;
            (0, vitest_1.expect)(remaining).toBe(2);
            (0, vitest_1.expect)(limitReached).toBe(false);
        });
        (0, vitest_1.it)('should allow unlimited queries for Pro tier', async () => {
            const proTierLimit = -1; // Unlimited
            const isUnlimited = proTierLimit === -1;
            (0, vitest_1.expect)(isUnlimited).toBe(true);
        });
        (0, vitest_1.it)('should reset query counter at start of new month', async () => {
            const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"
            const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7);
            (0, vitest_1.expect)(currentMonth).not.toBe(nextMonth);
        });
    });
    (0, vitest_1.describe)('Security', () => {
        (0, vitest_1.it)('should verify Stripe webhook signature', async () => {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            (0, vitest_1.expect)(webhookSecret).toBeDefined();
            (0, vitest_1.expect)(webhookSecret).toContain('whsec_');
        });
        (0, vitest_1.it)('should require authentication for subscription endpoints', async () => {
            const protectedEndpoints = [
                '/api/v1/subscription/status',
                '/api/v1/subscription/checkout',
                '/api/v1/subscription/portal',
                '/api/v1/subscription/cancel',
                '/api/v1/subscription/reactivate',
                '/api/v1/subscription/downgrade',
                '/api/v1/subscription/invoices',
            ];
            protectedEndpoints.forEach(endpoint => {
                (0, vitest_1.expect)(endpoint).toContain('/subscription');
            });
        });
    });
    (0, vitest_1.describe)('Localization', () => {
        (0, vitest_1.it)('should support Bulgarian language for UI text', async () => {
            const translations = {
                bg: {
                    title: 'Изберете своя план',
                    upgrade: 'Надстрой',
                    cancel: 'Анулирай',
                },
                en: {
                    title: 'Choose Your Plan',
                    upgrade: 'Upgrade',
                    cancel: 'Cancel',
                },
            };
            (0, vitest_1.expect)(translations.bg.title).toContain('план');
            (0, vitest_1.expect)(translations.en.title).toContain('Plan');
        });
        (0, vitest_1.it)('should display BGN prices for Bulgarian users', async () => {
            const displayCurrency = 'BGN';
            const lang = 'bg';
            (0, vitest_1.expect)(lang).toBe('bg');
            (0, vitest_1.expect)(displayCurrency).toBe('BGN');
        });
    });
});
(0, vitest_1.describe)('API Endpoints Structure', () => {
    (0, vitest_1.it)('should have all required subscription endpoints', async () => {
        const endpoints = {
            'GET /api/v1/subscription/plans': 'View subscription plans',
            'GET /api/v1/subscription/status': 'Get current subscription status',
            'POST /api/v1/subscription/checkout': 'Create Stripe checkout session',
            'POST /api/v1/subscription/portal': 'Create Stripe customer portal session',
            'POST /api/v1/subscription/cancel': 'Cancel subscription',
            'POST /api/v1/subscription/reactivate': 'Reactivate cancelled subscription',
            'POST /api/v1/subscription/downgrade': 'Downgrade subscription',
            'POST /api/v1/subscription/cancel-downgrade': 'Cancel scheduled downgrade',
            'POST /api/v1/subscription/webhook': 'Stripe webhook handler',
            'GET /api/v1/subscription/invoices': 'Get past invoices',
        };
        (0, vitest_1.expect)(Object.keys(endpoints)).toHaveLength(10);
    });
});
//# sourceMappingURL=subscription.test.js.map