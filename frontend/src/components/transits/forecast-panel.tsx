'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { MoonPhaseCard }  from './moon-phase-card';
import { TransitList }    from './transit-list';
import { LockedSection }  from './locked-section';
import { UpgradeModal }   from '@/components/shell/upgrade-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

// ── House computation helpers ────────────────────────────────────────────────

const SIGN_IDX: Record<string, number> = {
  Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3,
  Leo: 4, Virgo: 5, Libra: 6, Scorpio: 7,
  Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
};

function toAbsDeg(degree: number, sign: string): number {
  const key = Object.keys(SIGN_IDX).find((k) => k.toLowerCase() === sign?.toLowerCase()) ?? 'Aries';
  return (SIGN_IDX[key] ?? 0) * 30 + (degree % 30);
}

function getTransitHouse(absDeg: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const cusp     = cusps[i];
    const nextCusp = cusps[(i + 1) % 12];
    if (nextCusp > cusp) {
      if (absDeg >= cusp && absDeg < nextCusp) return i + 1;
    } else {
      // Wraps across 0°/360°
      if (absDeg >= cusp || absDeg < nextCusp) return i + 1;
    }
  }
  return 1;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Transit {
  planet: string;
  planetBg: string;
  sign: string;
  signBg: string;
  degree: number;
  aspectToNatal?: {
    natalPlanet: string;
    aspect: string;
    aspectBg: string;
    orb: number;
    influence: 'positive' | 'challenging' | 'neutral';
    description: string;
  };
}

interface MoonPhase {
  phase: string;
  phaseBg: string;
  illumination: number;
  sign: string;
  signBg: string;
}

interface Horoscope {
  general: string;
  generalBg: string;
  love: string;
  loveBg: string;
  career: string;
  careerBg: string;
  health: string;
  healthBg: string;
  luckyNumbers: number[];
  powerHours: string[];
}

