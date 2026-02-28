/**
 * Daily Forecast Page
 * US-15: Daily Forecast
 *
 * Displays personalized daily astrological forecast
 * Route: /forecast (Bulgarian default) or /en/forecast (English)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

// Design system colors
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

// Types based on backend forecast service
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

export default function DailyForecastPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const locale = typeof window !== 'undefined'
    ? (localStorage.getItem('locale') || 'bg')
    : 'bg';

  const [forecast, setForecast] = useState<DailyForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsBirthData, setNeedsBirthData] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch forecast data
  const fetchForecast = useCallback(async () => {
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/forecasts/daily`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 'BIRTH_DATA_MISSING') {
          setNeedsBirthData(true);
          setError(null);
        } else {
          throw new Error(data.error?.message || 'Failed to fetch forecast');
        }
        return;
      }

      setForecast(data.data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : t('forecast.error'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchForecast();
    }
  }, [isAuthenticated, fetchForecast]);

  // Get energy level info
  const getEnergyInfo = (energy: 'high' | 'medium' | 'low') => {
    switch (energy) {
      case 'high':
        return { color: colors.success, label: t('forecast.high'), icon: '⚡' };
      case 'low':
        return { color: colors.warning, label: t('forecast.low'), icon: '🌙' };
      default:
        return { color: colors.textSecondary, label: t('forecast.medium'), icon: '✨' };
    }
  };

  // Get influence color
  const getInfluenceColor = (influence: 'positive' | 'challenging' | 'neutral') => {
    switch (influence) {
      case 'positive':
        return colors.success;
      case 'challenging':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get localized text
  const getText = (obj: { en?: string; bg?: string } | string | undefined, bgText?: string): string => {
    if (typeof obj === 'string') return obj;
    if (!obj) return bgText || '';
    return locale === 'bg' ? (obj.bg || obj.en || '') : (obj.en || obj.bg || '');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: colors.primary }}></div>
          <p style={{ color: colors.textSecondary }}>{t('forecast.loading')}</p>
        </div>
      </div>
    );
  }

  // Show birth data prompt if needed
  if (needsBirthData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: colors.background }}>
        <div
          className="max-w-md w-full p-8 rounded-2xl text-center"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto"
              style={{ color: colors.primary }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.textPrimary }}>
            {t('forecast.noBirthData')}
          </h2>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            {t('forecast.noBirthData')}
          </p>
          <Link
            href="/birth-data/new"
            className="inline-block px-8 py-3 rounded-xl font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              color: 'white',
            }}
          >
            {t('navigation.myChart')}
          </Link>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: colors.background }}>
        <div
          className="max-w-md w-full p-8 rounded-2xl text-center"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: `${colors.error}20` }}
          >
            <svg className="w-8 h-8" style={{ color: colors.error }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.textPrimary }}>
            {t('forecast.error')}
          </h2>
          <p className="mb-6" style={{ color: colors.textSecondary }}>{error}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchForecast();
            }}
            className="px-8 py-3 rounded-xl font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              color: 'white',
            }}
          >
            {t('forecast.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const energyInfo = getEnergyInfo(forecast.energy);

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: colors.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/birth-data"
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: colors.surface, color: colors.textSecondary }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
                {t('forecast.daily')}
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {formatDate(forecast.date)}
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/forecast/weekly"
              className="px-4 py-2 rounded-lg transition-all hover:opacity-80 flex items-center gap-2"
              style={{ background: colors.surface, color: colors.textSecondary }}
              title={t('forecast.weekly')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{t('forecast.weekly')}</span>
            </Link>
            <button
              onClick={() => {
                setIsLoading(true);
                fetchForecast();
              }}
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: colors.surface, color: colors.textSecondary }}
              title={t('forecast.retry')}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Theme & Mood Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Overall Theme */}
          <div
            className="rounded-2xl p-6"
            style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }}
          >
            <div className="text-sm opacity-90 mb-2 text-white">{t('forecast.overallTheme')}</div>
            <div className="text-2xl font-bold text-white">
              {locale === 'bg' ? forecast.overallThemeBg : forecast.overallTheme}
            </div>
          </div>

          {/* Mood */}
          <div
            className="rounded-2xl p-6"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>{t('forecast.mood')}</div>
            <div className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              {locale === 'bg' ? forecast.moodBg : forecast.mood}
            </div>
          </div>

          {/* Energy */}
          <div
            className="rounded-2xl p-6"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>{t('forecast.energy')}</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{energyInfo.icon}</span>
              <span className="text-2xl font-bold" style={{ color: energyInfo.color }}>{energyInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Horoscope */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Horoscope */}
            <div
              className="rounded-2xl p-6"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">🌟</span> {t('forecast.general')}
              </h2>
              <p className="leading-relaxed" style={{ color: colors.textSecondary }}>
                {locale === 'bg' ? forecast.horoscope.generalBg : forecast.horoscope.general}
              </p>
            </div>

            {/* Life Areas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Love */}
              <div
                className="rounded-2xl p-5"
                style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
              >
                <h3 className="font-bold mb-2 flex items-center gap-2" style={{ color: colors.secondary }}>
                  <span>💕</span> {t('forecast.love')}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  {locale === 'bg' ? forecast.horoscope.loveBg : forecast.horoscope.love}
                </p>
              </div>

              {/* Career */}
              <div
                className="rounded-2xl p-5"
                style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
              >
                <h3 className="font-bold mb-2 flex items-center gap-2" style={{ color: colors.primary }}>
                  <span>💼</span> {t('forecast.career')}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  {locale === 'bg' ? forecast.horoscope.careerBg : forecast.horoscope.career}
                </p>
              </div>

              {/* Health */}
              <div
                className="rounded-2xl p-5"
                style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
              >
                <h3 className="font-bold mb-2 flex items-center gap-2" style={{ color: colors.success }}>
                  <span>🌿</span> {t('forecast.health')}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  {locale === 'bg' ? forecast.horoscope.healthBg : forecast.horoscope.health}
                </p>
              </div>
            </div>

            {/* Transits */}
            <div
              className="rounded-2xl p-6"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">🌌</span> {t('forecast.transits')}
              </h2>
              <div className="space-y-3">
                {forecast.transits.map((transit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: colors.background }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: `${colors.primary}20`, color: colors.primary }}
                    >
                      {locale === 'bg' ? transit.planetBg.substring(0, 2) : transit.planet.substring(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium" style={{ color: colors.textPrimary }}>
                          {locale === 'bg' ? transit.planetBg : transit.planet}
                        </span>
                        <span style={{ color: colors.textSecondary }}>in</span>
                        <span className="font-medium" style={{ color: colors.textPrimary }}>
                          {locale === 'bg' ? transit.signBg : transit.sign}
                        </span>
                        <span className="text-sm" style={{ color: colors.textSecondary }}>
                          {transit.degree}°
                        </span>
                      </div>
                      {transit.aspectToNatal && (
                        <div className="text-sm" style={{ color: getInfluenceColor(transit.aspectToNatal.influence) }}>
                          {locale === 'bg' ? transit.aspectToNatal.aspectBg : transit.aspectToNatal.aspect} {transit.aspectToNatal.natalPlanet}: {transit.aspectToNatal.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Moon, Lucky Numbers, Recommendations */}
          <div className="space-y-6">
            {/* Moon Phase */}
            <div
              className="rounded-2xl p-6"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">🌙</span> {t('forecast.moonPhase')}
              </h2>
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">
                  {forecast.moonPhase.phase === 'Full Moon' ? '🌕' :
                   forecast.moonPhase.phase === 'New Moon' ? '🌑' :
                   forecast.moonPhase.phase.includes('Waxing') ? '🌒' : '🌘'}
                </div>
                <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                  {locale === 'bg' ? forecast.moonPhase.phaseBg : forecast.moonPhase.phase}
                </div>
                <div className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {forecast.moonPhase.illumination}% {t('forecast.illumination').toLowerCase()}
                </div>
              </div>
              <div className="text-sm text-center" style={{ color: colors.textSecondary }}>
                {locale === 'bg' ? 'Луна в' : 'Moon in'} <span style={{ color: colors.textPrimary }}>{locale === 'bg' ? forecast.moonPhase.signBg : forecast.moonPhase.sign}</span>
              </div>
            </div>

            {/* Lucky Numbers */}
            <div
              className="rounded-2xl p-6"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">🍀</span> {t('forecast.luckyNumbers')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {forecast.horoscope.luckyNumbers.map((num, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-lg flex items-center justify-center font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}40 0%, ${colors.secondary}40 100%)`,
                      color: colors.textPrimary,
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* Power Hours */}
            <div
              className="rounded-2xl p-6"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">⏰</span> {t('forecast.powerHours')}
              </h2>
              <div className="space-y-2">
                {forecast.horoscope.powerHours.map((hours, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg text-center font-medium"
                    style={{ background: colors.background, color: colors.textPrimary }}
                  >
                    {hours}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div
              className="rounded-2xl p-6"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">💡</span> {t('forecast.recommendations')}
              </h2>
              <div className="space-y-3">
                {(locale === 'bg' ? forecast.recommendationsBg : forecast.recommendations).map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                      style={{ background: `${colors.primary}20`, color: colors.primary }}
                    >
                      {index + 1}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm" style={{ color: colors.textSecondary }}>
          <p>
            {t('forecast.lastUpdated')} {new Date(forecast.generatedAt).toLocaleString(locale === 'bg' ? 'bg-BG' : 'en-US')}
            {forecast.cached && ` (${t('forecast.cached')})`}
          </p>
        </div>
      </div>
    </div>
  );
}
