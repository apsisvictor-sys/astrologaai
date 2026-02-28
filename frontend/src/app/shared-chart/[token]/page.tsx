/**
 * Shared Chart Page
 * US-12: View Natal Chart
 * 
 * Public page for viewing shared natal charts
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CircularChartWheel from '@/components/chart/circular-chart-wheel';
import ChartVisualization, { NatalChart } from '@/components/chart/chart-visualization';

// Design system colors (US-12 spec)
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

type ViewMode = 'wheel' | 'details';

export default function SharedChartPage() {
  const { token } = useParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('wheel');
  const [language, setLanguage] = useState<'en' | 'bg'>('bg');
  const [showAspects, setShowAspects] = useState(true);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch shared chart
  useEffect(() => {
    if (!token) return;
    
    const fetchSharedChart = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${API_URL}/api/v1/birth-chart/shared/${token}`
        );
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to load shared chart');
        }
        
        setChart(data.data.chart);
        setProfileName(data.data.profileName);
      } catch (err) {
        console.error('Fetch shared chart error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSharedChart();
  }, [token, API_URL]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
          <p className="mt-4" style={{ color: colors.textSecondary }}>
            {language === 'bg' ? 'Зареждане на споделена карта...' : 'Loading shared chart...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: colors.background }}>
        <div
          className="max-w-md w-full p-8 rounded-2xl text-center"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: `${colors.error}20` }}
          >
            <svg className="w-8 h-8" style={{ color: colors.error }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: colors.textPrimary }}>
            {language === 'bg' ? 'Връзката е изтекла' : 'Link Expired'}
          </h2>
          <p style={{ color: colors.textSecondary }}>
            {error}
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-2 rounded-xl"
            style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, color: 'white' }}
          >
            {language === 'bg' ? 'Към началната страница' : 'Go to Home'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: colors.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              {profileName 
                ? (language === 'bg' ? `${profileName} - Натална карта` : `${profileName}'s Natal Chart`)
                : (language === 'bg' ? 'Споделена натална карта' : 'Shared Natal Chart')}
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {language === 'bg' ? 'Споделено от AstroLogAI' : 'Shared via AstroLogAI'}
            </p>
          </div>
          
          {/* Language toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage('bg')}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                background: language === 'bg' ? colors.primary : 'transparent',
                color: language === 'bg' ? 'white' : colors.textSecondary,
              }}
            >
              🇧🇬 BG
            </button>
            <button
              onClick={() => setLanguage('en')}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                background: language === 'en' ? colors.primary : 'transparent',
                color: language === 'en' ? 'white' : colors.textSecondary,
              }}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode('wheel')}
            className="px-4 py-2 rounded-xl transition-all"
            style={{
              background: viewMode === 'wheel' ? colors.primary : colors.surface,
              color: viewMode === 'wheel' ? 'white' : colors.textSecondary,
              border: `1px solid ${viewMode === 'wheel' ? colors.primary : colors.border}`,
            }}
          >
            {language === 'bg' ? 'Колело' : 'Wheel'}
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
            {language === 'bg' ? 'Детайли' : 'Details'}
          </button>
        </div>

        {/* Chart content */}
        {chart && (
          <>
            {viewMode === 'wheel' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Circular chart wheel */}
                <div
                  className="lg:col-span-2 rounded-2xl p-6 flex flex-col items-center"
                  style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                >
                  <div className="flex items-center justify-between w-full mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                      {language === 'bg' ? 'Натална карта' : 'Natal Chart Wheel'}
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAspects}
                        onChange={(e) => setShowAspects(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm" style={{ color: colors.textSecondary }}>
                        {language === 'bg' ? 'Покажи аспекти' : 'Show aspects'}
                      </span>
                    </label>
                  </div>
                  <CircularChartWheel
                    chart={chart}
                    size={500}
                    language={language}
                    showAspects={showAspects}
                  />
                </div>

                {/* Sidebar - CTA */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                      {language === 'bg' ? 'Създайте своя карта' : 'Create Your Own Chart'}
                    </h3>
                    <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
                      {language === 'bg'
                        ? 'AstroLogAI е вашият личен AI астролог. Разговаряйте с AI, научете повече за себе си и получавайте персонализирани прогнози.'
                        : 'AstroLogAI is your personal AI astrologer. Chat with AI, learn about yourself, and get personalized forecasts.'}
                    </p>
                    <a
                      href="/register"
                      className="inline-block w-full px-6 py-3 rounded-xl font-medium"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                        color: 'white',
                      }}
                    >
                      {language === 'bg' ? 'Регистрирайте се безплатно' : 'Sign Up Free'}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'details' && (
              <ChartVisualization chart={chart} language={language} />
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {language === 'bg' ? 'Създадено с' : 'Created with'} ❤️ {language === 'bg' ? 'от' : 'by'}{' '}
            <a href="/" className="font-medium" style={{ color: colors.primary }}>
              AstroLogAI
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
