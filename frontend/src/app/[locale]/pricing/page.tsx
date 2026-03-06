'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { getApiBaseUrl, getFrontendBaseUrl } from '@/lib/runtime-config';
import { Sparkles, Check, ChevronDown } from 'lucide-react';

const API_URL = getApiBaseUrl();

interface Plan {
  id: string;
  name: string;
  description: string;
  price: { monthly: number; yearly: number; currency: string };
  priceBgn: { monthly: number; yearly: number; currency: string };
  features: string[];
  popular: boolean;
  queriesLimit: number;
}

interface SubscriptionData {
  plans: Plan[];
  currentSubscription: { tier: string; status: string } | null;
  userUsage: { queriesThisMonth: number; queriesLimit: number } | null;
}

export default function PricingPage() {
  const t = useTranslations('subscription');
  const locale = useLocale();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number[]>([]);

  useEffect(() => {
    async function fetchSubscriptionData() {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('astrologaai_access_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/api/v1/subscription/plans`, { headers });
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error('Error fetching subscription data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscriptionData();
  }, []);

  const handleCheckout = async (tier: string) => {
    if (!isAuthenticated) return router.push('/login?redirect=/pricing');

    try {
      setCheckoutLoading(tier);
      const token = localStorage.getItem('astrologaai_access_token');
      const response = await fetch(`${API_URL}/api/v1/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier,
          billingPeriod,
          successUrl: `${getFrontendBaseUrl()}/${locale === 'en' ? 'en/' : ''}dashboard?checkout=success`,
          cancelUrl: `${getFrontendBaseUrl()}/${locale === 'en' ? 'en/' : ''}pricing?checkout=cancel`,
        }),
      });
      const result = await response.json();
      if (result.data.checkoutUrl) window.location.href = result.data.checkoutUrl;
    } catch (err) {
      console.error(err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const toggleFaq = (index: number) => {
    setFaqOpen(p => p.includes(index) ? p.filter(i => i !== index) : [...p, index]);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-deep">
        <Sparkles className="w-8 h-8 text-primary animate-spin-slow" />
      </div>
    );
  }

  const plans = data?.plans || [];
  const currentTier = data?.currentSubscription?.tier;
  const userUsage = data?.userUsage;

  const faqItems = [
    { question: t('page.faq.canChange'), answer: t('page.faq.canChangeAnswer') },
    { question: t('page.faq.cancel'), answer: t('page.faq.cancelAnswer') },
    { question: t('page.faq.refund'), answer: t('page.faq.refundAnswer') },
    { question: t('page.faq.whatGet'), answer: t('page.faq.whatGetAnswer') },
  ];

  return (
    <div className="relative min-h-screen py-24 px-4 overflow-hidden selection:bg-primary-glow">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] rounded-full bg-accent-blue/10 blur-[120px] mix-blend-screen"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-white mb-6">
            Unlock <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-accent-blue">The Oracle</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Ascend to higher astrological precision. Deepen your connection to the cosmos with our advanced NASA-grade ephemeris mapping.
          </p>
        </div>

        {/* Usage Bar */}
        {user && currentTier === 'FREE' && userUsage && (
          <div className="max-w-xl mx-auto mb-12 glass-panel p-6 rounded-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white font-medium">Cosmic Queries Remaining</span>
              <span className={userUsage.queriesThisMonth >= userUsage.queriesLimit ? 'text-accent-blue font-bold' : 'text-primary-light font-bold'}>
                {userUsage.queriesLimit - userUsage.queriesThisMonth} / {userUsage.queriesLimit}
              </span>
            </div>
            <div className="h-3 rounded-full bg-background-deep overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent-blue transition-all duration-500"
                style={{ width: `${Math.min(100, (userUsage.queriesThisMonth / userUsage.queriesLimit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-16 animate-fade-in-up">
          <div className="glass-panel p-1 rounded-full flex items-center">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-8 py-3 rounded-full font-medium transition-all ${billingPeriod === 'monthly' ? 'bg-primary/30 text-white shadow-glow' : 'text-text-secondary hover:text-white'}`}
            >
              Monthly Cycle
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-8 py-3 rounded-full font-medium transition-all flex items-center gap-2 ${billingPeriod === 'yearly' ? 'bg-primary/30 text-white shadow-glow' : 'text-text-secondary hover:text-white'}`}
            >
              Solar Return (Yearly)
              <span className="text-xs px-2 py-1 rounded-full bg-accent-orange text-white">Save 25%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {plans.map((plan, i) => {
            const price = billingPeriod === 'monthly' ? plan.price.monthly : plan.price.yearly / 12;
            const priceBgn = billingPeriod === 'monthly' ? plan.priceBgn.monthly : plan.priceBgn.yearly / 12;
            const isCurrent = currentTier === plan.id.toUpperCase();

            return (
              <div
                key={plan.id}
                className={`flex flex-col relative glass-panel p-8 transition-transform hover:-translate-y-2 animate-fade-in-up ${plan.popular ? 'rounded-3xl border-primary/50 shadow-glow md:-mt-8 md:mb-8' : 'rounded-3xl border-border-glass'}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-accent-blue text-white shadow-glow">
                    Most Popular
                  </div>
                )}

                <h3 className="text-2xl font-display font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-text-secondary text-sm mb-6 min-h-[40px]">{plan.description}</p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">€{price.toFixed(0)}</span>
                    <span className="text-text-secondary">/mo</span>
                  </div>
                  {locale === 'bg' && <p className="text-text-muted text-sm mt-1">{priceBgn.toFixed(0)} BGN /mo</p>}
                </div>

                <div className="mb-8 flex-1">
                  <p className="text-primary-light font-bold mb-4">{plan.queriesLimit === -1 ? 'Unlimited Access' : `${plan.queriesLimit} Calculations / mo`}</p>
                  <ul className="space-y-4">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-accent-blue shrink-0" />
                        <span className="text-sm text-text-secondary">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleCheckout(plan.id.toUpperCase())}
                  disabled={isCurrent || !!checkoutLoading}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${isCurrent ? 'bg-surface border border-border-glass text-text-muted' : plan.popular ? 'bg-gradient-to-r from-primary to-accent-blue text-white hover:shadow-glow-lg' : 'bg-primary/20 hover:bg-primary/40 border border-primary/30 text-white'}`}
                >
                  {checkoutLoading === plan.id.toUpperCase() ? '...' : isCurrent ? 'Current Tier' : 'Upgrade Now'}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-3xl font-display font-bold text-center text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div key={idx} className="glass-panel overflow-hidden rounded-2xl">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center p-6 text-left"
                >
                  <span className="font-medium text-white">{item.question}</span>
                  <ChevronDown className={`w-5 h-5 text-primary transition-transform ${faqOpen.includes(idx) ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen.includes(idx) && (
                  <div className="px-6 pb-6 text-text-secondary text-sm leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
