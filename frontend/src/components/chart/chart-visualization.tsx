'use client';

import React from 'react';

// Design system colors
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  success: '#10B981',
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

// Element colors
const ELEMENT_COLORS: Record<string, string> = {
  fire: '#EF4444',
  earth: '#10B981',
  air: '#3B82F6',
  water: '#06B6D4',
};

interface PlanetPosition {
  name: string;
  sign: string;
  signBg: string;
  degree: number;
  house: number;
  retrograde: boolean;
  symbol: string;
}

interface HouseCusp {
  number: number;
  sign: string;
  signBg: string;
  degree: number;
}

interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  aspectBg: string;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
}

interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  rising: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  northNode: PlanetPosition;
  southNode: PlanetPosition;
  chiron: PlanetPosition;
  lilith?: PlanetPosition;
  houses: HouseCusp[];
  aspects: Aspect[];
  elements: {
    fire: number;
    earth: number;
    air: number;
    water: number;
  };
  modalities: {
    cardinal: number;
    fixed: number;
    mutable: number;
  };
  calculatedAt?: string;
  source?: string;
}

interface ChartVisualizationProps {
  chart: NatalChart;
  language?: 'en' | 'bg';
}

export default function ChartVisualization({ chart, language = 'bg' }: ChartVisualizationProps) {
  const isBulgarian = language === 'bg';

  // Main planets to display
  const mainPlanets = [
    { key: 'sun', label: isBulgarian ? 'Слънце' : 'Sun' },
    { key: 'moon', label: isBulgarian ? 'Луна' : 'Moon' },
    { key: 'rising', label: isBulgarian ? 'Асцендент' : 'Rising' },
    { key: 'mercury', label: isBulgarian ? 'Меркурий' : 'Mercury' },
    { key: 'venus', label: isBulgarian ? 'Венера' : 'Venus' },
    { key: 'mars', label: isBulgarian ? 'Марс' : 'Mars' },
    { key: 'jupiter', label: isBulgarian ? 'Юпитер' : 'Jupiter' },
    { key: 'saturn', label: isBulgarian ? 'Сатурн' : 'Saturn' },
  ];

  const outerPlanets = [
    { key: 'uranus', label: isBulgarian ? 'Уран' : 'Uranus' },
    { key: 'neptune', label: isBulgarian ? 'Нептун' : 'Neptune' },
    { key: 'pluto', label: isBulgarian ? 'Плутон' : 'Pluto' },
  ];

  const specialPoints = [
    { key: 'northNode', label: isBulgarian ? 'Северен възел' : 'North Node' },
    { key: 'southNode', label: isBulgarian ? 'Южен възел' : 'South Node' },
    { key: 'chiron', label: isBulgarian ? 'Хирон' : 'Chiron' },
  ];

  const getPlanetPosition = (key: string): PlanetPosition | null => {
    return (chart as any)[key] || null;
  };

  const formatDegree = (degree: number): string => {
    const d = Math.floor(degree);
    const m = Math.floor((degree - d) * 60);
    return `${d}°${m.toString().padStart(2, '0')}'`;
  };

  const PlanetCard = ({ planet, label }: { planet: PlanetPosition; label: string }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
      style={{
        background: colors.background,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}30 100%)`,
        }}
      >
        {PLANET_SYMBOLS[planet.name] || planet.symbol}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color: colors.textPrimary }}>
            {label}
          </span>
          {planet.retrograde && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: `${colors.secondary}30`, color: colors.secondary }}
            >
              R
            </span>
          )}
        </div>
        <div className="text-sm" style={{ color: colors.textSecondary }}>
          {isBulgarian ? planet.signBg : planet.sign} • {formatDegree(planet.degree)}
        </div>
      </div>
      <div
        className="text-sm px-2 py-1 rounded"
        style={{ background: `${colors.primary}20`, color: colors.primary }}
      >
        H{planet.house}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Big Three - Sun, Moon, Rising */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}15 100%)`,
          border: `1px solid ${colors.border}`,
        }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {isBulgarian ? 'Вашата космическа същност' : 'Your Cosmic Blueprint'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['sun', 'moon', 'rising'].map((key) => {
            const planet = getPlanetPosition(key);
            const label = mainPlanets.find(p => p.key === key)?.label || key;
            if (!planet) return null;

            return (
              <div
                key={key}
                className="text-center p-4 rounded-xl"
                style={{ background: colors.surface }}
              >
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}40 0%, ${colors.secondary}40 100%)`,
                  }}
                >
                  {PLANET_SYMBOLS[key] || '★'}
                </div>
                <div className="font-medium" style={{ color: colors.textSecondary }}>
                  {label}
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: colors.textPrimary }}>
                  {isBulgarian ? planet.signBg : planet.sign}
                </div>
                <div className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {formatDegree(planet.degree)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Planets */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {isBulgarian ? 'Планетарни позиции' : 'Planetary Positions'}
        </h3>

        {/* Personal Planets */}
        <div className="mb-4">
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: colors.textSecondary }}
          >
            {isBulgarian ? 'Лични планети' : 'Personal Planets'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mainPlanets.slice(0, 8).map(({ key, label }) => {
              const planet = getPlanetPosition(key);
              if (!planet) return null;
              return <PlanetCard key={key} planet={planet} label={label} />;
            })}
          </div>
        </div>

        {/* Outer Planets */}
        <div className="mb-4">
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: colors.textSecondary }}
          >
            {isBulgarian ? 'Външни планети' : 'Outer Planets'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {outerPlanets.map(({ key, label }) => {
              const planet = getPlanetPosition(key);
              if (!planet) return null;
              return <PlanetCard key={key} planet={planet} label={label} />;
            })}
          </div>
        </div>

        {/* Special Points */}
        <div>
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: colors.textSecondary }}
          >
            {isBulgarian ? 'Специални точки' : 'Special Points'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {specialPoints.map(({ key, label }) => {
              const planet = getPlanetPosition(key);
              if (!planet) return null;
              return <PlanetCard key={key} planet={planet} label={label} />;
            })}
          </div>
        </div>
      </div>

      {/* Elements & Modalities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Elements */}
        <div
          className="rounded-2xl p-6"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: colors.textPrimary }}
          >
            {isBulgarian ? 'Елементи' : 'Elements'}
          </h3>
          <div className="space-y-3">
            {['fire', 'earth', 'air', 'water'].map((element) => {
              const count = chart.elements[element as keyof typeof chart.elements];
              const labels = {
                fire: isBulgarian ? 'Огън' : 'Fire',
                earth: isBulgarian ? 'Земя' : 'Earth',
                air: isBulgarian ? 'Въздух' : 'Air',
                water: isBulgarian ? 'Вода' : 'Water',
              };
              const percentage = (count / 15) * 100;

              return (
                <div key={element}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: colors.textSecondary }}>{labels[element as keyof typeof labels]}</span>
                    <span style={{ color: colors.textPrimary }}>{count}</span>
                  </div>
                  <div
                    className="h-2 rounded-full"
                    style={{ background: colors.background }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        background: ELEMENT_COLORS[element],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modalities */}
        <div
          className="rounded-2xl p-6"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: colors.textPrimary }}
          >
            {isBulgarian ? 'Качества' : 'Modalities'}
          </h3>
          <div className="space-y-3">
            {['cardinal', 'fixed', 'mutable'].map((modality) => {
              const count = chart.modalities[modality as keyof typeof chart.modalities];
              const labels = {
                cardinal: isBulgarian ? 'Кардинално' : 'Cardinal',
                fixed: isBulgarian ? 'Фиксирано' : 'Fixed',
                mutable: isBulgarian ? 'Променливо' : 'Mutable',
              };
              const percentage = (count / 15) * 100;

              return (
                <div key={modality}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: colors.textSecondary }}>{labels[modality as keyof typeof labels]}</span>
                    <span style={{ color: colors.textPrimary }}>{count}</span>
                  </div>
                  <div
                    className="h-2 rounded-full"
                    style={{ background: colors.background }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aspects */}
      {chart.aspects && chart.aspects.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: colors.textPrimary }}
          >
            {isBulgarian ? 'Основни аспекти' : 'Major Aspects'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {chart.aspects.slice(0, 10).map((aspect, index) => {
              const natureColors = {
                harmonious: colors.success,
                challenging: colors.secondary,
                neutral: colors.primary,
              };

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: colors.background }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: colors.textPrimary }}>
                      {PLANET_SYMBOLS[aspect.planet1] || aspect.planet1}
                    </span>
                    <span style={{ color: colors.textSecondary }}>—</span>
                    <span style={{ color: colors.textPrimary }}>
                      {PLANET_SYMBOLS[aspect.planet2] || aspect.planet2}
                    </span>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-sm"
                    style={{
                      background: `${natureColors[aspect.nature]}20`,
                      color: natureColors[aspect.nature],
                    }}
                  >
                    {isBulgarian ? aspect.aspectBg : aspect.aspect}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export type { NatalChart, PlanetPosition, HouseCusp, Aspect };
