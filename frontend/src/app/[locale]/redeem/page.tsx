'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { PublicNav } from '@/components/home/public-nav';
import { PublicFooter } from '@/components/home/public-footer';
import {
  Gift,
  CheckCircle,
  Star,
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const API_URL = getApiBaseUrl();

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4; // 4 = success

interface GiftStatus {
  valid: boolean;
  status: string;
  tier: string;
  durationMonths: number;
  claimExpiresAt: string;
}

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#e41aff', '#ff0080', '#00f0ff', '#a855f7', '#f59e0b', '#22c55e'];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = Math.random() * 8 + 4;
  const startX = Math.random() * 100;
  const drift = (Math.random() - 0.5) * 200;
  const duration = Math.random() * 2 + 2;
  const delay = Math.random() * 1.5;

  return (
    <motion.div
      className="absolute top-0 rounded-sm pointer-events-none"
      style={{
        left: `${startX}%`,
        width: size,
        height: size * (Math.random() > 0.5 ? 1 : 0.4),
        background: color,
        opacity: 0.9,
      }}
      initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: window.innerHeight + 100,
        x: drift,
        rotate: Math.random() * 720 - 360,
        opacity: [1, 1, 0.5, 0],
      }}
      transition={{ duration, delay, ease: 'easeIn' }}
    />
  );
}

