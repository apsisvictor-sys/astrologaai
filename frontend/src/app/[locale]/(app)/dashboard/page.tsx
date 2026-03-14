'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import CircularChartWheel from '@/components/chart/circular-chart-wheel';
import { PlanetDataPanel } from '@/components/chart/planet-data-panel';
import { adaptChartForWheel } from '@/components/chart/adapt-chart-for-wheel';
import type { BackendNatalChart } from '@/components/chart/natal-chart-adapter';
import type { NatalChart } from '@/components/chart/circular-chart-wheel';
import { Sparkles, MessageSquare, Compass, Settings, Users, ArrowRight } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { DailyHoroscopeCard } from '@/components/forecast/daily-horoscope-card';
import { OracleWelcome } from '@/components/chat/oracle-welcome';

interface BirthProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string | null;
  isUnknownTime: boolean;
}

const copy = {
  bg: {
    title: 'Космическо Табло',
    subtitle: 'Вашата ефирна връзка с Оракула',
    quickActions: 'Бързи действия',
    plan: 'Звезден План',
    freePlan: 'Търсач (Безплатен)',
    usage: 'Оставащи въпроси',
    upgrade: 'Отключи Оракула',
    addBirthData: 'Добави Натални Данни',
    noBirthDataMsg: 'Добави своята дата, час и място на раждане, за да разкриеш своята натална карта.',
    calculating: 'Изчисляване...',
    errorMsg: 'Грешка при зареждане',
    retry: 'Опитай отново',
    resetZoom: 'Нулирай зум',
    zoomHint: 'Скролни за зум',
    timeUnknown: '⚠ Часът е неизвестен',
  },
  en: {
    title: 'Cosmic Dashboard',
    subtitle: 'Your ethereal connection to The Oracle',
    quickActions: 'Quick Actions',
    plan: 'Astral Plan',
    freePlan: 'The Seeker (Free)',
    usage: 'Queries remaining',
    upgrade: 'Unlock The Oracle',
    addBirthData: 'Add Birth Data',
    noBirthDataMsg: 'Add your birth date, time, and location to reveal your natal chart.',
    calculating: 'Calculating...',
    errorMsg: 'Error loading chart',
    retry: 'Try again',
    resetZoom: 'Reset zoom',
    zoomHint: 'Scroll to zoom',
    timeUnknown: '⚠ Time unknown',
  },
} as const;

