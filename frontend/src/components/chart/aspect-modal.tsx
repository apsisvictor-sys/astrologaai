/**
 * Aspect Interpretation Modal - US-14: Explore Chart Aspects
 * 
 * Modal that displays when a user clicks on an aspect
 * Shows detailed interpretation in Bulgarian or English
 */

'use client';

import React from 'react';

// Design system colors (US-12 spec)
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

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
  rising: 'ASC',
};

interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  aspectBg: string;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
}

interface AspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspect: Aspect | null;
  interpretation: string | null;
  keywords: string[];
  language: 'en' | 'bg';
}

export default function AspectModal({
  isOpen,
  onClose,
  aspect,
  interpretation,
  keywords,
  language,
}: AspectModalProps) {
  if (!isOpen || !aspect) return null;

  const isBulgarian = language === 'bg';

  // Get nature color
  const getNatureColor = (nature: string) => {
    switch (nature) {
      case 'harmonious':
        return colors.success;
      case 'challenging':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  // Get aspect type color
  const getAspectColor = (aspectType: string) => {
    const colorsMap: Record<string, string> = {
      conjunction: colors.primary,
      sextile: colors.success,
      square: colors.error,
      trine: '#06B6D4',
      opposition: colors.secondary,
      quincunx: colors.warning,
    };
    return colorsMap[aspectType.toLowerCase()] || colors.primary;
  };

  // Get nature label
  const getNatureLabel = (nature: string) => {
    if (isBulgarian) {
      switch (nature) {
        case 'harmonious':
          return 'Хармоничен';
        case 'challenging':
          return 'Напрегнат';
        default:
          return 'Неутрален';
      }
    }
    return nature.charAt(0).toUpperCase() + nature.slice(1);
  };

  const natureColor = getNatureColor(aspect.nature);
  const aspectColor = getAspectColor(aspect.aspect);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px ${colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:scale-105"
          style={{ background: colors.background, color: colors.textSecondary }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          {/* Planets */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Planet 1 */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}30 100%)`,
                  border: `2px solid ${colors.primary}`,
                }}
              >
                {PLANET_SYMBOLS[aspect.planet1] || '?'}
              </div>
              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                {isBulgarian
                  ? aspect.planet1.charAt(0).toUpperCase() + aspect.planet1.slice(1)
                  : aspect.planet1.charAt(0).toUpperCase() + aspect.planet1.slice(1)}
              </span>
            </div>

            {/* Aspect type */}
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
                style={{ background: `${aspectColor}20`, border: `2px solid ${aspectColor}` }}
              >
                <span className="text-xl" style={{ color: aspectColor }}>
                  {aspect.aspect === 'trine' ? '△' : aspect.aspect === 'square' ? '◻' : aspect.aspect === 'sextile' ? '⚹' : aspect.aspect === 'opposition' ? '☍' : '☌'}
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: aspectColor }}>
                {isBulgarian ? aspect.aspectBg : aspect.aspect}
              </span>
            </div>

            {/* Planet 2 */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2"
                style={{
                  background: `linear-gradient(135deg, ${colors.secondary}30 0%, ${colors.primary}30 100%)`,
                  border: `2px solid ${colors.secondary}`,
                }}
              >
                {PLANET_SYMBOLS[aspect.planet2] || '?'}
              </div>
              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                {isBulgarian
                  ? aspect.planet2.charAt(0).toUpperCase() + aspect.planet2.slice(1)
                  : aspect.planet2.charAt(0).toUpperCase() + aspect.planet2.slice(1)}
              </span>
            </div>
          </div>

          {/* Nature badge */}
          <div className="flex justify-center">
            <span
              className="px-4 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: `${natureColor}20`,
                color: natureColor,
              }}
            >
              {getNatureLabel(aspect.nature)}
            </span>
          </div>
        </div>

        {/* Orb info */}
        <div
          className="mb-4 p-3 rounded-xl text-center"
          style={{ background: colors.background }}
        >
          <span style={{ color: colors.textSecondary }}>
            {isBulgarian ? 'Орбис' : 'Orb'}: {aspect.orb.toFixed(1)}°
          </span>
        </div>

        {/* Interpretation */}
        {interpretation ? (
          <div className="mb-6">
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: colors.textPrimary }}
            >
              {isBulgarian ? 'Интерпретация' : 'Interpretation'}
            </h3>
            <p
              className="leading-relaxed"
              style={{ color: colors.textSecondary }}
            >
              {interpretation}
            </p>
          </div>
        ) : (
          <div
            className="mb-6 p-4 rounded-xl text-center"
            style={{ background: colors.background }}
          >
            <p style={{ color: colors.textSecondary }}>
              {isBulgarian
                ? 'Няма налична специфична интерпретация за този аспект. Попитайте AI астролога за повече информация.'
                : 'No specific interpretation available for this aspect. Ask the AI astrologer for more information.'}
            </p>
          </div>
        )}

        {/* Keywords */}
        {keywords && keywords.length > 0 && (
          <div className="mb-6">
            <h4
              className="text-sm font-medium mb-2"
              style={{ color: colors.textSecondary }}
            >
              {isBulgarian ? 'Ключови думи' : 'Keywords'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full text-sm"
                  style={{
                    background: `${colors.primary}20`,
                    color: colors.primary,
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ask AI button */}
        <button
          onClick={() => {
            // Navigate to chat with pre-filled question
            const question = isBulgarian
              ? `Какво означава аспектът ${aspect.aspectBg} между ${aspect.planet1} и ${aspect.planet2} в моята карта?`
              : `What does the ${aspect.aspect} aspect between ${aspect.planet1} and ${aspect.planet2} mean in my chart?`;
            window.location.href = `/chat?q=${encodeURIComponent(question)}`;
          }}
          className="w-full py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            color: 'white',
          }}
        >
          {isBulgarian ? '🤖 Попитай AI астролога' : '🤖 Ask AI Astrologer'}
        </button>
      </div>
    </div>
  );
}
