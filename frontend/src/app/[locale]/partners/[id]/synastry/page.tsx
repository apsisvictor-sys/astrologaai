/**
 * Synastry Chart Page
 * US-19: Synastry Chart Generation
 * 
 * Route: /partners/[id]/synastry (Bulgarian default) or /en/partners/[id]/synastry (English)
 * 
 * Displays the synastry (relationship compatibility) chart between
 * the user and their partner with:
 * - Dual-wheel chart visualization
 * - Compatibility score
 * - Relationship strengths and challenges
 * - Inter-planetary aspect interpretations
 * - Download as PNG/PDF functionality
 * 
 * Design: Follows 06-ux-ui-design.md specifications
 * - Background: #0A0A0F (Cosmic Black)
 * - Surface: #0A0A1F (Nebula Dark)
 * - Border: #252532 (Nebula Light)
 * - Primary: #7C3AED
 * - Secondary: #EC4899
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import SynastryChartWheel, { InterPlanetaryAspect } from '@/components/chart/synastry-chart-wheel';
import { 
  partnersApi, 
  Partner, 
  SynastryChart, 
  PartnersAPIError 
} from '@/lib/partners-api';
import { useAuth } from '@/lib/auth-context';

// Planet symbols
const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '⛢',
  neptune: '♆',
  pluto: '♇',
  northNode: '☊',
  southNode: '☋',
  chiron: '⚷',
};

// Design system colors
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  harmonious1: '#22D3EE',
  harmonious2: '#10B981',
  challenging1: '#F97316',
  challenging2: '#EF4444',
};

export default function SynastryPage() {
  const t = useTranslations('partners.synastry');
  const tCommon = useTranslations('common');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  const language = (user?.language as 'bg' | 'en') || 'bg';

  const chartRef = useRef<HTMLDivElement>(null);

  // State
  const [partner, setPartner] = useState<Partner | null>(null);
  const [synastry, setSynastry] = useState<SynastryChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<InterPlanetaryAspect | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch synastry data
  useEffect(() => {
    if (isAuthenticated && partnerId) {
      fetchSynastry();
    }
  }, [isAuthenticated, partnerId]);

  const fetchSynastry = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [partnerData, synastryData] = await Promise.all([
        partnersApi.get(partnerId),
        partnersApi.getSynastry(partnerId, language),
      ]);

      setPartner(partnerData);
      setSynastry(synastryData.synastry);
    } catch (err) {
      if (err instanceof PartnersAPIError) {
        setError(err.message);
      } else {
        setError(t('error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAspectClick = (aspect: InterPlanetaryAspect) => {
    setSelectedAspect(aspect);
  };

  const handleDownloadPNG = async () => {
    if (!chartRef.current || !synastry) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1200;
      canvas.height = 800;
      
      // Draw background
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw title
      ctx.fillStyle = colors.textPrimary;
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${t('title')}: ${user?.fullName || 'You'} & ${partner?.name}`,
        canvas.width / 2,
        40
      );

      // Draw compatibility score
      ctx.font = '48px Inter, sans-serif';
      ctx.fillStyle = synastry.compatibilityScore >= 60 ? colors.harmonious1 : colors.challenging1;
      ctx.fillText(`${synastry.compatibilityScore}%`, canvas.width / 2, 120);

      // Add note about chart
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = colors.textSecondary;
      ctx.fillText(
        `${t('compatibility')}: ${synastry.compatibilityScore}%`,
        canvas.width / 2,
        160
      );

      // Download
      const link = document.createElement('a');
      link.download = `synastry-${partner?.name || 'chart'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDownloadPDF = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !synastry) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Synastry Chart - ${partner?.name}</title>
          <style>
            body { 
              font-family: Inter, sans-serif; 
              background: #0A0A0F; 
              color: #FAFAFA;
              padding: 40px;
            }
            h1 { 
              background: linear-gradient(135deg, #7C3AED, #EC4899);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .score { 
              font-size: 48px; 
              color: ${synastry.compatibilityScore >= 60 ? '#22D3EE' : '#F97316'};
            }
            .section { margin: 20px 0; padding: 20px; background: #0A0A1F; border-radius: 16px; }
            .aspect { display: flex; gap: 10px; margin: 10px 0; padding: 10px; background: #050510; border-radius: 8px; }
            .harmonious { color: #22D3EE; }
            .challenging { color: #F97316; }
          </style>
        </head>
        <body>
          <h1>${t('title')}: ${user?.fullName || 'You'} & ${partner?.name}</h1>
          <div class="section">
            <p>${t('compatibility')}</p>
            <div class="score">${synastry.compatibilityScore}%</div>
            <p>${language === 'bg' ? synastry.summary.bg : synastry.summary.en}</p>
          </div>
          <div class="section">
            <h2>${t('aspects')}</h2>
            ${synastry.interAspects.slice(0, 20).map(aspect => `
              <div class="aspect ${aspect.nature}">
                <span>${PLANET_SYMBOLS[aspect.userPlanet]} ${aspect.userPlanet}</span>
                <span>—</span>
                <span>${PLANET_SYMBOLS[aspect.partnerPlanet]} ${aspect.partnerPlanet}</span>
                <span>${language === 'bg' ? aspect.aspectBg : aspect.aspect}</span>
                <span>(${aspect.orb.toFixed(1)}°)</span>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: colors.background }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ 
              borderColor: 'rgba(124, 58, 237, 0.3)',
              borderTopColor: colors.primary,
            }}
          />
          <p style={{ color: colors.textSecondary }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !synastry) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: colors.background }}
      >
        <div 
          className="text-center p-8 rounded-2xl max-w-md"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            {t('error')}
          </h2>
          <p className="mb-4" style={{ color: colors.textSecondary }}>
            {error || 'Unable to load synastry chart'}
          </p>
          <button
            onClick={() => router.push('/partners')}
            className="px-6 py-2 rounded-xl"
            style={{ background: colors.primary, color: colors.textPrimary }}
          >
            {t('backToPartners')}
          </button>
        </div>
      </div>
    );
  }

  // Count aspects by nature
  const harmoniousCount = synastry.interAspects.filter(a => a.nature === 'harmonious').length;
  const challengingCount = synastry.interAspects.filter(a => a.nature === 'challenging').length;

  return (
    <div 
      className="min-h-screen"
      style={{ background: colors.background }}
    >
      <Navigation currentPath="/partners" />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/partners')}
            className="inline-block mb-4 text-sm hover:underline"
            style={{ color: colors.primary }}
          >
            ← {t('backToPartners')}
          </button>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 
                className="text-3xl font-bold mb-2"
                style={{ 
                  background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('title')}: {partner?.name}
              </h1>
              <p style={{ color: colors.textSecondary }}>
                {t('subtitle')}
              </p>
            </div>

            {/* Download buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPNG}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: `${colors.primary}20`,
                  color: colors.primary,
                  border: `1px solid ${colors.primary}40`,
                }}
              >
                📷 {t('downloadPNG')}
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: `${colors.secondary}20`,
                  color: colors.secondary,
                  border: `1px solid ${colors.secondary}40`,
                }}
              >
                📄 {t('downloadPDF')}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart Visualization */}
          <div 
            ref={chartRef}
            className="flex flex-col items-center p-6 rounded-2xl"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <SynastryChartWheel
              userChart={synastry.userChart}
              partnerChart={synastry.partnerChart}
              interAspects={synastry.interAspects}
              userName={user?.fullName || 'You'}
              partnerName={partner?.name || 'Partner'}
              size={500}
              language={language}
              onAspectClick={handleAspectClick}
            />

            {/* Compatibility Score */}
            <div className="mt-6 text-center">
              <div 
                className="text-5xl font-bold mb-2"
                style={{ 
                  color: synastry.compatibilityScore >= 60 
                    ? colors.harmonious1 
                    : colors.challenging1,
                }}
              >
                {synastry.compatibilityScore}%
              </div>
              <div style={{ color: colors.textSecondary }}>
                {harmoniousCount} {t('harmoniousAspects')} • {challengingCount} {t('challengingAspects')}
              </div>
            </div>
          </div>

          {/* Right Column: Summary, Strengths, Challenges */}
          <div className="space-y-6">
            {/* Summary */}
            <div 
              className="p-6 rounded-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                border: `1px solid ${colors.border}`,
              }}
            >
              <p style={{ color: colors.textPrimary, lineHeight: 1.7 }}>
                {language === 'bg' ? synastry.summary.bg : synastry.summary.en}
              </p>
            </div>

            {/* Strengths */}
            <div 
              className="p-6 rounded-2xl"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h3 
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: colors.harmonious1 }}
              >
                ✨ {t('strengthsTitle')}
              </h3>
              {synastry.strengths.length > 0 ? (
                <div className="space-y-3">
                  {synastry.strengths.map((strength, index) => (
                    <div 
                      key={index}
                      className="p-3 rounded-xl"
                      style={{ background: 'rgba(34, 211, 238, 0.08)' }}
                    >
                      <div className="font-medium mb-1" style={{ color: colors.textPrimary }}>
                        {language === 'bg' ? strength.title.bg : strength.title.en}
                      </div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {language === 'bg' ? strength.description.bg : strength.description.en}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: colors.textSecondary }}>{t('noStrengths')}</p>
              )}
            </div>

            {/* Challenges */}
            <div 
              className="p-6 rounded-2xl"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <h3 
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: colors.challenging1 }}
              >
                🔥 {t('challengesTitle')}
              </h3>
              {synastry.challenges.length > 0 ? (
                <div className="space-y-3">
                  {synastry.challenges.map((challenge, index) => (
                    <div 
                      key={index}
                      className="p-3 rounded-xl"
                      style={{ background: 'rgba(249, 115, 22, 0.08)' }}
                    >
                      <div className="font-medium mb-1" style={{ color: colors.textPrimary }}>
                        {language === 'bg' ? challenge.title.bg : challenge.title.en}
                      </div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {language === 'bg' ? challenge.description.bg : challenge.description.en}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: colors.textSecondary }}>{t('noChallenges')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Aspects Section */}
        <div 
          className="mt-8 p-6 rounded-2xl"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <h3 
            className="text-lg font-semibold mb-4"
            style={{ color: colors.textPrimary }}
          >
            {t('aspects')} ({synastry.interAspects.length})
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            {t('clickAspect')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {synastry.interAspects.slice(0, 24).map((aspect, index) => {
              const isSelected = selectedAspect === aspect;
              const color = aspect.nature === 'harmonious' 
                ? colors.harmonious1 
                : aspect.nature === 'challenging' 
                  ? colors.challenging1 
                  : colors.primary;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedAspect(isSelected ? null : aspect)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: isSelected ? `${color}15` : colors.background,
                    border: `1px solid ${isSelected ? color : colors.border}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{ color: colors.textPrimary }}>
                        {PLANET_SYMBOLS[aspect.userPlanet]}
                      </span>
                      <span style={{ color: colors.textSecondary }}>—</span>
                      <span style={{ color: colors.textPrimary }}>
                        {PLANET_SYMBOLS[aspect.partnerPlanet]}
                      </span>
                    </div>
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: `${color}20`, color }}
                    >
                      {language === 'bg' ? aspect.aspectBg : aspect.aspect}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {t('orb')}: {aspect.orb.toFixed(1)}°
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Aspect Interpretation */}
          {selectedAspect && (
            <div 
              className="mt-4 p-4 rounded-xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                border: `1px solid ${colors.border}`,
              }}
            >
              <h4 className="font-semibold mb-2" style={{ color: colors.textPrimary }}>
                {PLANET_SYMBOLS[selectedAspect.userPlanet]} {selectedAspect.userPlanet} — {PLANET_SYMBOLS[selectedAspect.partnerPlanet]} {selectedAspect.partnerPlanet}
              </h4>
              <p style={{ color: colors.textSecondary }}>
                {language === 'bg' ? selectedAspect.interpretation.bg : selectedAspect.interpretation.en}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
