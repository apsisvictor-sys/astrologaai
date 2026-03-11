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

  const [zoom, setZoom] = useState(1);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.6, Math.min(2.5, z - e.deltaY * 0.001)));
  }, []);

  const resetZoom = useCallback(() => setZoom(1), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

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

  const sun    = rawChart?.sun;
  const moon   = rawChart?.moon;
  const rising = rawChart?.rising ?? rawChart?.ascendant;

  return (
    <main className="relative min-h-screen pt-24 pb-16 overflow-hidden selection:bg-primary/40 text-slate-100">
      {/* Background orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="blur-sphere w-[500px] h-[500px] top-[-10%] right-[-10%] bg-primary" />
        <div className="blur-sphere w-[600px] h-[600px] bottom-[-20%] left-[-20%] bg-accent-blue mix-blend-screen opacity-20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 animate-fade-in-up">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{c.title}</h1>
            <p className="text-text-secondary text-lg">{c.subtitle}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* Chart wheel (7 cols) */}
          <div className="lg:col-span-7 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div
              className="rounded-2xl p-5 relative overflow-hidden h-full"
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

              {/* Big 3 header */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                {phase === 'ready' && sun && moon && rising ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-white">☉ {sun.sign}</span>
                    <span className="text-text-muted text-xs">·</span>
                    <span className="text-sm font-medium text-white">☽ {moon.sign}</span>
                    <span className="text-text-muted text-xs">·</span>
                    <span className="text-sm font-medium text-white">↑ {rising.sign}</span>
                    {isUnknownTime && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full ml-1"
                        style={{
                          background: 'rgba(245,158,11,0.1)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245,158,11,0.2)',
                        }}
                      >
                        {c.timeUnknown}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-5" />
                )}
                {profileName && (
                  <span className="text-xs text-text-muted shrink-0 ml-2">{profileName}</span>
                )}
              </div>

              {/* Loading */}
              {phase === 'loading' && (
                <div className="flex items-center justify-center" style={{ minHeight: 420 }}>
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
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
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
                <div className="flex flex-col items-center justify-center py-16 gap-3">
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
                <>
                  {zoom === 1 ? (
                    <p className="text-[10px] text-center mb-2" style={{ color: 'rgba(255,255,255,0.18)' }}>
                      {c.zoomHint}
                    </p>
                  ) : (
                    <button
                      onClick={resetZoom}
                      className="text-[10px] text-center mb-2 w-full hover:opacity-80 transition-opacity"
                      style={{ color: 'rgba(228,26,255,0.5)' }}
                    >
                      {c.resetZoom}
                    </button>
                  )}

                  <div
                    ref={chartRef}
                    className="overflow-hidden rounded-2xl"
                    onWheel={handleWheel}
                    style={{
                      cursor: zoom > 1 ? 'grab' : 'default',
                      boxShadow: '0 0 30px rgba(228,26,255,0.1)',
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <CircularChartWheel
                        chart={adaptedChart}
                        size={500}
                        language={locale}
                        showAspects
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Planet data panel (5 cols) */}
          <div className="lg:col-span-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
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
