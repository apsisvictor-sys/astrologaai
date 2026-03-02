'use client';

import { useEffect } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';

const copy = {
  bg: {
    title: 'Твоето табло',
    subtitle: 'Бърз достъп до най-важното в AstroLogAI',
    profile: 'Профил',
    quickActions: 'Бързи действия',
    plan: 'План и използване',
    guest: 'Потребител',
    freePlan: 'Безплатен план',
    usage: 'Използване този месец',
    upgrade: 'Виж планове'
  },
  en: {
    title: 'Your Dashboard',
    subtitle: 'Quick access to your core AstroLogAI actions',
    profile: 'Profile',
    quickActions: 'Quick Actions',
    plan: 'Subscription & Usage',
    guest: 'User',
    freePlan: 'Free plan',
    usage: 'Usage this month',
    upgrade: 'View plans'
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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#050510', color: '#CBD5E1' }}>Loading...</div>;
  }

  if (!isAuthenticated) return null;

  const quickActions = [
    { href: '/chat', label: 'Chat', emoji: '💬' },
    { href: '/forecast', label: 'Forecast', emoji: '✨' },
    { href: '/chart', label: 'Chart', emoji: '🌌' },
    { href: '/partners', label: 'Partners', emoji: '💕' },
    { href: '/settings', label: 'Settings', emoji: '⚙️' }
  ];

  return (
    <main className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #1A1A2E 0%, #050510 50%, #000000 100%)', color: '#F8FAFC' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{c.title}</h1>
            <p style={{ color: '#CBD5E1' }}>{c.subtitle}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="rounded-2xl border p-6" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
            <h2 className="text-xl font-semibold mb-4">{c.profile}</h2>
            <p className="text-lg font-medium">{user?.fullName || c.guest}</p>
            <p style={{ color: '#CBD5E1' }}>{user?.email}</p>
            <p className="mt-3 text-sm" style={{ color: '#8B5CF6' }}>{user?.emailVerified ? '✓ Email verified' : '⚠ Email not verified'}</p>
          </section>

          <section className="rounded-2xl border p-6 lg:col-span-2" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
            <h2 className="text-xl font-semibold mb-4">{c.quickActions}</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href} className="rounded-xl border px-4 py-3 text-sm font-medium" style={{ borderColor: '#1A1A3A', color: '#CBD5E1' }}>
                  <span className="mr-2">{action.emoji}</span>{action.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-6 lg:col-span-3" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
            <h2 className="text-xl font-semibold mb-3">{c.plan}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium">{user?.tier || c.freePlan}</p>
                <p style={{ color: '#CBD5E1' }}>{c.usage}: --</p>
              </div>
              <Link href="/pricing" className="px-5 py-2 rounded-xl font-medium" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}>
                {c.upgrade}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