function Confetti() {
  const [particles] = useState(() => Array.from({ length: 80 }, (_, i) => i));
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden>
      {particles.map((i) => (
        <ConfettiParticle key={i} index={i} />
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCodeInput(raw: string): string {
  // Strip non-alphanumeric, uppercase, max 16 chars
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join('-');
}

function errorMessage(status: string): string {
  switch (status) {
    case 'REDEEMED':
      return 'This gift code has already been redeemed.';
    case 'EXPIRED':
      return 'This gift code has expired.';
    case 'CANCELLED':
      return 'This gift code is no longer valid.';
    case 'PENDING_PAYMENT':
      return 'Payment for this code is still pending.';
    default:
      return 'This gift code is not valid.';
  }
}

function monthsLabel(n: number): string {
  return n === 1 ? '1 month' : `${n} months`;
}

function formatExpiry(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function computeEndsAt(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const steps = [1, 2, 3] as const;
  return (
    <div className="flex items-center gap-2 justify-center mb-10">
      {steps.map((s) => {
        const done = current > s;
        const active = current === s;
        return (
          <div key={s} className="flex items-center gap-2">
            <motion.div
              className="rounded-full flex items-center justify-center text-xs font-bold"
              animate={{
                width: active ? 28 : 22,
                height: active ? 28 : 22,
                background: done
                  ? 'rgba(228,26,255,0.5)'
                  : active
                  ? '#e41aff'
                  : 'rgba(255,255,255,0.08)',
                borderColor: done || active ? '#e41aff' : 'rgba(255,255,255,0.12)',
              }}
              style={{ border: '1px solid' }}
              transition={{ duration: 0.3 }}
            >
              {done ? (
                <CheckCircle className="w-3 h-3 text-white" />
              ) : (
                <span style={{ color: active ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 10 }}>{s}</span>
              )}
            </motion.div>
            {s < 3 && (
              <div
                className="h-px w-8"
                style={{ background: current > s ? 'rgba(228,26,255,0.5)' : 'rgba(255,255,255,0.08)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function RedeemPage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [giftStatus, setGiftStatus] = useState<GiftStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-format code from URL param on mount + auto-check if already authenticated
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (!urlCode) return;

    const formatted = formatCodeInput(urlCode);
    setCode(formatted);

    // If user is already authenticated (returned from login redirect), auto-check the code
    if (!authLoading && isAuthenticated && formatted.replace(/-/g, '').length === 16) {
      setChecking(true);
      fetch(`${API_URL}/api/v1/gifts/status/${formatted}`)
        .then((res) => {
          if (res.status === 404) throw new Error('not_found');
          return res.json();
        })
        .then((data) => {
          const status: GiftStatus = data.data ?? data;
          if (status.valid && status.status === 'ACTIVE') {
            setGiftStatus(status);
            setStep(3);
          } else {
            setError(errorMessage(status.status));
          }
        })
        .catch((err) => {
          if (err.message === 'not_found') {
            setError('Gift code not found. Please check the code and try again.');
          }
          // On network error: let user try manually
        })
        .finally(() => setChecking(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // When auth resolves after redirect-back: if we have a valid gift status → advance to step 3
  useEffect(() => {
    if (!authLoading && isAuthenticated && giftStatus?.valid && step === 2) {
      setStep(3);
    }
  }, [authLoading, isAuthenticated, giftStatus, step]);

  // Cleanup redirect timer
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // ── Step 1: Check code ─────────────────────────────────────────────────────

  const handleCheckCode = async () => {
    const rawCode = code.replace(/-/g, '');
    if (rawCode.length < 16) {
      setError('Please enter a complete 16-character gift code.');
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/gifts/status/${code.replace(/-/g, '-')}`);
      if (res.status === 404) {
        setError('Gift code not found. Please check the code and try again.');
        return;
      }
      const data = await res.json();
      const status: GiftStatus = data.data ?? data;

      if (!status.valid || status.status !== 'ACTIVE') {
        setError(errorMessage(status.status));
        return;
      }

      setGiftStatus(status);

      // Advance: if auth already resolved, go to step 2 or 3
      if (!authLoading && isAuthenticated) {
        setStep(3);
      } else {
        setStep(2);
      }
    } catch {
      setError('Unable to verify the code. Please check your connection and try again.');
    } finally {
      setChecking(false);
    }
  };

  // ── Step 2 → login redirect ────────────────────────────────────────────────

  const handleLoginRedirect = (path: '/login' | '/register') => {
    const returnUrl = `/${locale === 'bg' ? '' : locale + '/'}redeem?code=${code}`;
    router.push(`${path}?returnUrl=${encodeURIComponent(returnUrl)}` as any);
  };

  // ── Step 3: Redeem ─────────────────────────────────────────────────────────

  const handleRedeem = async () => {
    if (!isAuthenticated) {
      setStep(2);
      return;
    }
    setError(null);
    setRedeeming(true);
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const res = await fetch(`${API_URL}/api/v1/gifts/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: code.replace(/-/g, '-') }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError('This code has already been redeemed.');
        } else if (res.status === 422) {
          setError("Your current subscription already covers this period — the gift has been applied to extend it.");
        } else {
          setError(data.message ?? 'Something went wrong. Please try again.');
        }
        return;
      }

      const result = data.data ?? data;
      const endsAt = result.subscriptionEndsAt
        ? formatExpiry(result.subscriptionEndsAt)
        : computeEndsAt(giftStatus?.durationMonths ?? 1);
      setSubscriptionEndsAt(endsAt);
      setShowConfetti(true);
      setStep(4);

      redirectTimerRef.current = setTimeout(() => {
        router.push('/dashboard');
      }, 4000);
    } catch {
      setError('Unable to connect. Please check your connection and try again.');
    } finally {
      setRedeeming(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const dir = step >= 2 ? 1 : -1;

  return (
    <div className="min-h-screen bg-background-deep text-white overflow-x-hidden">
      {showConfetti && <Confetti />}

      <PublicNav />

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <div
          className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #e41aff, transparent)', filter: 'blur(130px)' }}
        />
        <div
          className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #00f0ff, transparent)', filter: 'blur(110px)' }}
        />
      </div>

      <main className="relative z-10 pt-28 pb-24 px-4">
        <div className="max-w-lg mx-auto">

          {/* ── Hero ── */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #2d0038 0%, #0D0010 60%, #1a0b1c 100%)',
                  boxShadow: '0 0 32px rgba(228,26,255,0.3), inset 0 0 16px rgba(228,26,255,0.05)',
                  border: '1px solid rgba(228,26,255,0.25)',
                }}
              >
                <Gift className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 leading-tight">
              Redeem your{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                gift
              </span>
            </h1>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Activate PREMIUM access to The Oracle — precision astrology, powered by Swiss Ephemeris.
            </p>
          </motion.div>

          {/* ── Step indicator (steps 1–3) ── */}
          {step < 4 && <StepDots current={step} />}

          {/* ── Steps ── */}
          <AnimatePresence mode="wait" custom={dir}>
            {/* STEP 1 — Code entry */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <div
                  className="rounded-3xl p-7"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <h2 className="text-lg font-semibold mb-1.5">Enter your gift code</h2>
                  <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    16-character code from your gift email
                  </p>

                  {/* Code input */}
                  <div className="mb-5">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(formatCodeInput(e.target.value));
                        setError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCheckCode()}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      autoFocus
                      maxLength={19}
                      spellCheck={false}
                      className="w-full rounded-xl px-4 py-3.5 font-mono text-lg text-white outline-none transition-colors placeholder:text-white/15 tracking-widest text-center"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        letterSpacing: '0.15em',
                      }}
                      onFocus={(e) => {
                        if (!error) e.currentTarget.style.borderColor = 'rgba(228,26,255,0.4)';
                      }}
                      onBlur={(e) => {
                        if (!error) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      }}
                    />

                    {/* Character progress */}
                    <div className="flex justify-between mt-2 px-1">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        Format: XXXX-XXXX-XXXX-XXXX
                      </span>
                      <span
                        className="text-xs font-mono"
                        style={{ color: code.replace(/-/g, '').length === 16 ? '#22c55e' : 'rgba(255,255,255,0.2)' }}
                      >
                        {code.replace(/-/g, '').length}/16
                      </span>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      className="rounded-xl px-4 py-3 mb-5 flex items-center gap-2.5 text-sm"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <button
                    onClick={handleCheckCode}
                    disabled={checking || code.replace(/-/g, '').length < 16}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                    style={{
                      background:
                        checking || code.replace(/-/g, '').length < 16
                          ? 'rgba(228,26,255,0.15)'
                          : 'linear-gradient(135deg, #ff0080, #e41aff)',
                      color: checking || code.replace(/-/g, '').length < 16 ? 'rgba(255,255,255,0.4)' : 'white',
                      boxShadow:
                        checking || code.replace(/-/g, '').length < 16 ? 'none' : '0 0 30px rgba(228,26,255,0.25)',
                      cursor: checking || code.replace(/-/g, '').length < 16 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {checking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking code…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Check code
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Want to give a gift instead?{' '}
                    <Link href="/gift" className="underline underline-offset-2" style={{ color: 'rgba(228,26,255,0.7)' }}>
                      Purchase a gift
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Auth gate */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                {/* Gift preview card */}
                {giftStatus && (
                  <motion.div
                    className="rounded-2xl p-5 mb-5"
                    style={{
                      background: 'linear-gradient(160deg, rgba(228,26,255,0.08) 0%, rgba(0,240,255,0.04) 100%)',
                      border: '1px solid rgba(228,26,255,0.25)',
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(228,26,255,0.15)', border: '1px solid rgba(228,26,255,0.3)' }}
                      >
                        <Star className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {monthsLabel(giftStatus.durationMonths)} of {giftStatus.tier}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Valid until {formatExpiry(giftStatus.claimExpiresAt)}
                        </div>
                      </div>
                      <div className="ml-auto">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                        >
                          Valid
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div
                  className="rounded-3xl p-7"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <h2 className="text-lg font-semibold mb-1.5">Sign in to redeem</h2>
                  <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Create a free account or log in to activate your PREMIUM gift.
                  </p>

                  <div className="space-y-3">
                    <motion.button
                      onClick={() => handleLoginRedirect('/register')}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200"
                      style={{
                        background: 'linear-gradient(135deg, #ff0080, #e41aff)',
                        color: 'white',
                        boxShadow: '0 0 30px rgba(228,26,255,0.25)',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Create a free account
                    </motion.button>

                    <motion.button
                      onClick={() => handleLoginRedirect('/login')}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.8)',
                      }}
                      whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <LogIn className="w-4 h-4" />
                      Log in to existing account
                    </motion.button>
                  </div>

                  <button
                    onClick={() => setStep(1)}
                    className="w-full mt-5 text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    ← Enter a different code
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Confirm and redeem */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                {/* Gift preview */}
                {giftStatus && (
                  <motion.div
                    className="rounded-2xl p-5 mb-5"
                    style={{
                      background: 'linear-gradient(160deg, rgba(228,26,255,0.08) 0%, rgba(0,240,255,0.04) 100%)',
                      border: '1px solid rgba(228,26,255,0.25)',
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(228,26,255,0.15)', border: '1px solid rgba(228,26,255,0.3)' }}
                      >
                        <Gift className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {monthsLabel(giftStatus.durationMonths)} of {giftStatus.tier}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Code: <span className="font-mono" style={{ color: 'rgba(228,26,255,0.7)' }}>{code}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-3.5 text-sm"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>You are about to activate </span>
                      <span className="font-semibold text-white">
                        {monthsLabel(giftStatus.durationMonths)} of PREMIUM
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}> until </span>
                      <span className="font-semibold" style={{ color: '#e41aff' }}>
                        {computeEndsAt(giftStatus.durationMonths)}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {user?.email ? ` for ${user.email}` : ''}.
                      </span>
                    </div>

                    {/* What's included */}
                    <div className="mt-4 grid grid-cols-2 gap-1.5">
                      {[
                        'Full natal chart (14 bodies)',
                        'Synastry & compatibility',
                        'Solar Returns & Progressions',
                        'Unlimited Cosmic Circle',
                        'Live planetary transits',
                        'Priority Oracle responses',
                      ].map((f) => (
                        <div key={f} className="flex items-center gap-1.5">
                          <Star className="w-3 h-3 shrink-0 text-accent-cyan" />
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div
                  className="rounded-3xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Error */}
                  {error && (
                    <motion.div
                      className="rounded-xl px-4 py-3 mb-5 flex items-center gap-2.5 text-sm"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <motion.button
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2.5"
                    style={{
                      background: redeeming
                        ? 'rgba(228,26,255,0.2)'
                        : 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
                      color: 'white',
                      boxShadow: redeeming ? 'none' : '0 0 40px rgba(228,26,255,0.3)',
                      cursor: redeeming ? 'wait' : 'pointer',
                    }}
                    whileHover={!redeeming ? { scale: 1.02 } : {}}
                    whileTap={!redeeming ? { scale: 0.97 } : {}}
                  >
                    {redeeming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Activating your PREMIUM…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Redeem gift
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={() => { setStep(1); setGiftStatus(null); setError(null); }}
                    className="w-full mt-4 text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    ← Use a different code
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="text-center"
              >
                {/* Success icon */}
                <div className="relative inline-flex justify-center mb-7">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'rgba(228,26,255,0.15)' }}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(228,26,255,0.2), rgba(0,240,255,0.1))',
                      border: '1px solid rgba(228,26,255,0.4)',
                      boxShadow: '0 0 60px rgba(228,26,255,0.3)',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  >
                    <CheckCircle className="w-11 h-11 text-primary" />
                  </motion.div>
                </div>

                <motion.h2
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  Your{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    PREMIUM
                  </span>{' '}
                  is now active ✨
                </motion.h2>

                <motion.p
                  className="text-base mb-3 leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  {subscriptionEndsAt ? (
                    <>
                      Your PREMIUM access runs until{' '}
                      <span className="font-semibold text-white">{subscriptionEndsAt}</span>.
                    </>
                  ) : (
                    'Welcome to PREMIUM — the stars are yours.'
                  )}
                </motion.p>

                <motion.p
                  className="text-sm mb-8"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  Redirecting you to the dashboard in a few seconds…
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
                      color: 'white',
                      boxShadow: '0 0 40px rgba(228,26,255,0.3)',
                    }}
                  >
                    Go to dashboard now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>

                {/* Star decorations */}
                <motion.div
                  className="flex justify-center gap-1.5 mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {[...Array(7)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3 h-3"
                      style={{
                        color: i === 3 ? '#e41aff' : i % 2 === 0 ? 'rgba(228,26,255,0.5)' : 'rgba(0,240,255,0.4)',
                        fill: 'currentColor',
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function RedeemPageWrapper() {
  return (
    <Suspense fallback={null}>
      <RedeemPage />
    </Suspense>
  );
}
