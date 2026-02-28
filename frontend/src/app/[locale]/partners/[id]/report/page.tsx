/**
 * Compatibility Report Page
 * US-20: Detailed compatibility analysis report
 * 
 * Route: /partners/[id]/report (Bulgarian default) or /en/partners/[id]/report (English)
 * 
 * Features:
 * - Overall compatibility score with visual gauge
 * - Category breakdown (emotional, communication, physical, long-term)
 * - Key planetary aspects
 * - Strengths, challenges, and advice sections
 * 
 * Design: Follows 06-ux-ui-design.md specifications
 * - Background: #050510 (Cosmic Black)
 * - Surface: #0A0A1F (Nebula Dark)
 * - Border: #1A1A3A (Nebula Light)
 * - Primary CTA Gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { partnersApi, PartnersAPIError, CompatibilityReport } from '@/lib/partners-api';
import { useAuth } from '@/lib/auth-context';

// Score gauge component
function ScoreGauge({ score, size = 200 }: { score: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  // Color based on score
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10B981'; // Green
    if (score >= 50) return '#F59E0B'; // Yellow/Orange
    return '#EF4444'; // Red
  };
  
  const color = getScoreColor(score);
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A1A3A"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Score text */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span 
          className="text-5xl font-bold"
          style={{ color }}
        >
          {score}%
        </span>
      </div>
    </div>
  );
}

// Category card component
function CategoryCard({ 
  score, 
  label,
  analysis 
}: { 
  score: number;
  label: string;
  analysis: string;
}) {
  // Color based on score
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };
  
  const color = getScoreColor(score);
  
  return (
    <div 
      className="p-5 rounded-xl"
      style={{ 
        background: '#0A0A1F',
        border: '1px solid #1A1A3A',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 style={{ color: '#FAFAFA', fontWeight: 600 }}>{label}</h4>
        <div 
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{ background: `${color}20`, color }}
        >
          {score}%
        </div>
      </div>
      
      {/* Progress bar */}
      <div 
        className="h-2 rounded-full mb-3"
        style={{ background: '#1A1A3A' }}
      >
        <div 
          className="h-full rounded-full transition-all duration-700"
          style={{ 
            width: `${score}%`, 
            background: color,
          }}
        />
      </div>
      
      <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
        {analysis}
      </p>
    </div>
  );
}

