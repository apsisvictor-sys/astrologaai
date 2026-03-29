'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { NatalChartCanvas } from '@/components/astrology/natal-chart-canvas';
import { BigThreeCard }        from './big-three-card';
import { PlanetTable }         from './planet-table';
import { ElementsCard }        from './elements-card';
import { AspectsSummary }      from './aspects-summary';
import { AspectGrid }          from './aspect-grid';
import { ChartLoadingAnimation } from './chart-loading-animation';
import { adaptNatalChart, type BackendNatalChart } from './natal-chart-adapter';
import { ShareCardModal } from './ShareCardModal';
import { trackFirstChartViewed } from '@/lib/analytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface BirthProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string | null;
  locationName: string;
  isUnknownTime: boolean;
}

export function ChartPanel() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<'loading' | 'no-birth-data' | 'ready' | 'error'>('loading');
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [rawChart, setRawChart] = useState<BackendNatalChart | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadChart();
  }, [isAuthenticated]);

  useEffect(() => {
    if (phase !== 'ready' || !profile || !user?.id) return;

    trackFirstChartViewed({
      userId: user.id,
      isUnknownTime: profile.isUnknownTime,
    });
  }, [phase, profile, user?.id]);

  async function loadChart() {
    setPhase('loading');
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Get birth profiles
      const profilesRes = await fetch(`${API_URL}/api/v1/birth-data`, { headers });
      if (!profilesRes.ok) throw new Error('Failed to load profiles');
      const profilesData = await profilesRes.json();
      const profiles: BirthProfile[] = profilesData.data?.profiles ?? profilesData.data ?? [];

      if (!profiles.length) {
        setPhase('no-birth-data');
        return;
      }

      const activeProfile = profiles[0];
      setProfile(activeProfile);

      // 2. Fetch chart for first (primary) profile
      const chartRes = await fetch(`${API_URL}/api/v1/birth-chart/${activeProfile.id}`, { headers });
      if (!chartRes.ok) throw new Error('Failed to load chart');
      const chartData = await chartRes.json();
      const chart: BackendNatalChart = chartData.data?.chart ?? chartData.data ?? chartData;

      setRawChart(chart);
      setPhase('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('error');
    }
  }

  // ── No birth data state ────────────────────────────────────────────────────
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

        <h2 className="text-lg font-semibold text-white mb-2">Your chart is ready to be revealed</h2>
        <p className="text-sm text-text-muted mb-8 max-w-[280px] leading-relaxed">
          Add your birth date, time, and location to generate your personal natal chart.
        </p>

        <a
          href="/birth-data/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          ✦ Add Birth Data
        </a>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-sm text-red-400 mb-4">{errorMsg}</p>
        <button
          onClick={loadChart}
          className="text-xs text-primary hover:opacity-80 transition-opacity"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (phase === 'loading' || !rawChart) {
    return <ChartLoadingAnimation />;
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  const chartData = adaptNatalChart(rawChart);
  const sun     = rawChart.sun;
  const moon    = rawChart.moon;
  const rising  = rawChart.rising ?? rawChart.ascendant;
  const hasElements = !!rawChart.elements;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col min-h-full"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-0.5">
            Personal Alignment
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Your Cosmic Blueprint</h1>
            <div className="flex items-center gap-3">
              {user && (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', background: 'transparent',
                    border: '1px solid #e41aff', color: '#e41aff',
                    borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Share my chart ✦
                </button>
              )}
              {profile && (
                <span className="text-xs text-text-muted">{profile.name}</span>
              )}
            </div>
          </div>
          {profile?.isUnknownTime && (
            <p className="text-[11px] text-pro-gold mt-1">⚠ Birth time unknown — house cusps approximate</p>
          )}
        </div>

        {showShareModal && user && (
          <ShareCardModal userId={user.id} onClose={() => setShowShareModal(false)} />
        )}

        {/* ── Two-column on desktop, single on mobile ─────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row gap-5 px-5 pb-8">

          {/* Left: Chart wheel */}
          <div className="md:w-[420px] md:shrink-0 flex items-start justify-center">
            <div
              className="w-full rounded-3xl p-4 relative overflow-hidden"
              style={{
                background: 'rgba(10,0,16,0.8)',
                border: '1px solid rgba(228,26,255,0.12)',
                boxShadow: '0 0 60px rgba(228,26,255,0.06), inset 0 0 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* Ambient corner glows */}
              <div
                className="absolute -top-8 -left-8 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.15) 0%, transparent 70%)', filter: 'blur(16px)' }}
              />
              <div
                className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)', filter: 'blur(16px)' }}
              />
              <NatalChartCanvas data={chartData} size={400} />
            </div>
          </div>

          {/* Right: Data panels */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Big Three */}
            <BigThreeCard
              sun={{ sign: sun.sign, degree: sun.degree }}
              moon={{ sign: moon.sign, degree: moon.degree }}
              rising={rising ? { sign: rising.sign, degree: rising.degree } : undefined}
            />

            {/* Elements + Planet table side by side on wider screens */}
            <div className="flex flex-col sm:flex-row gap-4">
              {hasElements && (
                <div className="sm:w-44 shrink-0">
                  <ElementsCard elements={rawChart.elements!} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <PlanetTable planets={chartData.planets} />
              </div>
            </div>

            {/* Aspects */}
            {rawChart.aspects && rawChart.aspects.length > 0 && (
              <AspectsSummary aspects={rawChart.aspects} />
            )}

            {/* Aspect Grid Matrix */}
            {rawChart.aspects && rawChart.aspects.length > 0 && (
              <AspectGrid
                aspects={rawChart.aspects}
                planets={chartData.planets.map(p => p.name)}
              />
            )}

            {/* Oracle CTA */}
            <motion.a
              href="/chat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 mt-auto"
              style={{
                background: 'rgba(228,26,255,0.06)',
                border: '1px solid rgba(228,26,255,0.15)',
              }}
            >
              <span style={{ background: 'linear-gradient(135deg, #e41aff, #00f0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ✦ Ask the Oracle about your chart
              </span>
              <span className="text-text-muted text-xs">→</span>
            </motion.a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
