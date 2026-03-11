'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { getApiBaseUrl, getFrontendBaseUrl } from '@/lib/runtime-config';
import { PublicNav } from '@/components/home/public-nav';
import { PublicFooter } from '@/components/home/public-footer';
import { Check, ChevronDown, ShieldCheck, Lock, Zap } from 'lucide-react';

const API_URL = getApiBaseUrl();

// ── Oracle Eye Logo ───────────────────────────────────────────────────────────

function OracleLogo({ size = 60 }: { size?: number }) {
  return (
    <div
      className="rounded-[18px] flex items-center justify-center"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #2d0038 0%, #0D0010 60%, #1a0b1c 100%)',
        boxShadow: '0 0 32px rgba(228,26,255,0.3), inset 0 0 16px rgba(228,26,255,0.05)',
        border: '1px solid rgba(228,26,255,0.25)',
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 44 28" fill="none">
        <path d="M2 14 C8 2 36 2 42 14 C36 26 8 26 2 14Z" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="22" cy="14" r="7" stroke="white" strokeWidth="1.2" fill="none" />
        <circle cx="22" cy="14" r="3.5" fill="url(#pricePupilGrad)" />
        <path d="M15 14 A7 7 0 0 1 22 7" stroke="rgba(228,26,255,0.6)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
        <circle cx="10" cy="9" r="0.8" fill="white" opacity="0.6" />
        <circle cx="34" cy="19" r="0.6" fill="white" opacity="0.5" />
        <circle cx="30" cy="8" r="0.5" fill="rgba(0,240,255,0.8)" />
        <defs>
          <radialGradient id="pricePupilGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#e41aff" />
            <stop offset="100%" stopColor="#00f0ff" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Hardcoded plan data ───────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    tagline: 'Begin your cosmic journey',
    monthlyPrice: 0,
    yearlyPrice: 0,
    consultations: '10 / month',
    popular: false,
    cta: 'Get Started Free',
    accentColor: 'rgba(255,255,255,0.15)',
    features: [
      'Basic natal chart (Sun, Moon, Rising)',
      'Planetary positions overview',
      'Daily horoscope digest',
      '7-day conversation history',
      'Natural language Q&A',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    tagline: 'Deep celestial intelligence',
    monthlyPrice: 9.99,
    yearlyPrice: 7.49,
    consultations: '150 / month',
    popular: true,
    cta: 'Upgrade to Pro',
    accentColor: '#e41aff',
    features: [
      'Everything in Free',
      'Full 14-body natal chart',
      'Planetary transits & forecasts',
      'Cosmic Circle — up to 10 profiles',
      'Unlimited conversation history',
      'PDF chart export',
      'Priority Oracle responses',
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    tagline: 'The complete oracle experience',
    monthlyPrice: 19.99,
    yearlyPrice: 14.99,
    consultations: 'Unlimited',
    popular: false,
    cta: 'Unlock Premium',
    accentColor: '#00f0ff',
    features: [
      'Everything in Pro',
      'Full synastry & compatibility reports',
      'Solar Returns & Progressions',
      'Unlimited Cosmic Circle profiles',
      'Early access to new features',
      'Dedicated cosmic support',
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Can I change my plan at any time?',
    a: 'Yes — upgrade or downgrade instantly from your account settings. Changes take effect immediately. If you upgrade mid-cycle, you only pay the prorated difference.',
  },
  {
    q: 'What happens when I reach my monthly consultation limit?',
    a: 'Your consultations pause until the start of your next billing month. You can upgrade at any point to continue immediately without losing your conversation history.',
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Absolutely. Cancel any time from your settings — no forms, no hidden fees, no questions asked. Your access continues until the end of your paid period.',
  },
  {
    q: 'How is the Oracle different from ChatGPT or Claude?',
    a: 'General AI models rely on training data and have no real-time cosmic awareness. The Oracle connects to Swiss Ephemeris for precise planetary positions, calculates your live transits, and interprets your unique natal chart — not a generic horoscope.',
  },
  {
    q: 'What is a Solar Return?',
    a: 'A Solar Return is a real astrological chart cast for the exact moment the Sun returns to its natal position — your astrological birthday. It reveals the themes, opportunities and challenges for your entire upcoming year. Our yearly billing cycle is named in its honour.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. We offer a 7-day money-back guarantee on all paid plans. If you are not satisfied, contact support within 7 days of your purchase for a full refund.',
  },
  {
    q: 'Is my personal data secure?',
    a: 'Your data is encrypted in transit (TLS 1.3) and at rest. Payments are handled entirely by Stripe — we never store card details. We are fully GDPR compliant and never sell your data to third parties.',
  },
  {
    q: 'Can I use the Oracle for friends and family?',
    a: 'Yes. Pro includes the Cosmic Circle feature for up to 10 saved profiles (partners, family, friends). Premium gives you unlimited profiles plus full synastry compatibility reports between any two people.',
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number[]>([]);
  const [userUsage, setUserUsage] = useState<{ queriesThisMonth: number; queriesLimit: number } | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Fetch usage data only (for the FREE usage bar)
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchUsage() {
      try {
        const token = localStorage.getItem('astrologaai_access_token');
        const res = await fetch(`${API_URL}/api/v1/subscription/plans`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const result = await res.json();
        if (result.data) {
          setUserUsage(result.data.userUsage ?? null);
          setCurrentTier(result.data.currentSubscription?.tier ?? null);
        }
      } catch {
        // non-blocking — usage bar just won't show
      }
    }
    fetchUsage();
  }, [isAuthenticated]);

  const handleCheckout = async (tier: string) => {
    if (tier === 'FREE') return router.push('/register');
    if (!isAuthenticated) return router.push('/login?redirect=/pricing');
    setPromoError('');
    try {
      setCheckoutLoading(tier);
      const token = localStorage.getItem('astrologaai_access_token');
      const body: Record<string, string> = {
        tier,
        billingPeriod,
        successUrl: `${getFrontendBaseUrl()}/${locale === 'en' ? 'en/' : ''}dashboard?checkout=success`,
        cancelUrl: `${getFrontendBaseUrl()}/${locale === 'en' ? 'en/' : ''}pricing?checkout=cancel`,
      };
      if (promoCode.trim()) body.promoCode = promoCode.trim().toUpperCase();
      const res = await fetch(`${API_URL}/api/v1/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else if (!result.success) {
        setPromoError('Invalid or expired promo code.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const toggleFaq = (i: number) =>
    setFaqOpen(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);

  const displayPrice = (plan: typeof PLANS[0]) => {
    if (plan.monthlyPrice === 0) return '€0';
    const p = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    return `€${p.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background-deep text-white overflow-x-hidden">
      <PublicNav />

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #e41aff, transparent)', filter: 'blur(120px)' }} />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #00f0ff, transparent)', filter: 'blur(100px)' }} />
      </div>

      <main className="relative z-10 pt-28 pb-24 px-4">
        {/* ── Hero ── */}
        <motion.div
          className="text-center mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-6">
            <OracleLogo size={64} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
            Unlock{' '}
            <span style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              The Oracle
            </span>
          </h1>
          <p className="text-xl text-white/50 leading-relaxed">
            Precision astrology powered by Swiss Ephemeris. Choose the depth that fits your cosmic path.
          </p>
        </motion.div>

        {/* ── Usage Bar (FREE users only) ── */}
        {isAuthenticated && currentTier === 'FREE' && userUsage && (
          <motion.div
            className="max-w-lg mx-auto mb-12 rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-white/70 text-sm font-medium">Monthly Consultations Used</span>
              <span className="text-sm font-bold" style={{ color: '#e41aff' }}>
                {userUsage.queriesThisMonth} / {userUsage.queriesLimit}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #e41aff, #00f0ff)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (userUsage.queriesThisMonth / userUsage.queriesLimit) * 100)}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Billing Toggle ── */}
        <motion.div
          className="flex justify-center mb-14"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex rounded-full p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['monthly', 'yearly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                className="relative px-7 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2"
                style={{ color: billingPeriod === period ? 'white' : 'rgba(255,255,255,0.45)' }}
              >
                {billingPeriod === period && (
                  <motion.div
                    layoutId="billing-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'rgba(228,26,255,0.2)', border: '1px solid rgba(228,26,255,0.35)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {period === 'monthly' ? 'Monthly Cycle' : 'Solar Return (Yearly)'}
                </span>
                {period === 'yearly' && (
                  <span className="relative z-10 text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
                    Save 25%
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Plan Cards ── */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan, i) => {
            const isCurrent = currentTier === plan.id;
            const isPopular = plan.popular;

            return (
              <motion.div
                key={plan.id}
                className="relative flex flex-col rounded-3xl p-7"
                style={{
                  background: isPopular
                    ? 'linear-gradient(160deg, rgba(228,26,255,0.08) 0%, rgba(0,240,255,0.04) 100%)'
                    : 'rgba(255,255,255,0.03)',
                  border: isPopular
                    ? '1px solid rgba(228,26,255,0.4)'
                    : '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isPopular ? '0 0 60px rgba(228,26,255,0.12)' : 'none',
                  marginTop: isPopular ? 0 : 0,
                }}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                {isPopular && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                    style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)', color: 'white' }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-white/40">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">{displayPrice(plan)}</span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-white/40 mb-1">/mo</span>
                    )}
                  </div>
                  {plan.monthlyPrice > 0 && billingPeriod === 'yearly' && (
                    <p className="text-xs text-white/35 mt-1">
                      Billed €{(plan.yearlyPrice * 12).toFixed(2)}/year
                    </p>
                  )}
                  <p className="text-xs mt-2 font-semibold" style={{ color: plan.accentColor }}>
                    {plan.consultations === 'Unlimited' ? 'Unlimited consultations' : `${plan.consultations} consultations`}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: plan.accentColor }} />
                      <span className="text-sm text-white/60 leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent || checkoutLoading === plan.id}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={
                    isCurrent
                      ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', cursor: 'default', border: '1px solid rgba(255,255,255,0.08)' }
                      : isPopular
                      ? { background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)', color: 'white', boxShadow: '0 0 30px rgba(228,26,255,0.3)' }
                      : { background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }
                  }
                >
                  {checkoutLoading === plan.id ? '...' : isCurrent ? 'Current Plan' : plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* ── Promo Code ── */}
        {isAuthenticated && (
          <motion.div
            className="max-w-sm mx-auto mb-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {!promoOpen ? (
              <button
                onClick={() => setPromoOpen(true)}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                Have a promo code?
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                  placeholder="PROMO CODE"
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider text-white outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: promoError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(228,26,255,0.25)',
                  }}
                />
                <button
                  onClick={() => { setPromoOpen(false); setPromoCode(''); setPromoError(''); }}
                  className="px-3 py-2.5 rounded-xl text-sm transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
                >
                  ✕
                </button>
              </div>
            )}
            {promoError && (
              <p className="mt-2 text-xs" style={{ color: '#EF4444' }}>{promoError}</p>
            )}
            {promoCode && !promoError && (
              <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Code will be applied at checkout
              </p>
            )}
          </motion.div>
        )}

        {/* ── Trust Row ── */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-6 mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { icon: <ShieldCheck className="w-4 h-4" />, label: 'Payments by Stripe', color: '#635BFF' },
            { icon: <Lock className="w-4 h-4" />, label: '256-bit SSL', color: '#00f0ff' },
            { icon: <ShieldCheck className="w-4 h-4" />, label: 'GDPR Compliant', color: '#22C55E' },
            { icon: <Zap className="w-4 h-4" />, label: 'Cancel anytime', color: '#F59E0B' },
          ].map((badge) => (
            <div key={badge.label}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: badge.color }}
            >
              {badge.icon}
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{badge.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-center mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.05 }}
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex justify-between items-center p-5 text-left"
                >
                  <span className="font-medium text-white/85 pr-4 text-sm leading-snug">{item.q}</span>
                  <ChevronDown
                    className="w-4 h-4 shrink-0 transition-transform duration-300"
                    style={{ color: '#e41aff', transform: faqOpen.includes(i) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                <AnimatePresence>
                  {faqOpen.includes(i) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-white/45 leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <p className="text-white/40 text-sm mb-4">Still deciding? Start free, no credit card required.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white transition-all duration-200 hover:shadow-xl"
            style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)', boxShadow: '0 0 40px rgba(228,26,255,0.25)' }}
          >
            Start for Free
          </Link>
        </motion.div>
      </main>

      <PublicFooter />
    </div>
  );
}
