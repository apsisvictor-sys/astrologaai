'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { TransitCommentaryCard } from '@/components/transits/transit-commentary-card';

const COLORS = {
  backgroundPrimary: '#0D0010',
  backgroundSecondary: 'rgba(255,255,255,0.03)',
  primary: '#e41aff',
  textPrimary: '#FAFAFA',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.3)',
  gradient: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
  positive: '#10B981',
  challenging: '#F59E0B',
  neutral: '#94A3B8',
  border: 'rgba(228,26,255,0.2)',
  surface: 'rgba(255,255,255,0.04)',
};

const FAST_MOVERS = ['moon', 'sun', 'mercury', 'venus', 'mars'];
const SOCIAL_PLANETS = ['jupiter', 'saturn'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface TransitAspect {
  transitPlanet: string;
  transitPlanetBg: string;
  natalPlanet: string;
  natalPlanetBg: string;
  aspect: string;
  aspectBg: string;
  orb: number;
  influence: 'positive' | 'challenging' | 'neutral';
  description: string;
}

interface SkyPosition {
  planet: string;
  planetBg: string;
  sign: string;
  signBg: string;
  degree: number;
  retrograde: boolean;
}

interface MoonPhase {
  phase: string;
  phaseBg: string;
  illumination: number;
  moonSign: string;
  moonSignBg: string;
}

interface TransitData {
  date: string;
  skyPositions: SkyPosition[];
  aspectsToNatal: TransitAspect[];
  moonPhase: MoonPhase;
  generatedAt: string;
}

function getCategory(planet: string): 'today' | 'season' | 'longterm' {
  if (FAST_MOVERS.includes(planet)) return 'today';
  if (SOCIAL_PLANETS.includes(planet)) return 'season';
  return 'longterm';
}

function influenceColor(influence: string): string {
  if (influence === 'positive') return COLORS.positive;
  if (influence === 'challenging') return COLORS.challenging;
  return COLORS.neutral;
}

function TransitCard({ aspect, locale }: { aspect: TransitAspect; locale: string }) {
  const color = influenceColor(aspect.influence);
  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: COLORS.backgroundSecondary, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold" style={{ color: COLORS.textPrimary }}>
              {aspect.transitPlanetBg}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${color}20`, color }}
            >
              {aspect.aspectBg}
            </span>
            <span style={{ color: COLORS.textSecondary }}>
              {locale === 'bg' ? 'natal' : 'natal'} {aspect.natalPlanetBg}
            </span>
          </div>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            {aspect.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs mb-0.5" style={{ color: COLORS.textMuted }}>
            {locale === 'bg' ? 'орб' : 'orb'}
          </div>
          <div className="font-mono text-sm font-semibold" style={{ color }}>
            {aspect.orb}°
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
        <span>{emoji}</span>
        <span>{title}</span>
      </h2>
      <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{subtitle}</p>
    </div>
  );
}

export default function ActiveTransitsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<TransitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/transits');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const token = localStorage.getItem('astrologaai_access_token');
    if (!token) return;

    fetch(`${API_URL}/api/v1/forecasts/transits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || (locale === 'bg' ? 'Грешка при зареждане' : 'Failed to load transits'));
        }
      })
      .catch(() => setError(locale === 'bg' ? 'Мрежова грешка' : 'Network error'))
      .finally(() => setIsLoading(false));
  }, [authLoading, isAuthenticated, locale]);

  if (authLoading || isLoading) {
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
          <p style={{ color: COLORS.textSecondary }}>
            {locale === 'bg' ? 'Зареждане...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  const todayAspects = data?.aspectsToNatal.filter(a => getCategory(a.transitPlanet) === 'today') ?? [];
  const seasonAspects = data?.aspectsToNatal.filter(a => getCategory(a.transitPlanet) === 'season') ?? [];
  const longtermAspects = data?.aspectsToNatal.filter(a => getCategory(a.transitPlanet) === 'longterm') ?? [];

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: COLORS.backgroundPrimary }}>
      <div className="max-w-2xl mx-auto">

        {/* Back link */}
        <Link
          href="/forecast"
          className="inline-flex items-center gap-2 mb-8 text-sm"
          style={{ color: COLORS.textSecondary }}
        >
          ← {locale === 'bg' ? 'Прогнози' : 'Forecasts'}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.textPrimary }}>
            {locale === 'bg' ? 'Активни транзити' : 'Active Transits'}
          </h1>
          {data && (
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              {locale === 'bg' ? `Небе за ${data.date}` : `Sky for ${data.date}`}
              {' · '}
              {data.moonPhase.phaseBg} {data.moonPhase.illumination}%
              {' · '}
              {locale === 'bg' ? 'Луна в' : 'Moon in'} {data.moonPhase.moonSignBg}
            </p>
          )}
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', color: '#EF4444' }}
          >
            {error}
          </div>
        )}

        {/* Oracle transit commentary card — loads independently */}
        {isAuthenticated && <TransitCommentaryCard locale={locale} />}

        {data && (
          <>
            {/* Today — fast movers */}
            {todayAspects.length > 0 && (
              <section className="mb-8">
                <SectionHeader
                  emoji="⚡"
                  title={locale === 'bg' ? 'Днешни влияния' : "Today's Influences"}
                  subtitle={locale === 'bg'
                    ? 'Слънце, Луна, Меркурий, Венера, Марс · часове до дни'
                    : 'Sun, Moon, Mercury, Venus, Mars · hours to days'}
                />
                <div className="space-y-3">
                  {todayAspects.map((a) => (
                    <TransitCard
                      key={`${a.transitPlanet}-${a.aspect}-${a.natalPlanet}`}
                      aspect={a}
                      locale={locale}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Season — Jupiter/Saturn */}
            {seasonAspects.length > 0 && (
              <section className="mb-8">
                <SectionHeader
                  emoji="🌊"
                  title={locale === 'bg' ? 'Тази сезон' : 'This Season'}
                  subtitle={locale === 'bg'
                    ? 'Юпитер, Сатурн · седмици до месеци'
                    : 'Jupiter, Saturn · weeks to months'}
                />
                <div className="space-y-3">
                  {seasonAspects.map((a) => (
                    <TransitCard
                      key={`${a.transitPlanet}-${a.aspect}-${a.natalPlanet}`}
                      aspect={a}
                      locale={locale}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Long-term — outer planets */}
            {longtermAspects.length > 0 && (
              <section className="mb-8">
                <SectionHeader
                  emoji="✨"
                  title={locale === 'bg' ? 'Дългосрочни теми' : 'Long-Term Themes'}
                  subtitle={locale === 'bg'
                    ? 'Уран, Нептун, Плутон, Хирон · месеци до години'
                    : 'Uranus, Neptune, Pluto, Chiron · months to years'}
                />
                <div className="space-y-3">
                  {longtermAspects.map((a) => (
                    <TransitCard
                      key={`${a.transitPlanet}-${a.aspect}-${a.natalPlanet}`}
                      aspect={a}
                      locale={locale}
                    />
                  ))}
                </div>
              </section>
            )}

            {data.aspectsToNatal.length === 0 && (
              <div className="text-center py-16" style={{ color: COLORS.textSecondary }}>
                <p className="text-4xl mb-4">🌌</p>
                <p>{locale === 'bg' ? 'Няма активни аспекти в момента.' : 'No active aspects at this time.'}</p>
              </div>
            )}

            {/* Sky overview strip */}
            <section
              className="p-4 rounded-xl"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: COLORS.textMuted }}>
                {locale === 'bg' ? 'Небесни позиции' : 'Current sky positions'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.skyPositions.map((p) => (
                  <span
                    key={p.planet}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: COLORS.backgroundSecondary, color: COLORS.textSecondary }}
                  >
                    {p.planetBg} {p.signBg} {p.degree}°{p.retrograde ? ' ℞' : ''}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
