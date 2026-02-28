/**
 * Weekly Forecast Page
 * US-16: Weekly Forecast
 *
 * Displays personalized weekly astrological forecast with trend analysis
 * Route: /forecast/weekly (Bulgarian default) or /en/forecast/weekly (English)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

// Design system colors
const colors = {
  background: '#050510',
  surface: '#0A0A1F',
  primary: '#8B5CF6',
  secondary: '#EC4899',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  border: '#1E1E30',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

// Types based on backend forecast service
interface DailyBreakdown {
  date: string;
  dayName: string;
  dayNameBg: string;
  theme: string;
  themeBg: string;
  highlight: string;
  highlightBg: string;
}

interface MajorTransit {
  date: string;
  event: string;
  eventBg: string;
  significance: string;
  significanceBg: string;
}

interface BestDays {
  career: string;
  love: string;
  decisions: string;
  selfCare: string;
}

interface WeeklyForecast {
  weekStart: string;
  weekEnd: string;
  overview: string;
  overviewBg: string;
  dailyBreakdown: DailyBreakdown[];
  majorTransits: MajorTransit[];
  bestDays: BestDays;
  generatedAt: string;
}

export default function WeeklyForecastPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const locale = typeof window !== 'undefined'
    ? (localStorage.getItem('locale') || 'bg')
    : 'bg';

  const [forecast, setForecast] = useState<WeeklyForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsBirthData, setNeedsBirthData] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');

  // Calculate week start (Monday) for navigation
  const getWeekStart = (date: Date = new Date()): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch forecast data
  const fetchForecast = useCallback(async (weekStart?: string) => {
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/forecasts/weekly`;

      if (weekStart) {
        url += `?weekStart=${weekStart}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
      setCurrentWeekStart(data.data.weekStart);
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

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const current = currentWeekStart ? new Date(currentWeekStart) : new Date();
    current.setDate(current.getDate() - 7);
    const newWeekStart = getWeekStart(current);
    setIsLoading(true);
    fetchForecast(newWeekStart);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const current = currentWeekStart ? new Date(currentWeekStart) : new Date();
    current.setDate(current.getDate() + 7);
    const newWeekStart = getWeekStart(current);
    setIsLoading(true);
    fetchForecast(newWeekStart);
  };

  // Navigate to current week
  const goToCurrentWeek = () => {
    const weekStart = getWeekStart(new Date());
    setIsLoading(true);
    fetchForecast(weekStart);
  };

  // Format date range
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startStr = startDate.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
      day: 'numeric',
      month: 'long'
    });
    const endStr = endDate.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `${startStr} - ${endStr}`;
  };

  // Get day name
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });
  };

  // Check if week is current
  const isCurrentWeek = () => {
    const thisWeekStart = getWeekStart(new Date());
    return thisWeekStart === forecast?.weekStart;
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
              fetchForecast(currentWeekStart);
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

  // Generate all 7 days of the week
  const weekDays: DailyBreakdown[] = [];
  const startDate = new Date(forecast.weekStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Check if we have data for this day
    const existingDay = forecast.dailyBreakdown.find(d => d.date === dateStr);

    if (existingDay) {
      weekDays.push(existingDay);
    } else {
      // Generate placeholder for missing days
      weekDays.push({
        date: dateStr,
        dayName: getDayName(dateStr),
        dayNameBg: getDayName(dateStr),
        theme: 'Balance',
        themeBg: 'Баланс',
        highlight: 'Coming soon',
        highlightBg: 'Очаквайте скоро',
      });
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: colors.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/forecast"
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: colors.surface, color: colors.textSecondary }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
                {t('forecast.weekly')}
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {formatDateRange(forecast.weekStart, forecast.weekEnd)}
              </p>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: colors.surface, color: colors.textSecondary }}
              title={locale === 'bg' ? 'Предишна седмица' : 'Previous week'}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {!isCurrentWeek() && (
              <button
                onClick={goToCurrentWeek}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ background: colors.surface, color: colors.primary }}
              >
                {t('forecast.thisWeek')}
              </button>
            )}

            <button
              onClick={goToNextWeek}
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: colors.surface, color: colors.textSecondary }}
              title={locale === 'bg' ? 'Следваща седмица' : 'Next week'}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Weekly Overview */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 100%)`,
            border: `1px solid ${colors.primary}40`
          }}
        >
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: colors.textPrimary }}>
            <span className="text-2xl">🔮</span> {locale === 'bg' ? 'Общ преглед на седмицата' : 'Weekly Overview'}
          </h2>
          <p className="leading-relaxed text-lg" style={{ color: colors.textSecondary }}>
            {locale === 'bg' ? forecast.overviewBg : forecast.overview}
          </p>
        </div>

        {/* Best Days */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>🏢 {t('forecast.career')}</div>
            <div className="font-bold" style={{ color: colors.primary }}>
              {forecast.bestDays?.career
                ? new Date(forecast.bestDays.career).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'short', day: 'numeric' })
                : '-'}
            </div>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>💕 {t('forecast.love')}</div>
            <div className="font-bold" style={{ color: colors.secondary }}>
              {forecast.bestDays?.love
                ? new Date(forecast.bestDays.love).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'short', day: 'numeric' })
                : '-'}
            </div>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>⚖️ {locale === 'bg' ? 'Решения' : 'Decisions'}</div>
            <div className="font-bold" style={{ color: colors.warning }}>
              {forecast.bestDays?.decisions
                ? new Date(forecast.bestDays.decisions).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'short', day: 'numeric' })
                : '-'}
            </div>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>🧘 {locale === 'bg' ? 'Грижа за себе си' : 'Self Care'}</div>
            <div className="font-bold" style={{ color: colors.success }}>
              {forecast.bestDays?.selfCare
                ? new Date(forecast.bestDays.selfCare).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'short', day: 'numeric' })
                : '-'}
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
            <span className="text-2xl">📅</span> {locale === 'bg' ? 'Дневен разбор' : 'Daily Breakdown'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const isToday = day.date === todayStr;

              return (
                <div
                  key={index}
                  className={`rounded-xl p-4 transition-all ${isToday ? 'ring-2 ring-purple-500' : ''}`}
                  style={{
                    background: isToday
                      ? `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}30 100%)`
                      : colors.surface,
                    border: `1px solid ${isToday ? colors.primary : colors.border}`
                  }}
                >
                  {/* Day Header */}
                  <div className="text-center mb-3">
                    <div
                      className="text-xs font-medium uppercase tracking-wide mb-1"
                      style={{ color: colors.textSecondary }}
                    >
                      {locale === 'bg' ? day.dayNameBg : day.dayName}
                    </div>
                    <div
                      className="text-2xl font-bold"
                      style={{ color: isToday ? colors.primary : colors.textPrimary }}
                    >
                      {new Date(day.date).getDate()}
                    </div>
                    {isToday && (
                      <div
                        className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
                        style={{ background: colors.primary, color: 'white' }}
                      >
                        {t('forecast.today')}
                      </div>
                    )}
                  </div>

                  {/* Theme */}
                  <div className="mb-3">
                    <div
                      className="text-xs mb-1"
                      style={{ color: colors.textSecondary }}
                    >
                      {locale === 'bg' ? 'Тема' : 'Theme'}
                    </div>
                    <div
                      className="font-medium text-sm"
                      style={{ color: colors.textPrimary }}
                    >
                      {locale === 'bg' ? day.themeBg : day.theme}
                    </div>
                  </div>

                  {/* Highlight */}
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: colors.textSecondary }}
                    >
                      {locale === 'bg' ? 'Акцент' : 'Highlight'}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: colors.primary }}
                    >
                      {locale === 'bg' ? day.highlightBg : day.highlight}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Major Transits */}
        {forecast.majorTransits && forecast.majorTransits.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
              <span className="text-2xl">🌌</span> {locale === 'bg' ? 'Важни астрологични събития' : 'Major Astrological Events'}
            </h2>

            <div className="space-y-3">
              {forecast.majorTransits.map((transit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background: colors.background }}
                >
                  <div
                    className="w-24 shrink-0 text-sm font-medium"
                    style={{ color: colors.primary }}
                  >
                    {new Date(transit.date).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                  <div className="flex-1">
                    <div
                      className="font-medium mb-1"
                      style={{ color: colors.textPrimary }}
                    >
                      {locale === 'bg' ? transit.eventBg : transit.event}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: colors.textSecondary }}
                    >
                      {locale === 'bg' ? transit.significanceBg : transit.significance}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm" style={{ color: colors.textSecondary }}>
          <p>
            {t('forecast.lastUpdated')} {new Date(forecast.generatedAt).toLocaleString(locale === 'bg' ? 'bg-BG' : 'en-US')}
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link
              href="/forecast"
              className="hover:underline"
              style={{ color: colors.primary }}
            >
              {t('forecast.daily')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