export default function DashboardPage({
  params: { locale },
}: {
  params: { locale: 'bg' | 'en' };
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const c = copy[locale] ?? copy.en;

  const [phase, setPhase] = useState<'loading' | 'no-birth-data' | 'ready' | 'error'>('loading');
  const [rawChart, setRawChart] = useState<BackendNatalChart | null>(null);
  const [adaptedChart, setAdaptedChart] = useState<NatalChart | null>(null);
  const [profileName, setProfileName] = useState('');
  const [isUnknownTime, setIsUnknownTime] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Non-passive wheel listener so preventDefault() actually stops page scroll
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.6, Math.min(2.5, z - e.deltaY * 0.001)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [phase]);

  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  const zoomIn  = useCallback(() => setZoom(z => Math.min(2.5, z + 0.2)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.6, z - 0.2)), []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const stopDrag = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  // Check for pending notice from guest migration
  useEffect(() => {
    const notice = localStorage.getItem('astrologaai_pending_notice');
    if (notice) {
      setPendingNotice(notice);
      localStorage.removeItem('astrologaai_pending_notice');
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadChart();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChart() {
    setPhase('loading');
    try {
      const profilesResult = await apiGet<{ profiles?: BirthProfile[] }>('/api/v1/birth-data');
      const profiles: BirthProfile[] = profilesResult.data?.profiles ?? [];

      if (!profiles.length) {
        setPhase('no-birth-data');
        return;
      }

      const primary = profiles[0];
      setProfileName(primary.name);
      setIsUnknownTime(primary.isUnknownTime);

      const chartResult = await apiGet<{ chart?: BackendNatalChart }>(`/api/v1/birth-chart/${primary.id}`);
      const chart: BackendNatalChart = chartResult.data?.chart ?? (chartResult.data as BackendNatalChart);

      setRawChart(chart);
      setAdaptedChart(adaptChartForWheel(chart));
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }

  const quickActions = [
    { href: '/chat',     label: locale === 'bg' ? 'Оракул'    : 'Oracle',    icon: MessageSquare, color: 'text-primary'      },
    { href: '/forecast', label: locale === 'bg' ? 'Транзити'  : 'Transits',  icon: Compass,       color: 'text-accent-blue'  },
    { href: '/partners', label: locale === 'bg' ? 'Синастрия' : 'Synastry',  icon: Users,         color: 'text-[#ff0080]'    },
    { href: '/settings', label: locale === 'bg' ? 'Настройки' : 'Settings',  icon: Settings,      color: 'text-text-muted'   },
  ];

  if (isLoading || (!isAuthenticated && phase === 'loading')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-deep">
        <Sparkles className="w-8 h-8 text-primary animate-spin-slow" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen pt-24 pb-16 overflow-hidden selection:bg-primary/40 text-slate-100">
      {/* Background orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="blur-sphere w-[500px] h-[500px] top-[-10%] right-[-10%] bg-primary" />
        <div className="blur-sphere w-[600px] h-[600px] bottom-[-20%] left-[-20%] bg-accent-blue mix-blend-screen opacity-20" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6">

        {/* Birth data migration failure notice */}
        {pendingNotice === 'birth_data_failed' && (
          <div className="mb-6 flex items-start justify-between gap-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.25)' }}>
            <p className="text-text-secondary">
              We had a problem importing your birth data from the chat session. Please add it manually in{' '}
              <a href="/settings/birth-data" className="text-primary hover:underline">Settings → Birth Data</a>.
            </p>
            <button onClick={() => setPendingNotice(null)} className="text-white/30 hover:text-white/60 shrink-0 text-lg leading-none">×</button>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 animate-fade-in-up">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{c.title}</h1>
            <p className="text-text-secondary text-lg">{c.subtitle}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* Chart wheel (9 cols) */}
          <div className="lg:col-span-9 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div
              className="rounded-2xl p-5 relative overflow-hidden h-full flex flex-col"
              style={{
                background: 'rgba(10,0,16,0.7)',
                border: '1px solid rgba(228,26,255,0.15)',
                boxShadow: '0 0 60px rgba(228,26,255,0.06)',
              }}
            >
              {/* Corner ambient glow */}
              <div
                className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(228,26,255,0.1) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />

              {/* Chart header */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{
                    background: 'linear-gradient(90deg, #e41aff 0%, #a855f7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {locale === 'bg' ? 'Вашата Натална Карта' : 'Your Natal Chart'}
                </span>
                <div className="flex items-center gap-2">
                  {isUnknownTime && phase === 'ready' && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(245,158,11,0.1)',
                        color: '#F59E0B',
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}
                    >
                      {c.timeUnknown}
                    </span>
                  )}
                  {profileName && (
                    <span className="text-xs text-text-muted shrink-0">{profileName}</span>
                  )}
                </div>
              </div>

              {/* Content area — fills remaining card height */}
              <div className="flex-1 flex flex-col min-h-0">

                {/* Loading */}
                {phase === 'loading' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'rgba(228,26,255,0.4)', borderTopColor: '#e41aff' }}
                      />
                      <p className="text-xs text-text-muted">{c.calculating}</p>
                    </div>
                  </div>
                )}

                {/* No birth data */}
                {phase === 'no-birth-data' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        background: 'rgba(228,26,255,0.08)',
                        border: '1px solid rgba(228,26,255,0.2)',
                      }}
                    >
                      <span
                        className="text-2xl"
                        style={{ filter: 'drop-shadow(0 0 10px rgba(228,26,255,0.7))' }}
                      >
                        ✦
                      </span>
                    </div>
                    <p className="text-sm text-text-muted max-w-xs">{c.noBirthDataMsg}</p>
                    <Link
                      href="/birth-data/new"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                      style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
                    >
                      ✦ {c.addBirthData}
                    </Link>
                  </div>
                )}

                {/* Error */}
                {phase === 'error' && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <p className="text-sm text-red-400">{c.errorMsg}</p>
                    <button
                      onClick={loadChart}
                      className="text-xs text-primary hover:opacity-80 transition-opacity"
                    >
                      {c.retry}
                    </button>
                  </div>
                )}

                {/* Chart */}
                {phase === 'ready' && adaptedChart && (
                  <div
                    ref={chartRef}
                    className="flex-1 min-h-0 overflow-hidden rounded-2xl flex items-center justify-center relative"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrag}
                    onMouseLeave={stopDrag}
                    style={{
                      cursor: isDragging ? 'grabbing' : 'default',
                      boxShadow: '0 0 30px rgba(228,26,255,0.1)',
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxHeight: '100%',
                        aspectRatio: '1 / 1',
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.15s ease',
                      }}
                    >
                      <CircularChartWheel
                        chart={adaptedChart}
                        size={500}
                        language={locale}
                        showAspects
                      />
                    </div>

                    {/* Zoom controls — bottom-right */}
                    <div
                      className="absolute bottom-3 right-3 flex items-center gap-1.5"
                      onMouseDown={e => e.stopPropagation()}
                    >
                      {zoom !== 1 && (
                        <button
                          onClick={resetZoom}
                          className="text-[10px] px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                          style={{
                            background: 'rgba(228,26,255,0.12)',
                            color: 'rgba(228,26,255,0.7)',
                            border: '1px solid rgba(228,26,255,0.2)',
                          }}
                        >
                          {c.resetZoom}
                        </button>
                      )}
                      <button
                        onClick={zoomOut}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold hover:opacity-80 transition-opacity"
                        style={{
                          background: 'rgba(228,26,255,0.12)',
                          color: 'rgba(228,26,255,0.8)',
                          border: '1px solid rgba(228,26,255,0.2)',
                        }}
                      >
                        −
                      </button>
                      <button
                        onClick={zoomIn}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold hover:opacity-80 transition-opacity"
                        style={{
                          background: 'rgba(228,26,255,0.12)',
                          color: 'rgba(228,26,255,0.8)',
                          border: '1px solid rgba(228,26,255,0.2)',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Planet data panel (3 cols) */}
          <div className="lg:col-span-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            {phase === 'ready' && rawChart ? (
              <PlanetDataPanel rawChart={rawChart} language={locale} />
            ) : (
              <div
                className="rounded-2xl h-full"
                style={{
                  background: 'rgba(13,0,18,0.5)',
                  border: '1px solid rgba(228,26,255,0.08)',
                  minHeight: 400,
                }}
              />
            )}
          </div>

          {/* Daily Horoscope card (full width) — visible to all users with birth data */}
          {phase === 'ready' && (
            <div className="lg:col-span-12 animate-fade-in-up" style={{ animationDelay: '0.18s' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">Today's Reading</span>
              </div>
              <DailyHoroscopeCard tier={(user?.tier as 'FREE' | 'PRO' | 'PREMIUM') || 'FREE'} />
            </div>
          )}

          {/* Subscription card (6 cols) */}
          <div className="lg:col-span-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <section className="glass-panel p-6 relative overflow-hidden group h-full">
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-primary blur-[40px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">
                {c.plan}
              </h2>
              <div className="mb-5 relative z-10">
                <p className="text-2xl font-display font-bold text-white mb-1">
                  {user?.tier || c.freePlan}
                </p>
                <p className="text-text-secondary text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {c.usage}: 10
                </p>
              </div>
              <Link
                href="/pricing"
                className="relative z-10 w-full flex items-center justify-between bg-gradient-to-r from-primary to-accent-blue text-white font-bold py-3.5 px-5 rounded-xl hover:shadow-[0_0_20px_rgba(228,26,255,0.4)] transition-all duration-300"
              >
                {c.upgrade}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </section>
          </div>

          {/* Quick actions (6 cols) */}
          <div className="lg:col-span-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <section className="glass-panel p-6 h-full">
              <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">
                {c.quickActions}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map(action => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-background-dark/50 border border-white/5 hover:bg-white/5 hover:border-primary/50 transition-all duration-300 group"
                  >
                    <action.icon
                      className={`w-5 h-5 mb-2.5 ${action.color} group-hover:scale-110 transition-transform duration-300`}
                    />
                    <span className="text-xs font-medium text-text-secondary group-hover:text-white transition-colors">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Profile strip (full width) */}
          <div className="lg:col-span-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <section className="glass-panel px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(228,26,255,0.15), rgba(0,240,255,0.1))',
                    border: '1px solid rgba(228,26,255,0.3)',
                  }}
                >
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent-blue">
                    {(user?.fullName || 'T').charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {user?.fullName || (locale === 'bg' ? 'Пътешественик' : 'Traveler')}
                  </p>
                  <p className="text-xs text-text-muted">{user?.email}</p>
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </main>
  );
}
