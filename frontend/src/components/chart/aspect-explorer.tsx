/**
 * Aspect Explorer Component - US-14: Explore Chart Aspects
 * 
 * Interactive aspect exploration with:
 * - Circular chart with aspect lines
 * - Aspect filter
 * - Aspect interpretation modal
 * - Aspect list with click interaction
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import CircularChartWheel, { NatalChart, Aspect, PlanetPosition } from './circular-chart-wheel';
import AspectModal from './aspect-modal';
import AspectFilter, { AspectType, AspectNature } from './aspect-filter';
import {
  getAspectInterpretation,
  getAspectInfo,
  getPlanetName,
  ASPECT_INFO,
} from '@/lib/aspect-interpretations';

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

interface AspectExplorerProps {
  chart: NatalChart;
  language?: 'en' | 'bg';
}

export default function AspectExplorer({ chart, language = 'bg' }: AspectExplorerProps) {
  const [selectedType, setSelectedType] = useState<AspectType>('all');
  const [selectedNature, setSelectedNature] = useState<AspectNature>('all');
  const [selectedAspect, setSelectedAspect] = useState<Aspect | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAspectLines, setShowAspectLines] = useState(true);

  const isBulgarian = language === 'bg';

  // Filter aspects based on type and nature
  const filteredAspects = useMemo(() => {
    if (!chart.aspects) return [];

    return chart.aspects.filter((aspect) => {
      // Type filter
      if (selectedType !== 'all' && aspect.aspect.toLowerCase() !== selectedType) {
        return false;
      }

      // Nature filter
      if (selectedNature !== 'all' && aspect.nature !== selectedNature) {
        return false;
      }

      return true;
    });
  }, [chart.aspects, selectedType, selectedNature]);

  // Get interpretation for selected aspect
  const aspectInterpretation = useMemo(() => {
    if (!selectedAspect) return null;

    const result = getAspectInterpretation(
      selectedAspect.planet1,
      selectedAspect.planet2,
      selectedAspect.aspect.toLowerCase() as any,
      language
    );

    return result;
  }, [selectedAspect, language]);

  // Handle aspect click
  const handleAspectClick = useCallback((aspect: Aspect) => {
    setSelectedAspect(aspect);
    setIsModalOpen(true);
  }, []);

  // Handle aspect line click from chart wheel
  const handleAspectLineClick = useCallback((planet1: string, planet2: string) => {
    const aspect = chart.aspects?.find(
      (a) =>
        (a.planet1 === planet1 && a.planet2 === planet2) ||
        (a.planet1 === planet2 && a.planet2 === planet1)
    );
    if (aspect) {
      setSelectedAspect(aspect);
      setIsModalOpen(true);
    }
  }, [chart.aspects]);

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

  // Get aspect color
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

  // Aspect statistics
  const aspectStats = useMemo(() => {
    if (!chart.aspects) return { harmonious: 0, challenging: 0, neutral: 0, total: 0 };

    return {
      harmonious: chart.aspects.filter((a) => a.nature === 'harmonious').length,
      challenging: chart.aspects.filter((a) => a.nature === 'challenging').length,
      neutral: chart.aspects.filter((a) => a.nature === 'neutral').length,
      total: chart.aspects.length,
    };
  }, [chart.aspects]);

  return (
    <div className="space-y-6">
      {/* Aspect Statistics */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {isBulgarian ? 'Общ преглед на аспектите' : 'Aspect Overview'}
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: colors.success }}
            >
              {aspectStats.harmonious}
            </div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              {isBulgarian ? 'Хармонични' : 'Harmonious'}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: colors.error }}
            >
              {aspectStats.challenging}
            </div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              {isBulgarian ? 'Напрегнати' : 'Challenging'}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: colors.primary }}
            >
              {aspectStats.neutral}
            </div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              {isBulgarian ? 'Неутрални' : 'Neutral'}
            </div>
          </div>
        </div>

        {/* Visual distribution bar */}
        <div
          className="h-3 rounded-full overflow-hidden flex"
          style={{ background: colors.background }}
        >
          {aspectStats.total > 0 && (
            <>
              <div
                className="h-full transition-all"
                style={{
                  width: `${(aspectStats.harmonious / aspectStats.total) * 100}%`,
                  background: colors.success,
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${(aspectStats.challenging / aspectStats.total) * 100}%`,
                  background: colors.error,
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${(aspectStats.neutral / aspectStats.total) * 100}%`,
                  background: colors.primary,
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Chart with aspect lines */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: colors.textPrimary }}
          >
            {isBulgarian ? 'Колело с аспекти' : 'Aspect Wheel'}
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAspectLines}
              onChange={(e) => setShowAspectLines(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              {isBulgarian ? 'Покажи линии' : 'Show lines'}
            </span>
          </label>
        </div>

        <div className="flex justify-center">
          <CircularChartWheel
            chart={chart}
            size={450}
            language={language}
            showAspects={showAspectLines}
          />
        </div>
      </div>

      {/* Aspect Filter */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {isBulgarian ? 'Филтриране на аспекти' : 'Filter Aspects'}
        </h3>

        <AspectFilter
          selectedType={selectedType}
          selectedNature={selectedNature}
          onTypeChange={setSelectedType}
          onNatureChange={setSelectedNature}
          language={language}
        />

        {/* Filtered count */}
        <div className="mt-4 text-sm" style={{ color: colors.textSecondary }}>
          {isBulgarian
            ? `Показани ${filteredAspects.length} от ${chart.aspects?.length || 0} аспекта`
            : `Showing ${filteredAspects.length} of ${chart.aspects?.length || 0} aspects`}
        </div>
      </div>

      {/* Aspect List */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <h3
          className="text-lg font-semibold mb-6"
          style={{ color: colors.textPrimary }}
        >
          {isBulgarian ? 'Аспекти' : 'Aspects'} ({filteredAspects.length})
        </h3>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          {['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((aspect) => {
            const info = ASPECT_INFO[aspect as keyof typeof ASPECT_INFO];
            if (!info) return null;

            return (
              <div key={aspect} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: getAspectColor(aspect) }}
                />
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  {isBulgarian ? info.nameBg : info.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Aspects grid */}
        {filteredAspects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAspects.map((aspect, index) => (
              <button
                key={`${aspect.planet1}-${aspect.planet2}-${aspect.aspect}-${index}`}
                onClick={() => handleAspectClick(aspect)}
                className="flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.02] text-left"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Planet symbols */}
                  <div className="flex items-center gap-1">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                      style={{ background: `${colors.primary}15` }}
                    >
                      {PLANET_SYMBOLS[aspect.planet1] || '?'}
                    </div>
                    <span style={{ color: getAspectColor(aspect.aspect) }}>—</span>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                      style={{ background: `${colors.secondary}15` }}
                    >
                      {PLANET_SYMBOLS[aspect.planet2] || '?'}
                    </div>
                  </div>

                  {/* Aspect info */}
                  <div>
                    <div className="font-medium" style={{ color: colors.textPrimary }}>
                      {getPlanetName(aspect.planet1, language)} — {getPlanetName(aspect.planet2, language)}
                    </div>
                    <div className="text-sm" style={{ color: colors.textSecondary }}>
                      {isBulgarian ? aspect.aspectBg : aspect.aspect} • {aspect.orb.toFixed(1)}°
                    </div>
                  </div>
                </div>

                {/* Nature badge */}
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{
                    background: `${getNatureColor(aspect.nature)}20`,
                    color: getNatureColor(aspect.nature),
                  }}
                >
                  {getNatureLabel(aspect.nature)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p style={{ color: colors.textSecondary }}>
              {isBulgarian
                ? 'Няма аспекти, отговарящи на избраните филтри'
                : 'No aspects match the selected filters'}
            </p>
          </div>
        )}
      </div>

      {/* Aspect Interpretation Modal */}
      <AspectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aspect={selectedAspect}
        interpretation={aspectInterpretation?.interpretation || null}
        keywords={aspectInterpretation?.keywords || []}
        language={language}
      />
    </div>
  );
}
