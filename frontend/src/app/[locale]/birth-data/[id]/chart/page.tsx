/**
 * Natal Chart Page
 * US-12: View Natal Chart
 * US-13: Understand Chart Components
 * US-14: Explore Chart Aspects
 * US-30: View Birth Time Sensitivity
 *
 * Route: /birth-data/[id]/chart (Bulgarian) or /en/birth-data/[id]/chart (English)
 *
 * Displays the natal chart with:
 * - Interactive circular chart wheel
 * - Planetary positions with tooltips
 * - Detailed interpretations (basic → intermediate → advanced)
 * - Elements & Modalities
 * - Aspect exploration with color-coding and interpretations
 * - Birth time sensitivity analysis
 * - Download as PNG/PDF
 * - Shareable link (optional)
 * - Ask AI about placements
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatTime } from '@/lib/format';
import ChartLoading from '@/components/chart/chart-loading';
import ChartVisualization, { NatalChart } from '@/components/chart/chart-visualization';
import CircularChartWheel from '@/components/chart/circular-chart-wheel';
import ChartDownload from '@/components/chart/chart-download';
import ProfessionalPDFExport from '@/components/chart/professional-pdf-export';
import ChartShare from '@/components/chart/chart-share';
import ChartInterpretation from '@/components/chart/chart-interpretation';
import AspectExplorer from '@/components/chart/aspect-explorer';
import TimeSensitivity from '@/components/chart/time-sensitivity';

// Design system colors (US-12 spec from 06-ux-ui-design.md)
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
};

interface BirthProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isUnknownTime: boolean;
}

type ViewMode = 'wheel' | 'details' | 'aspects' | 'interpretation' | 'sensitivity';

export default function NatalChartPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { id } = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [chartId, setChartId] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('wheel');
  const [showAspects, setShowAspects] = useState(true);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch profile and chart
  const fetchData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('astrologaai_access_token');

      // Fetch profile
      const profileResponse = await fetch(
        `${API_URL}/api/v1/birth-data/${id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!profileResponse.ok) {
        if (profileResponse.status === 404) {
          router.push('/birth-data');
          return;
        }
        throw new Error(t('errors.notFound'));
      }

      const profileData = await profileResponse.json();
      setProfile(profileData.data.profile);

      // Try to fetch existing chart
      const chartResponse = await fetch(
        `${API_URL}/api/v1/birth-chart/${id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        setChart(chartData.data.chart);
        setChartId(chartData.data.chartId);
        setIsCached(true);
      } else if (chartResponse.status === 404) {
        // No chart exists, need to generate
        setIsCached(false);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  }, [id, router, API_URL, t]);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchData();
    }
  }, [isAuthenticated, id, fetchData]);

  // Generate chart
  const generateChart = async () => {
    if (!id) return;

    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('astrologaai_access_token');

      const response = await fetch(
        `${API_URL}/api/v1/birth-chart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ birthProfileId: id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || t('errors.generic'));
      }

      setChart(data.data.chart);
      setChartId(data.data.chartId);
      setIsCached(data.data.cached);
    } catch (err) {
      console.error('Generate error:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Recalculate chart
  const recalculateChart = async () => {
    if (!id) return;

    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('astrologaai_access_token');

      const response = await fetch(
        `${API_URL}/api/v1/birth-chart/recalculate/${id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || t('errors.generic'));
      }

      setChart(data.data.chart);
      setChartId(data.data.chartId);
      setIsCached(false);
    } catch (err) {
      console.error('Recalculate error:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDateLong = (date: string) =>
    formatDate(date, 'long', locale === 'bg' ? 'bg-BG' : undefined);

  const formatBirthTime = (time: string | null, isUnknown: boolean) => {
    if (isUnknown || !time) return locale === 'bg' ? 'Неизвестно' : 'Unknown';
    return formatTime(time);
  };

  // Handle planet click from wheel
  const handlePlanetClick = (planet: any) => {
    console.log('Planet clicked:', planet);
    // Could open a modal or scroll to planet details
  };

  // Handle "Ask AI" - navigate to chat with pre-filled question
  const handleAskAI = (question: string) => {
    // Navigate to chat page with the question
    router.push(`/chat?profileId=${id}&q=${encodeURIComponent(question)}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
          <p className="mt-4" style={{ color: colors.textSecondary }}>
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: colors.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/birth-data"
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{ background: colors.surface, color: colors.textSecondary }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                {profile?.name
                  ? `${profile.name} - ${t('chart.title')}`
                  : t('chart.title')}
              </h1>
              {profile && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {formatDateLong(profile.birthDate)} • {formatBirthTime(profile.birthTime, profile.isUnknownTime)} • {profile.locationName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: `${colors.error}15`, borderLeft: `3px solid ${colors.error}` }}
          >
            <p style={{ color: colors.error }}>{error}</p>
          </div>
        )}

        {/* Cached indicator */}
        {isCached && chart && chart.calculatedAt && (
          <div
            className="mb-6 p-4 rounded-xl flex items-center justify-between"
            style={{ background: `${colors.success}15`, borderLeft: `3px solid ${colors.success}` }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" style={{ color: colors.success }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ color: colors.success }}>
                {t('forecast.cached')} • {t('forecast.lastUpdated')} {formatDate(chart.calculatedAt)}
              </span>
            </div>
            <button
              onClick={recalculateChart}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{ background: `${colors.success}20`, color: colors.success }}
            >
              {locale === 'bg' ? 'Преизчисли' : 'Recalculate'}
            </button>
          </div>
        )}

        {/* Content */}
        {isGenerating ? (
          <ChartLoading />
        ) : chart ? (
          <div className="space-y-6">
            {/* View mode tabs */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('interpretation')}
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  background: viewMode === 'interpretation' ? colors.primary : colors.surface,
                  color: viewMode === 'interpretation' ? 'white' : colors.textSecondary,
                  border: `1px solid ${viewMode === 'interpretation' ? colors.primary : colors.border}`,
                }}
              >
                📖 {t('chart.viewMode.interpretation')}
              </button>
              <button
                onClick={() => setViewMode('wheel')}
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  background: viewMode === 'wheel' ? colors.primary : colors.surface,
                  color: viewMode === 'wheel' ? 'white' : colors.textSecondary,
                  border: `1px solid ${viewMode === 'wheel' ? colors.primary : colors.border}`,
                }}
              >
                {t('chart.viewMode.wheel')}
              </button>
              <button
                onClick={() => setViewMode('details')}
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  background: viewMode === 'details' ? colors.primary : colors.surface,
                  color: viewMode === 'details' ? 'white' : colors.textSecondary,
                  border: `1px solid ${viewMode === 'details' ? colors.primary : colors.border}`,
                }}
              >
                {t('chart.viewMode.details')}
              </button>
              <button
                onClick={() => setViewMode('aspects')}
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  background: viewMode === 'aspects' ? colors.primary : colors.surface,
                  color: viewMode === 'aspects' ? 'white' : colors.textSecondary,
                  border: `1px solid ${viewMode === 'aspects' ? colors.primary : colors.border}`,
                }}
              >
                {t('chart.viewMode.aspects')}
              </button>
              <button
                onClick={() => setViewMode('sensitivity')}
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  background: viewMode === 'sensitivity' ? colors.primary : colors.surface,
                  color: viewMode === 'sensitivity' ? 'white' : colors.textSecondary,
                  border: `1px solid ${viewMode === 'sensitivity' ? colors.primary : colors.border}`,
                }}
              >
                ⏱️ {t('chart.viewMode.sensitivity')}
              </button>
            </div>

            {/* Chart content area */}
            <div ref={chartContainerRef} className="space-y-6">
              {viewMode === 'interpretation' && (
                <ChartInterpretation
                  chart={chart}
                  profileId={id as string}
                  language={locale as 'en' | 'bg'}
                  onAskAI={handleAskAI}
                />
              )}

              {viewMode === 'wheel' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Circular chart wheel */}
                  <div
                    className="lg:col-span-2 rounded-2xl p-6 flex flex-col items-center"
                    style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                        {t('chart.title')}
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showAspects}
                          onChange={(e) => setShowAspects(e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm" style={{ color: colors.textSecondary }}>
                          {locale === 'bg' ? 'Покажи аспекти' : 'Show aspects'}
                        </span>
                      </label>
                    </div>
                    <CircularChartWheel
                      chart={chart}
                      size={500}
                      language={locale as 'en' | 'bg'}
                      showAspects={showAspects}
                      onPlanetClick={handlePlanetClick}
                    />
                  </div>

                  {/* Right sidebar - Download & Share */}
                  <div className="space-y-4">
                    {/* Professional PDF Export - US-17 */}
                    <div
                      className="rounded-2xl p-6"
                      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                    >
                      <ProfessionalPDFExport
                        profileId={id as string}
                        profileName={profile?.name}
                        language={locale as 'en' | 'bg'}
                        hasChart={!!chart}
                      />
                    </div>

                    {/* Quick Download section (client-side PNG/simple PDF) */}
                    <div
                      className="rounded-2xl p-6"
                      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                    >
                      <h3
                        className="text-lg font-semibold mb-4 flex items-center gap-2"
                        style={{ color: colors.textPrimary }}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2" />
                        </svg>
                        {locale === 'bg' ? 'Бързо изтегляне' : 'Quick Download'}
                      </h3>
                      <ChartDownload
                        chartRef={chartContainerRef}
                        profileName={profile?.name}
                        language={locale as 'en' | 'bg'}
                        chartId={chartId || undefined}
                      />
                    </div>

                    {/* Share section */}
                    {chartId && (
                      <ChartShare
                        chartId={chartId}
                        profileId={id as string}
                        profileName={profile?.name}
                        language={locale as 'en' | 'bg'}
                      />
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'details' && (
                <ChartVisualization chart={chart} language={locale as 'en' | 'bg'} />
              )}

              {viewMode === 'aspects' && (
                <AspectExplorer chart={chart} language={locale as 'en' | 'bg'} />
              )}

              {viewMode === 'sensitivity' && (
                <TimeSensitivity
                  profileId={id as string}
                  language={locale as 'en' | 'bg'}
                  onAskAI={handleAskAI}
                />
              )}
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
              style={{ background: `${colors.primary}20` }}
            >
              <svg className="w-10 h-10" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textPrimary }}>
              {t('chart.chartReady')}
            </h3>
            <p className="mb-6" style={{ color: colors.textSecondary }}>
              {locale === 'bg'
                ? 'Вашата натална карта разкрива позициите на планетите в точния момент на вашето раждане. Този космически план предоставя прозрения за вашата личност, силни страни и житейски път.'
                : "Your natal chart reveals the positions of the planets at the exact moment of your birth. This cosmic blueprint provides insights into your personality, strengths, and life path."}
            </p>
            <button
              onClick={generateChart}
              className="px-8 py-3 rounded-xl font-medium transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                color: 'white',
              }}
            >
              {locale === 'bg' ? 'Генерирай натална карта' : 'Generate Natal Chart'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
