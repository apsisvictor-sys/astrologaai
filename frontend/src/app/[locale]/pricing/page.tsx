/**
 * Pricing Page - i18n Compliant Version
 * US-21: View Subscription Plans
 * 
 * Route: /pricing (Bulgarian) or /en/pricing (English)
 * 
 * Displays subscription tiers with feature comparison,
 * EUR/BGN pricing, FAQ section, and upgrade functionality
 * 
 * Design Specifications from 06-ux-ui-design.md:
 * - Background Primary: #0A0A0F
 * - Background Secondary: #12121A
 * - Primary: #7C3AED
 * - Secondary: #EC4899
 * - Text Primary: #FAFAFA
 * - Text Secondary: #A1A1AA
 * - Gradient: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)
 * - Border radius: 12px-16px
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

// API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Design System Colors (from 06-ux-ui-design.md)
const COLORS = {
  backgroundPrimary: '#0A0A0F',
  backgroundSecondary: '#12121A',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
  success: '#10B981',
  error: '#EF4444',
};

// Types
interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  priceBgn: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: string[];
  notIncluded: string[];
  popular: boolean;
  queriesLimit: number;
}

interface SubscriptionData {
  plans: Plan[];
  currentSubscription: {
    tier: string;
    status: string;
  } | null;
  userUsage: {
    queriesThisMonth: number;
    queriesLimit: number;
  } | null;
  currency: string;
  conversionRate: number;
}

export default function PricingPage() {
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number[]>([]);
  
  // Fetch subscription data
  useEffect(() => {
    async function fetchSubscriptionData() {
      try {
        setLoading(true);
        setError(null);
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        // Add auth token if authenticated
        const token = localStorage.getItem('astrologaai_access_token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_URL}/api/v1/subscription/plans`, {
          headers,
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription plans');
        }
        
        const result = await response.json();
        setData(result.data);
      } catch (err: any) {
        console.error('Error fetching subscription data:', err);
        setError(err.message || 'Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSubscriptionData();
  }, []);
  
  // Handle checkout
  const handleCheckout = async (tier: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/pricing');
      return;
    }
    
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
          successUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/${locale === 'en' ? 'en/' : ''}dashboard?checkout=success`,
          cancelUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/${locale === 'en' ? 'en/' : ''}pricing?checkout=cancel`,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create checkout session');
      }
      
      // Redirect to Stripe checkout
      if (result.data.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };
  
  // Toggle FAQ
  const toggleFaq = (index: number) => {
    setFaqOpen(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };
  
  // Loading state
  if (loading || authLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.backgroundPrimary }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
            style={{ background: COLORS.gradient }}
          />
          <p style={{ color: COLORS.textSecondary }}>{tCommon('loading')}</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.backgroundPrimary }}
      >
        <div className="text-center">
          <p style={{ color: COLORS.error }}>{t('management.error')}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 rounded-xl font-semibold"
            style={{
              background: COLORS.gradient,
              color: '#FFFFFF',
              borderRadius: '12px',
            }}
          >
            {t('management.tryAgain')}
          </button>
        </div>
      </div>
    );
  }
  
  const plans = data?.plans || [];
  const currentTier = data?.currentSubscription?.tier;
  const userUsage = data?.userUsage;
  
  // FAQ data from translations
  const faqItems = [
    { question: t('page.faq.canChange'), answer: t('page.faq.canChangeAnswer') },
    { question: t('page.faq.cancel'), answer: t('page.faq.cancelAnswer') },
    { question: t('page.faq.refund'), answer: t('page.faq.refundAnswer') },
    { question: t('page.faq.whatGet'), answer: t('page.faq.whatGetAnswer') },
    { question: t('page.faq.payment'), answer: t('page.faq.paymentAnswer') },
    { question: t('page.faq.support'), answer: t('page.faq.supportAnswer') },
  ];

  return (
    <div 
      className="min-h-screen py-12 px-4"
      style={{ 
        background: COLORS.backgroundPrimary,
        backgroundImage: `radial-gradient(ellipse at top, #1A1A2E 0%, ${COLORS.backgroundPrimary} 50%, #000000 100%)`,
      }}
    >
      {/* Background stars decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 20px 30px, ${COLORS.primary}, transparent),
              radial-gradient(2px 2px at 40px 70px, ${COLORS.secondary}, transparent),
              radial-gradient(1px 1px at 90px 40px, ${COLORS.textPrimary}, transparent),
              radial-gradient(2px 2px at 130px 80px, ${COLORS.primary}, transparent),
              radial-gradient(1px 1px at 160px 30px, ${COLORS.secondary}, transparent)
            `,
            backgroundSize: '200px 100px',
          }}
        />
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ 
              color: COLORS.textPrimary,
              fontFamily: 'Playfair Display, serif',
            }}
          >
            {t('page.title')}
          </h1>
          <p 
            className="text-lg md:text-xl"
            style={{ color: COLORS.textSecondary }}
          >
            {t('page.subtitle')}
          </p>
        </div>
        
        {/* Usage Counter (for free users) */}
        {user && currentTier === 'FREE' && userUsage && (
          <div 
            className="max-w-md mx-auto mb-8 p-5 rounded-xl"
            style={{ 
              background: COLORS.backgroundSecondary,
              border: `1px solid ${COLORS.primary}40`,
              borderRadius: '12px',
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <span style={{ color: COLORS.textSecondary }}>
                {t('page.queries')}: {userUsage.queriesThisMonth} / {userUsage.queriesLimit}
              </span>
              <span style={{ color: userUsage.queriesThisMonth >= userUsage.queriesLimit ? COLORS.error : COLORS.success }}>
                {userUsage.queriesLimit - userUsage.queriesThisMonth} {t('queriesRemaining')}
              </span>
            </div>
            <div 
              className="h-2 rounded-full overflow-hidden"
              style={{ background: '#252532' }}
            >
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (userUsage.queriesThisMonth / userUsage.queriesLimit) * 100)}%`,
                  background: userUsage.queriesThisMonth >= userUsage.queriesLimit 
                    ? COLORS.error 
                    : COLORS.gradient,
                }}
              />
            </div>
            {userUsage.queriesThisMonth >= userUsage.queriesLimit && (
              <button
                onClick={() => handleCheckout('PRO')}
                className="mt-4 w-full py-3 px-4 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{
                  background: COLORS.gradient,
                  color: '#FFFFFF',
                  borderRadius: '12px',
                }}
              >
                {t('upgradeNow')}
              </button>
            )}
          </div>
        )}
        
        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div 
            className="flex p-1 rounded-full"
            style={{ 
              background: COLORS.backgroundSecondary, 
              border: `1px solid ${COLORS.primary}40`,
            }}
          >
            <button
              onClick={() => setBillingPeriod('monthly')}
              className="px-6 py-2 rounded-full font-medium transition-all"
              style={{
                background: billingPeriod === 'monthly' ? COLORS.gradient : 'transparent',
                color: billingPeriod === 'monthly' ? '#FFFFFF' : COLORS.textSecondary,
              }}
            >
              {t('page.monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className="px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2"
              style={{
                background: billingPeriod === 'yearly' ? COLORS.gradient : 'transparent',
                color: billingPeriod === 'yearly' ? '#FFFFFF' : COLORS.textSecondary,
              }}
            >
              {t('page.yearly')}
              <span 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: COLORS.success, color: '#FFFFFF' }}
              >
                {t('page.save')}
              </span>
            </button>
          </div>
        </div>
        
        {/* Pricing Cards - 3 Column Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.price.monthly : plan.price.yearly / 12;
            const priceBgn = billingPeriod === 'monthly' ? plan.priceBgn.monthly : plan.priceBgn.yearly / 12;
            const isCurrent = currentTier === plan.id.toUpperCase();
            const canUpgrade = currentTier === 'FREE' || 
              (currentTier === 'PRO' && plan.id === 'premium') ||
              (currentTier === 'PREMIUM' && plan.id !== 'premium');
            
            return (
              <div
                key={plan.id}
                className={`relative p-6 transition-all hover:-translate-y-1 ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
                style={{
                  background: COLORS.backgroundSecondary,
                  border: plan.popular 
                    ? `2px solid ${COLORS.primary}` 
                    : `1px solid ${COLORS.primary}30`,
                  boxShadow: plan.popular 
                    ? `0 0 40px ${COLORS.primary}40` 
                    : '0 4px 20px rgba(0, 0, 0, 0.3)',
                  borderRadius: '16px',
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold"
                    style={{
                      background: COLORS.gradient,
                      color: '#FFFFFF',
                    }}
                  >
                    {t('page.mostPopular')}
                  </div>
                )}
                
                {/* Current Badge */}
                {isCurrent && (
                  <div 
                    className="absolute -top-3 right-4 px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      background: COLORS.success,
                      color: '#FFFFFF',
                    }}
                  >
                    {t('page.current')}
                  </div>
                )}
                
                {/* Plan Name */}
                <div className="text-center mb-4 pt-2">
                  <h3 
                    className="text-2xl font-bold"
                    style={{ 
                      color: COLORS.textPrimary,
                      fontFamily: 'Playfair Display, serif',
                    }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>
                    {plan.description}
                  </p>
                </div>
                
                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex justify-center items-baseline gap-1">
                    <span 
                      className="text-4xl font-bold"
                      style={{ color: COLORS.textPrimary }}
                    >
                      €{price.toFixed(0)}
                    </span>
                    <span style={{ color: COLORS.textSecondary }}>{t('page.perMonth')}</span>
                  </div>
                  {/* Show BGN price for Bulgarian users */}
                  {locale === 'bg' && (
                    <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>
                      ({priceBgn.toFixed(0)} лв.)
                    </p>
                  )}
                </div>
                
                {/* Queries Limit */}
                <div className="text-center mb-6">
                  <p 
                    className="text-lg font-semibold"
                    style={{ 
                      color: plan.queriesLimit === -1 ? COLORS.success : COLORS.textSecondary,
                    }}
                  >
                    {plan.queriesLimit === -1 ? t('unlimited') : `${plan.queriesLimit} ${t('page.queries')}`}
                  </p>
                </div>
                
                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textSecondary }}>
                    {t('page.features')}:
                  </h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span style={{ color: COLORS.success }}>✓</span>
                        <span className="text-sm" style={{ color: COLORS.textSecondary }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* CTA Button */}
                <button
                  onClick={() => handleCheckout(plan.id.toUpperCase())}
                  disabled={isCurrent || checkoutLoading === plan.id.toUpperCase()}
                  className="w-full py-3 px-4 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isCurrent 
                      ? '#252532' 
                      : plan.popular 
                        ? COLORS.gradient
                        : 'transparent',
                    border: plan.popular || isCurrent ? 'none' : `1px solid ${COLORS.primary}`,
                    color: isCurrent ? COLORS.textSecondary : '#FFFFFF',
                    borderRadius: '12px',
                  }}
                >
                  {checkoutLoading === plan.id.toUpperCase() 
                    ? '...' 
                    : isCurrent 
                      ? t('page.current')
                      : canUpgrade 
                        ? (currentTier === 'FREE' ? t('page.getStarted') : t('page.upgrade'))
                        : t('page.select')
                  }
                </button>
              </div>
            );
          })}
        </div>
        
        {/* FAQ Section - Accordion */}
        <div className="max-w-3xl mx-auto">
          <h2 
            className="text-3xl font-bold text-center mb-8"
            style={{ 
              color: COLORS.textPrimary,
              fontFamily: 'Playfair Display, serif',
            }}
          >
            {t('page.faq.title')}
          </h2>
          
          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="overflow-hidden"
                style={{ 
                  background: COLORS.backgroundSecondary,
                  border: `1px solid ${COLORS.primary}30`,
                  borderRadius: '12px',
                }}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center p-5 text-left"
                >
                  <span className="font-medium pr-4" style={{ color: COLORS.textPrimary }}>
                    {item.question}
                  </span>
                  <span 
                    className="text-xl transition-transform duration-200 flex-shrink-0"
                    style={{ 
                      color: COLORS.primary,
                      transform: faqOpen.includes(idx) ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </span>
                </button>
                
                {faqOpen.includes(idx) && (
                  <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            © 2026 AstroLogAI. {locale === 'bg' ? 'Всички права запазени.' : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </div>
  );
}