interface DailyForecast {
  date: string;
  overallTheme: string;
  overallThemeBg: string;
  mood: string;
  moodBg: string;
  energy: 'high' | 'medium' | 'low';
  transits: Transit[];
  moonPhase: MoonPhase;
  horoscope: Horoscope;
  recommendations: string[];
  recommendationsBg: string[];
  generatedAt: string;
  cached: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const ENERGY_CONFIG = {
  high:   { label: 'High Intensity', color: '#34D399', icon: '⚡', glow: 'rgba(52,211,153,0.25)' },
  medium: { label: 'Steady Flow',    color: '#00f0ff', icon: '∿',  glow: 'rgba(0,240,255,0.25)' },
  low:    { label: 'Low & Restful',  color: '#F59E0B', icon: '☽',  glow: 'rgba(245,158,11,0.25)' },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, gradient }: {
  label: string; value: string; sub?: string; gradient?: string;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-3 relative overflow-hidden"
      style={{
        background: gradient ?? 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-bold mb-1">{label}</p>
      <p className="text-base font-bold text-white leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}

function EnergyCard({ energy }: { energy: 'high' | 'medium' | 'low' }) {
  const cfg = ENERGY_CONFIG[energy];
  return (
    <div
      className="rounded-2xl px-4 py-3 relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-bold mb-1">Energy</p>
      <div className="flex items-center gap-2">
        <span className="text-base" style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="text-base font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      {/* Ambient glow */}
      <div
        className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`, filter: 'blur(8px)' }}
      />
    </div>
  );
}

function HoroscopeSection({ title, icon, text, accentColor }: {
  title: string; icon: string; text: string; accentColor: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <h3
        className="text-xs font-bold mb-2 flex items-center gap-1.5"
        style={{ color: accentColor }}
      >
        <span>{icon}</span> {title}
      </h3>
      <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
    </div>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

function ForecastLoading() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 select-none">
      <motion.div
        className="w-12 h-12 rounded-full mb-6"
        style={{ border: '1px solid rgba(228,26,255,0.3)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="w-2 h-2 rounded-full absolute"
          style={{ top: '-4px', left: '50%', transform: 'translateX(-50%)', background: '#e41aff', boxShadow: '0 0 8px #e41aff' }}
        />
      </motion.div>
      <p className="text-xs uppercase tracking-widest text-text-muted mb-3">Reading the stars</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-primary/50"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function ForecastPanel() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  const [forecast, setForecast]           = useState<DailyForecast | null>(null);
  const [phase, setPhase]                 = useState<'loading' | 'no-birth-data' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg]           = useState('');
  const [upgradeOpen, setUpgradeOpen]     = useState(false);
  const [locale, setLocale]               = useState('en');
  const [houseCusps, setHouseCusps]       = useState<number[]>([]);

  // Detect locale client-side (avoids hydration mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocale(localStorage.getItem('locale') || 'en');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const fetchForecast = useCallback(async () => {
    setPhase('loading');
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const res = await fetch(`${API_URL}/api/v1/forecasts/daily`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === 'BIRTH_DATA_MISSING') {
          setPhase('no-birth-data');
          return;
        }
        throw new Error(data.error?.message || 'Failed to load forecast');
      }

      setForecast(data.data);
      setPhase('ready');

      // Fetch natal house cusps for transit-house context (non-blocking, optional)
      try {
        const profilesRes = await fetch(`${API_URL}/api/v1/birth-data`, { headers: { Authorization: `Bearer ${localStorage.getItem('astrologaai_access_token')}` } });
        if (profilesRes.ok) {
          const pd = await profilesRes.json();
          const profiles = pd.data?.profiles ?? pd.data ?? [];
          if (profiles.length > 0) {
            const chartRes = await fetch(`${API_URL}/api/v1/birth-chart/${profiles[0].id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('astrologaai_access_token')}` },
            });
            if (chartRes.ok) {
              const chartData = await chartRes.json();
              const chart = chartData.data?.chart ?? chartData.data ?? chartData;
              const cusps: number[] = (chart.houses || []).map(
                (h: { sign: string; degree: number }) => toAbsDeg(h.degree, h.sign)
              );
              while (cusps.length < 12) cusps.push((cusps.length * 30) % 360);
              setHouseCusps(cusps);
            }
          }
        }
      } catch {
        // House cusps are optional — transits still display without house context
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchForecast();
  }, [isAuthenticated, fetchForecast]);

  const tier    = user?.tier ?? 'FREE';
  const isLocked = tier === 'FREE';

  // Enrich transits with computed house numbers when natal cusps are available
  const enrichedTransits = useMemo(() => {
    if (!forecast) return [];
    if (!houseCusps.length) return forecast.transits;
    return forecast.transits.map((t) => ({
      ...t,
      house: getTransitHouse(toAbsDeg(t.degree, t.sign), houseCusps),
    }));
  }, [forecast, houseCusps]);

  // ── States ──────────────────────────────────────────────────────────────────

  if (authLoading || phase === 'loading') return <ForecastLoading />;

  if (phase === 'no-birth-data') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="relative mb-6">
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.15) 0%, transparent 70%)', filter: 'blur(24px)', transform: 'scale(2)' }}
          />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.25)' }}
          >
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 10px rgba(228,26,255,0.7))' }}>✦</span>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">No birth data yet</h2>
        <p className="text-sm text-text-muted mb-8 max-w-[280px] leading-relaxed">
          Add your birth date, time, and location to receive your personalized daily forecast.
        </p>
        <a
          href="/birth-data/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          ✦ Add Birth Data
        </a>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-sm text-red-400 mb-4">{errorMsg}</p>
        <button onClick={fetchForecast} className="text-xs text-primary hover:opacity-80 transition-opacity">
          Try again
        </button>
      </div>
    );
  }

  if (!forecast) return null;

  const theme = locale === 'bg' ? forecast.overallThemeBg : forecast.overallTheme;
  const mood  = locale === 'bg' ? forecast.moodBg         : forecast.mood;
  const recs  = locale === 'bg' ? forecast.recommendationsBg : forecast.recommendations;

  // ── Ready layout ─────────────────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col min-h-full"
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="px-5 pt-5 pb-4 shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-0.5">
              Cosmic Weather
            </p>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">Daily Forecast</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{formatDate(forecast.date, locale)}</span>
                <button
                  onClick={fetchForecast}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  title="Refresh"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── Content ────────────────────────────────────────────────────── */}
          <div className="flex-1 px-5 pb-8 flex flex-col gap-4 min-h-0 overflow-y-auto">

            {/* Metric trio */}
            <div className="grid grid-cols-3 gap-2">
              <MetricCard
                label="Theme"
                value={theme}
                gradient="linear-gradient(135deg, rgba(228,26,255,0.1) 0%, rgba(0,240,255,0.06) 100%)"
              />
              <MetricCard label="Mood" value={mood} />
              <EnergyCard energy={forecast.energy} />
            </div>

            {/* Two-column layout on md+ */}
            <div className="flex flex-col md:flex-row gap-4 flex-1">

              {/* ── Left column ────────────────────────────────────────────── */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">

                {/* General horoscope */}
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-3">
                    Today&apos;s Guidance
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {locale === 'bg' ? forecast.horoscope.generalBg : forecast.horoscope.general}
                  </p>
                </div>

                {/* Life areas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <HoroscopeSection
                    title="Love"
                    icon="♡"
                    accentColor="#F472B6"
                    text={locale === 'bg' ? forecast.horoscope.loveBg : forecast.horoscope.love}
                  />
                  <HoroscopeSection
                    title="Career"
                    icon="◈"
                    accentColor="#A78BFA"
                    text={locale === 'bg' ? forecast.horoscope.careerBg : forecast.horoscope.career}
                  />
                  <HoroscopeSection
                    title="Health"
                    icon="◉"
                    accentColor="#34D399"
                    text={locale === 'bg' ? forecast.horoscope.healthBg : forecast.horoscope.health}
                  />
                </div>

                {/* Transits section */}
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold">
                      Active Transits
                    </p>
                    {isLocked && (
                      <span
                        className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
                      >
                        PRO
                      </span>
                    )}
                  </div>

                  {isLocked ? (
                    <LockedSection onUpgrade={() => setUpgradeOpen(true)}>
                      <TransitList transits={enrichedTransits.slice(0, 3)} locale={locale} />
                    </LockedSection>
                  ) : (
                    <TransitList transits={enrichedTransits} locale={locale} />
                  )}
                </div>
              </div>

              {/* ── Right column ───────────────────────────────────────────── */}
              <div className="md:w-[260px] md:shrink-0 flex flex-col gap-4">

                {/* Moon phase */}
                <MoonPhaseCard
                  phase={forecast.moonPhase.phase}
                  phaseBg={forecast.moonPhase.phaseBg}
                  illumination={forecast.moonPhase.illumination}
                  sign={forecast.moonPhase.sign}
                  signBg={forecast.moonPhase.signBg}
                  locale={locale}
                />

                {/* Lucky numbers */}
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-3">
                    Lucky Numbers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {forecast.horoscope.luckyNumbers.map((num, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 * i + 0.3, ease: 'backOut' }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                        style={{
                          background: 'linear-gradient(135deg, rgba(228,26,255,0.12) 0%, rgba(0,240,255,0.08) 100%)',
                          border: '1px solid rgba(228,26,255,0.2)',
                        }}
                      >
                        {num}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Power hours */}
                {forecast.horoscope.powerHours.length > 0 && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-3">
                      Power Hours
                    </p>
                    <div className="space-y-2">
                      {forecast.horoscope.powerHours.map((hours, i) => (
                        <div
                          key={i}
                          className="rounded-lg px-3 py-2 text-xs text-center font-medium text-white/70"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {hours}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {recs.length > 0 && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-3">
                      Guidance
                    </p>
                    <div className="space-y-2.5">
                      {recs.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5"
                            style={{ background: 'rgba(228,26,255,0.12)', color: '#e41aff' }}
                          >
                            {i + 1}
                          </div>
                          <p className="text-[11px] text-text-muted leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Oracle CTA */}
                <motion.a
                  href="/chat"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: 'rgba(228,26,255,0.06)',
                    border: '1px solid rgba(228,26,255,0.15)',
                  }}
                >
                  <span style={{ background: 'linear-gradient(135deg, #e41aff, #00f0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    ✦ Ask the Oracle
                  </span>
                  <span className="text-text-muted text-xs">→</span>
                </motion.a>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Upgrade modal */}
      <UpgradeModal
        isOpen={upgradeOpen}
        feature="Planetary Transits"
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
