'use client';

import { useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NatalChartCanvas } from '@/components/astrology/natal-chart-canvas';
import { Sparkles, MessageSquare, Compass, Settings, Users, ArrowRight } from 'lucide-react';

const copy = {
  bg: {
    title: 'Космическо Табло',
    subtitle: 'Вашата ефирна връзка с Оракула',
    profile: 'Профил',
    quickActions: 'Бързи действия',
    plan: 'Звезден План',
    guest: 'Пътешественик',
    freePlan: 'Търсач (Безплатен)',
    usage: 'Оставащи въпроси',
    upgrade: 'Отключи Оракула',
    chartTitle: 'Вашата Натална Карта'
  },
  en: {
    title: 'Cosmic Dashboard',
    subtitle: 'Your ethereal connection to The Oracle',
    profile: 'Profile',
    quickActions: 'Quick Actions',
    plan: 'Astral Plan',
    guest: 'Traveler',
    freePlan: 'The Seeker (Free)',
    usage: 'Queries remaining',
    upgrade: 'Unlock The Oracle',
    chartTitle: 'Your Ethereal Natal Chart'
  }
} as const;

export default function DashboardPage({ params: { locale } }: { params: { locale: 'bg' | 'en' } }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const c = copy[locale] ?? copy.bg;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-deep">
        <Sparkles className="w-8 h-8 text-primary animate-spin-slow" />
      </div>
    );
  }

  const quickActions = [
    { href: '/chat', label: 'Consult Oracle', icon: MessageSquare, color: 'text-primary' },
    { href: '/forecast', label: 'Transits', icon: Compass, color: 'text-accent-blue' },
    { href: '/partners', label: 'Synastry', icon: Users, color: 'text-[#ff0080]' },
    { href: '/settings', label: 'Settings', icon: Settings, color: 'text-text-muted' }
  ];

  return (
    <main className="relative min-h-screen pt-24 pb-16 overflow-hidden selection:bg-primary/40 text-slate-100">
      {/* Dynamic Background Elements - Void Prism Orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="blur-sphere w-[500px] h-[500px] top-[-10%] right-[-10%] bg-primary"></div>
        <div className="blur-sphere w-[600px] h-[600px] bottom-[-20%] left-[-20%] bg-accent-blue mix-blend-screen opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{c.title}</h1>
            <p className="text-text-secondary text-lg">{c.subtitle}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">

          {/* Left Column: Chart & Identity */}
          <div className="lg:col-span-8 flex flex-col gap-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* The Ethereal Chart Panel */}
            <section className="glass-panel p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </span>
                  {c.chartTitle}
                </h2>
                <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] border border-primary/30 bg-primary/10 px-4 py-2 rounded-full hidden sm:block">
                  Swiss Ephemeris Sync
                </span>
              </div>

              {/* The Custom SVG Component */}
              <div className="py-8 flex justify-center">
                <div className="relative shadow-[0_0_25px_rgba(228,26,255,0.25)] rounded-full group-hover:shadow-[0_0_35px_rgba(228,26,255,0.4)] transition-shadow duration-700">
                  <NatalChartCanvas size={450} />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Actions & Subscription */}
          <div className="lg:col-span-4 flex flex-col gap-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

            {/* Subscription Panel */}
            <section className="glass-panel p-6 relative overflow-hidden group">
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-primary blur-[40px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

              <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">{c.plan}</h2>
              <div className="mb-6 relative z-10">
                <p className="text-3xl font-display font-bold text-white mb-2">
                  {user?.tier || c.freePlan}
                </p>
                <p className="text-text-secondary text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {c.usage}: 10
                </p>
              </div>

              <Link href="/pricing" className="relative z-10 w-full flex items-center justify-between bg-gradient-to-r from-primary to-accent-blue text-white font-bold py-4 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(228,26,255,0.4)] transition-all duration-300 transform hover:scale-[1.02]">
                {c.upgrade}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </section>

            {/* Quick Actions Grid */}
            <section className="glass-panel p-6">
              <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">{c.quickActions}</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl bg-background-dark/50 border border-white/5 hover:bg-white/5 hover:border-primary/50 transition-all duration-300 group"
                  >
                    <action.icon className={`w-6 h-6 mb-3 ${action.color} group-hover:scale-110 transition-transform duration-300`} />
                    <span className="text-xs font-medium text-text-secondary group-hover:text-white transition-colors">{action.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Profile Summary */}
            <section className="glass-panel p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-background-dark border border-primary/30 flex items-center justify-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent-blue shadow-[0_0_15px_rgba(228,26,255,0.2)]">
                  {(user?.fullName || c.guest).charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium text-lg">{user?.fullName || c.guest}</p>
                  <p className="text-sm text-text-muted">{user?.email}</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
