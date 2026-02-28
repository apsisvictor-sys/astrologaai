'use client';

import React, { useState, useEffect } from 'react';
import { NatalChart } from './chart-visualization';

// Design system colors
const colors = {
  background: '#050510',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  success: '#10B981',
  warning: '#F59E0B',
};

interface InterpretationData {
  planet?: string;
  name: string;
  symbol: string;
  sign: string;
  degree: number;
  house?: number;
  retrograde?: boolean;
  interpretation: string;
  keywords: string[];
}

interface ChartAnalysis {
  language: string;
  level: string;
  bigThree: {
    sun: InterpretationData;
    moon: InterpretationData;
    rising: InterpretationData;
  };
  planets: InterpretationData[];
  houses: {
    number: number;
    sign: string;
    degree: number;
    interpretation: string;
    keywords: string[];
  }[];
  aspects: {
    planet1: string;
    planet2: string;
    aspect: string;
    orb: number;
    nature: 'harmonious' | 'challenging' | 'neutral';
    interpretation: string;
    keywords: string[];
  }[];
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
}

interface ChartInterpretationProps {
  chart: NatalChart;
  profileId: string;
  language?: 'en' | 'bg';
  onAskAI?: (question: string) => void;
}

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

// Tooltip component
function Tooltip({ 
  children, 
  content, 
  keywords,
  onLearnMore,
  onAskAI,
}: { 
  children: React.ReactNode; 
  content: string;
  keywords: string[];
  onLearnMore?: () => void;
  onAskAI?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="absolute z-50 w-72 p-4 rounded-xl shadow-xl left-1/2 -translate-x-1/2 bottom-full mb-2"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-3 h-3 rotate-45"
            style={{ background: colors.surface, borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}
          />
          
          <p className="text-sm mb-3" style={{ color: colors.textPrimary }}>
            {content}
          </p>
          
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {keywords.map((keyword, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${colors.primary}20`, color: colors.primaryLight }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            {onLearnMore && (
              <button
                onClick={onLearnMore}
                className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: colors.primary, color: 'white' }}
              >
                Learn More
              </button>
            )}
            {onAskAI && (
              <button
                onClick={onAskAI}
                className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: colors.secondary, color: 'white' }}
              >
                Ask AI
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Interpretation level selector
function LevelSelector({ 
  level, 
  onChange, 
  language 
}: { 
  level: 'basic' | 'intermediate' | 'advanced'; 
  onChange: (level: 'basic' | 'intermediate' | 'advanced') => void;
  language: 'en' | 'bg';
}) {
  const levels = [
    { key: 'basic', label: language === 'bg' ? 'Основно' : 'Basic' },
    { key: 'intermediate', label: language === 'bg' ? 'Средно' : 'Intermediate' },
    { key: 'advanced', label: language === 'bg' ? 'Напреднало' : 'Advanced' },
  ];

  return (
    <div className="flex gap-2 p-1 rounded-lg" style={{ background: colors.background }}>
      {levels.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key as any)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: level === key ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` : 'transparent',
            color: level === key ? 'white' : colors.textSecondary,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ChartInterpretation({ 
  chart, 
  profileId, 
  language = 'bg',
  onAskAI,
}: ChartInterpretationProps) {
  const [analysis, setAnalysis] = useState<ChartAnalysis | null>(null);
  const [level, setLevel] = useState<'basic' | 'intermediate' | 'advanced'>('basic');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const isBulgarian = language === 'bg';

  useEffect(() => {
    fetchAnalysis();
  }, [profileId, level, language]);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const response = await fetch(
        `${API_URL}/api/v1/birth-chart/${profileId}/analysis?lang=${language}&level=${level}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analysis');
      }

      const data = await response.json();
      setAnalysis(data.data);
    } catch (err) {
      console.error('Analysis fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAI = (planetName: string, sign: string) => {
    const question = isBulgarian
      ? `Какво означава ${planetName} в знак ${sign} в моята карта?`
      : `What does ${planetName} in ${sign} mean in my chart?`;
    onAskAI?.(question);
  };

  const formatDegree = (degree: number): string => {
    const d = Math.floor(degree);
    const m = Math.floor((degree - d) * 60);
    return `${d}°${m.toString().padStart(2, '0')}'`;
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: colors.surface }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: colors.primary }} />
        <p className="mt-4" style={{ color: colors.textSecondary }}>
          {isBulgarian ? 'Зареждане на интерпретации...' : 'Loading interpretations...'}
        </p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="rounded-2xl p-6" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
        <p style={{ color: colors.secondary }}>
          {error || (isBulgarian ? 'Няма налични интерпретации' : 'No interpretations available')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Level Selector */}
      <div className="flex justify-center">
        <LevelSelector level={level} onChange={setLevel} language={language} />
      </div>

      {/* Big Three - Most Important */}
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
          {[analysis.bigThree.sun, analysis.bigThree.moon, analysis.bigThree.rising].map((planet) => (
            <Tooltip
              key={planet.planet}
              content={planet.interpretation}
              keywords={planet.keywords}
              onAskAI={() => handleAskAI(planet.name, planet.sign)}
            >
              <div
                className="text-center p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{ background: colors.surface }}
              >
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}40 0%, ${colors.secondary}40 100%)`,
                  }}
                >
                  {planet.symbol}
                </div>
                <div className="font-medium" style={{ color: colors.textSecondary }}>
                  {planet.name}
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: colors.textPrimary }}>
                  {planet.sign}
                </div>
                <div className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {formatDegree(planet.degree)}
                </div>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* All Planets with Interpretations */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.planets.map((planet) => (
            <Tooltip
              key={planet.planet}
              content={planet.interpretation}
              keywords={planet.keywords}
              onAskAI={() => handleAskAI(planet.name, planet.sign)}
            >
              <div
                className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] cursor-pointer ${
                  selectedPlanet === planet.planet ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  background: colors.background,
                  border: selectedPlanet === planet.planet ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                }}
                onClick={() => setSelectedPlanet(selectedPlanet === planet.planet ? null : (planet.planet || null))}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}30 100%)`,
                  }}
                >
                  {planet.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: colors.textPrimary }}>
                      {planet.name}
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
                    {planet.sign} • {formatDegree(planet.degree)}
                  </div>
                </div>
                <div
                  className="text-sm px-2 py-1 rounded"
                  style={{ background: `${colors.primary}20`, color: colors.primary }}
                >
                  H{planet.house}
                </div>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Houses */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {isBulgarian ? 'Домове' : 'Houses'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {analysis.houses.map((house) => (
            <Tooltip
              key={house.number}
              content={house.interpretation}
              keywords={house.keywords}
            >
              <div
                className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{ background: colors.background, border: `1px solid ${colors.border}` }}
              >
                <div className="text-lg font-bold mb-1" style={{ color: colors.primary }}>
                  {house.number}
                </div>
                <div className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  {house.sign}
                </div>
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  {formatDegree(house.degree)}
                </div>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Aspects */}
      {analysis.aspects.length > 0 && (
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
            {analysis.aspects.slice(0, 12).map((aspect, index) => {
              const natureColors = {
                harmonious: colors.success,
                challenging: colors.secondary,
                neutral: colors.primary,
              };

              return (
                <Tooltip
                  key={index}
                  content={aspect.interpretation}
                  keywords={aspect.keywords}
                >
                  <div
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
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
                      {aspect.aspect}
                    </span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Elements & Modalities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {[
              { key: 'fire', label: isBulgarian ? 'Огън' : 'Fire', color: '#EF4444' },
              { key: 'earth', label: isBulgarian ? 'Земя' : 'Earth', color: '#10B981' },
              { key: 'air', label: isBulgarian ? 'Въздух' : 'Air', color: '#3B82F6' },
              { key: 'water', label: isBulgarian ? 'Вода' : 'Water', color: '#06B6D4' },
            ].map(({ key, label, color }) => {
              const count = analysis.elements[key as keyof typeof analysis.elements];
              const percentage = (count / 15) * 100;

              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: colors.textSecondary }}>{label}</span>
                    <span style={{ color: colors.textPrimary }}>{count}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: colors.background }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
            {[
              { key: 'cardinal', label: isBulgarian ? 'Кардинално' : 'Cardinal' },
              { key: 'fixed', label: isBulgarian ? 'Фиксирано' : 'Fixed' },
              { key: 'mutable', label: isBulgarian ? 'Променливо' : 'Mutable' },
            ].map(({ key, label }) => {
              const count = analysis.modalities[key as keyof typeof analysis.modalities];
              const percentage = (count / 15) * 100;

              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: colors.textSecondary }}>{label}</span>
                    <span style={{ color: colors.textPrimary }}>{count}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: colors.background }}>
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

      {/* Ask AI Button */}
      {onAskAI && (
        <div className="flex justify-center">
          <button
            onClick={() => onAskAI(isBulgarian ? 'Разкажи ми повече за моята карта' : 'Tell me more about my chart')}
            className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              color: 'white',
            }}
          >
            {isBulgarian ? '💬 Попитай AI за твоята карта' : '💬 Ask AI About Your Chart'}
          </button>
        </div>
      )}
    </div>
  );
}

export type { ChartAnalysis };