// Key aspect item component
function KeyAspectItem({ aspect }: { aspect: CompatibilityReport['keyAspects'][0] }) {
  const natureColors = {
    harmonious: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    challenging: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
    neutral: { bg: 'rgba(251, 191, 36, 0.1)', text: '#FBBF24' },
  };
  
  const colors = natureColors[aspect.nature];
  
  return (
    <div 
      className="p-4 rounded-xl"
      style={{ background: '#0A0A1F', border: '1px solid #1A1A3A' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span 
          className="px-2 py-1 rounded-lg text-xs font-medium"
          style={{ background: colors.bg, color: colors.text }}
        >
          {aspect.aspect}
        </span>
        <span style={{ color: '#FAFAFA', fontWeight: 500 }}>
          {aspect.userPlanet} ↔ {aspect.partnerPlanet}
        </span>
      </div>
      <p className="text-sm" style={{ color: '#CBD5E1' }}>
        {aspect.description}
      </p>
    </div>
  );
}

// Strength/Challenge item
function ListItem({ icon, text, type }: { icon: string; text: string; type: 'strength' | 'challenge' }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl">{icon}</span>
      <p className="flex-1" style={{ color: '#CBD5E1' }}>{text}</p>
    </div>
  );
}

export default function CompatibilityReportPage() {
  const t = useTranslations('partners.report');
  const tPartners = useTranslations('partners');
  const tCommon = useTranslations('common');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  const language = (user?.language as 'bg' | 'en') || 'bg';

  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch report
  useEffect(() => {
    if (isAuthenticated && partnerId) {
      fetchReport();
    }
  }, [isAuthenticated, partnerId, language]);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await partnersApi.getCompatibilityReport(partnerId, language);
      setReport(data.report);
      setPartnerName(data.partner.name);
      setCached(data.cached);
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

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#050510' }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ 
              borderColor: 'rgba(124, 58, 237, 0.3)',
              borderTopColor: '#8B5CF6',
            }}
          />
          <p style={{ color: '#CBD5E1' }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !report) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#050510' }}
      >
        <div 
          className="text-center p-8 rounded-2xl"
          style={{ background: '#0A0A1F', border: '1px solid #1A1A3A' }}
        >
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#FAFAFA' }}>
            {error || t('noReport')}
          </h2>
          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={fetchReport}
              className="px-6 py-3 rounded-xl font-medium"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                color: '#FAFAFA',
              }}
            >
              {t('generateNew')}
            </button>
            <button
              onClick={() => router.push('/partners')}
              className="px-6 py-3 rounded-xl font-medium"
              style={{
                background: '#1A1A3A',
                color: '#FAFAFA',
              }}
            >
              {t('backToPartners')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ background: '#050510' }}
    >
      <Navigation currentPath="/partners" />

      <main className="max-w-5xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/partners')}
            className="inline-block mb-4 text-sm hover:underline"
            style={{ color: '#8B5CF6' }}
          >
            ← {t('backToPartners')}
          </button>
          
          <div className="text-center">
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ 
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('title')}
            </h1>
            <p className="text-lg" style={{ color: '#CBD5E1' }}>
              {t('subtitle')} <span style={{ color: '#FAFAFA', fontWeight: 600 }}>{partnerName}</span>
            </p>
            {cached && (
              <p className="text-xs mt-2" style={{ color: '#64748B' }}>
                {t('reportGenerated')} {formatDate(report.generatedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Overall Score Section */}
        <section 
          className="mb-10 p-8 rounded-2xl text-center"
          style={{ 
            background: '#0A0A1F',
            border: '1px solid #1A1A3A',
          }}
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#FAFAFA' }}>
            {t('overallScore')}
          </h2>
          <div className="flex justify-center mb-4">
            <ScoreGauge score={report.overallScore} size={180} />
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FAFAFA' }}>
            {t('categoryAnalysis')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategoryCard
              score={report.categories.emotional.score}
              label={language === 'bg' ? report.categories.emotional.labelBg : report.categories.emotional.label}
              analysis={report.categories.emotional.analysis}
            />
            <CategoryCard
              score={report.categories.communication.score}
              label={language === 'bg' ? report.categories.communication.labelBg : report.categories.communication.label}
              analysis={report.categories.communication.analysis}
            />
            <CategoryCard
              score={report.categories.physical.score}
              label={language === 'bg' ? report.categories.physical.labelBg : report.categories.physical.label}
              analysis={report.categories.physical.analysis}
            />
            <CategoryCard
              score={report.categories.longTerm.score}
              label={language === 'bg' ? report.categories.longTerm.labelBg : report.categories.longTerm.label}
              analysis={report.categories.longTerm.analysis}
            />
          </div>
        </section>

        {/* Key Aspects */}
        {report.keyAspects.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FAFAFA' }}>
              {t('keyAspects')}
            </h2>
            <div className="space-y-3">
              {report.keyAspects.map((aspect, index) => (
                <KeyAspectItem key={index} aspect={aspect} />
              ))}
            </div>
          </section>
        )}

        {/* Two-column layout for strengths and challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Strengths */}
          <section 
            className="p-6 rounded-2xl"
            style={{ 
              background: '#0A0A1F',
              border: '1px solid #1A1A3A',
            }}
          >
            <h2 
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: '#10B981' }}
            >
              <span>✨</span> {tPartners('strengths')}
            </h2>
            <div className="space-y-4">
              {report.strengths.map((strength, index) => (
                <ListItem 
                  key={index} 
                  icon="💪" 
                  text={strength} 
                  type="strength" 
                />
              ))}
              {report.strengths.length === 0 && (
                <p style={{ color: '#64748B' }}>-</p>
              )}
            </div>
          </section>

          {/* Challenges */}
          <section 
            className="p-6 rounded-2xl"
            style={{ 
              background: '#0A0A1F',
              border: '1px solid #1A1A3A',
            }}
          >
            <h2 
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: '#F59E0B' }}
            >
              <span>⚡</span> {tPartners('challenges')}
            </h2>
            <div className="space-y-4">
              {report.challenges.map((challenge, index) => (
                <ListItem 
                  key={index} 
                  icon="🌱" 
                  text={challenge} 
                  type="challenge" 
                />
              ))}
              {report.challenges.length === 0 && (
                <p style={{ color: '#64748B' }}>-</p>
              )}
            </div>
          </section>
        </div>

        {/* Advice */}
        <section 
          className="p-6 rounded-2xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
          }}
        >
          <h2 
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            <span>💫</span> {tPartners('advice')}
          </h2>
          <p className="leading-relaxed" style={{ color: '#CBD5E1' }}>
            {report.advice}
          </p>
        </section>

        {/* Actions */}
        <div className="flex gap-4 justify-center mt-10 flex-wrap">
          <button
            onClick={() => {
              if (report) {
                const question = `${t('askAIPrompt')} ${partnerName}. ${language === 'bg' ? 'Нашият резултат за съвместимост е' : 'Our compatibility score is'} ${report.overallScore}%.`;
                sessionStorage.setItem('astrologaai_prefill_question', question);
                router.push('/chat');
              }
            }}
            className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            💬 {t('askAI')}
          </button>
          <button
            onClick={() => router.push(`/partners/${partnerId}/synastry`)}
            className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              color: '#FAFAFA',
            }}
          >
            {t('viewSynastry')}
          </button>
          <button
            onClick={() => router.push('/partners')}
            className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              background: '#1A1A3A',
              color: '#FAFAFA',
            }}
          >
            {t('backToPartners')}
          </button>
        </div>
      </main>
    </div>
  );
}
