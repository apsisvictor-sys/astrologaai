/**
 * Time Sensitivity Component
 * US-30: View Birth Time Sensitivity
 * 
 * Displays how small changes in birth time affect the chart,
 * showing Rising sign and house placements sensitivity.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Design system colors
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  textMuted: '#71717A',
  border: '#252532',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface TimeSensitivityData {
  profileId: string;
  profileName: string;
  originalTime: {
    time: string;
    isUnknown: boolean;
  };
  sensitivity: {
    risingSign: {
      stable: boolean;
      signChanges: number;
      stabilityScore: number;
    };
    houses: {
      stableHouses: number;
      changingHouses: number[];
      stabilityScore: number;
    };
    overallStability: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  timeRange: {
    start: string;
    end: string;
    interval: number;
  };
  dataPoints: DataPoint[];
  summary: {
    en: string;
    bg: string;
  };
}

interface DataPoint {
  timeOffset: number;
  birthTime: string;
  rising: {
    sign: string;
    signBg: string;
    degree: number;
    changed: boolean;
  };
  houseChanges: {
    house: number;
    sign: string;
    signBg: string;
    changed: boolean;
  }[];
  planetShifts: {
    planet: string;
    originalHouse: number;
    newHouse: number;
    changed: boolean;
  }[];
}

interface TimeSensitivityProps {
  profileId: string;
  language?: 'en' | 'bg';
  onAskAI?: (question: string) => void;
}

export default function TimeSensitivity({ 
  profileId, 
  language = 'bg',
  onAskAI 
}: TimeSensitivityProps) {
  const router = useRouter();
  const [data, setData] = useState<TimeSensitivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeOffset, setSelectedTimeOffset] = useState(0);
  const [timeRange, setTimeRange] = useState(30);
  const [interval, setInterval] = useState(5);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const translations = {
    en: {
      title: 'Birth Time Sensitivity',
      subtitle: 'See how small changes in birth time affect your chart',
      loading: 'Analyzing time sensitivity...',
      unknownTime: 'Unknown birth time',
      originalTime: 'Original Time',
      timeRange: 'Time Range',
      interval: 'Interval',
      minutes: 'minutes',
      risingSign: 'Rising Sign',
      stability: 'Stability',
      houses: 'Houses',
      overallStability: 'Overall Stability',
      confidence: 'Confidence',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      stable: 'Stable',
      sensitive: 'Sensitive',
      houseChanges: 'House Changes',
      planetShifts: 'Planet Shifts',
      noChanges: 'No changes detected',
      changes: 'changes',
      timeSlider: 'Time Adjustment',
      applySettings: 'Apply Settings',
      askAboutSensitivity: 'Ask AI about sensitivity',
      stableChart: 'Your chart is highly stable',
      moderateChart: 'Moderate sensitivity',
      sensitiveChart: 'Highly sensitive to time',
      risingStable: 'Rising sign is stable',
      risingChanges: 'Rising sign changes',
      allHousesStable: 'All houses are stable',
      someHousesChange: 'Some houses change signs',
      viewDetails: 'View Details',
      closeDetails: 'Close Details',
    },
    bg: {
      title: 'Чувствителност на времето',
      subtitle: 'Вижте как малки промени във времето на раждане влияят на картата ви',
      loading: 'Анализиране на чувствителността...',
      unknownTime: 'Неизвестен час на раждане',
      originalTime: 'Оригинален час',
      timeRange: 'Времеви диапазон',
      interval: 'Интервал',
      minutes: 'минути',
      risingSign: 'Асцендент',
      stability: 'Стабилност',
      houses: 'Домове',
      overallStability: 'Обща стабилност',
      confidence: 'Доверие',
      high: 'Високо',
      medium: 'Средно',
      low: 'Ниско',
      stable: 'Стабилен',
      sensitive: 'Чувствителен',
      houseChanges: 'Промени в домовете',
      planetShifts: 'Промени в планетите',
      noChanges: 'Няма открити промени',
      changes: 'промени',
      timeSlider: 'Корекция на времето',
      applySettings: 'Приложи настройки',
      askAboutSensitivity: 'Попитай AI за чувствителността',
      stableChart: 'Вашата карта е силно стабилна',
      moderateChart: 'Умерена чувствителност',
      sensitiveChart: 'Силно чувствителна към времето',
      risingStable: 'Асцендентът е стабилен',
      risingChanges: 'Асцендентът се променя',
      allHousesStable: 'Всички домове са стабилни',
      someHousesChange: 'Някои домове променят знаци',
      viewDetails: 'Виж детайли',
      closeDetails: 'Затвори детайли',
    },
  };
  
  const t = translations[language];
  
  // Fetch time sensitivity data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      
      const response = await fetch(
        `${API_URL}/api/v1/birth-chart/${profileId}/time-sensitivity?timeRange=${timeRange}&interval=${interval}&lang=${language}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch time sensitivity data');
      }
      
      const result = await response.json();
      setData(result.data);
      setSelectedTimeOffset(0);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [profileId, timeRange, interval, language, API_URL]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Get selected data point
  const selectedDataPoint = data?.dataPoints.find(
    (dp) => dp.timeOffset === selectedTimeOffset
  ) || data?.dataPoints.find((dp) => dp.timeOffset === 0);
  
  // Get stability color
  const getStabilityColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.error;
  };
  
  // Get confidence badge color
  const getConfidenceColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return colors.success;
      case 'medium': return colors.warning;
      case 'low': return colors.error;
    }
  };
  
  // Get planet symbol
  const getPlanetSymbol = (planet: string) => {
    const symbols: Record<string, string> = {
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
    };
    return symbols[planet] || '●';
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="animate-pulse">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: `${colors.primary}20` }}
          >
            <svg className="w-8 h-8 animate-spin" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p style={{ color: colors.textSecondary }}>{t.loading}</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ background: `${colors.error}15`, border: `1px solid ${colors.error}` }}
      >
        <p style={{ color: colors.error }}>{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 rounded-lg text-sm"
          style={{ background: `${colors.error}20`, color: colors.error }}
        >
          {language === 'bg' ? 'Опитай отново' : 'Try Again'}
        </button>
      </div>
    );
  }
  
  // No data state
  if (!data) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
              ⏱️ {t.title}
            </h3>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {t.subtitle}
            </p>
          </div>
          
          {/* Original Time Badge */}
          <div
            className="px-4 py-2 rounded-xl"
            style={{ background: `${colors.primary}20`, border: `1px solid ${colors.primary}` }}
          >
            <div className="text-xs" style={{ color: colors.textMuted }}>{t.originalTime}</div>
            <div className="font-semibold" style={{ color: colors.textPrimary }}>
              {data.originalTime.isUnknown ? t.unknownTime : data.originalTime.time}
            </div>
          </div>
        </div>
        
        {/* Summary */}
        <div
          className="p-4 rounded-xl mb-4"
          style={{ background: `${getStabilityColor(data.sensitivity.overallStability)}15` }}
        >
          <p style={{ color: colors.textSecondary }}>
            {language === 'bg' ? data.summary.bg : data.summary.en}
          </p>
        </div>
        
        {/* Stability Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overall Stability */}
          <div
            className="p-4 rounded-xl"
            style={{ background: colors.background, border: `1px solid ${colors.border}` }}
          >
            <div className="text-xs mb-1" style={{ color: colors.textMuted }}>{t.overallStability}</div>
            <div className="text-2xl font-bold" style={{ color: getStabilityColor(data.sensitivity.overallStability) }}>
              {data.sensitivity.overallStability}%
            </div>
            <div className="mt-2 h-2 rounded-full" style={{ background: colors.border }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${data.sensitivity.overallStability}%`,
                  background: getStabilityColor(data.sensitivity.overallStability),
                }}
              />
            </div>
          </div>
          
          {/* Rising Sign Stability */}
          <div
            className="p-4 rounded-xl"
            style={{ background: colors.background, border: `1px solid ${colors.border}` }}
          >
            <div className="text-xs mb-1" style={{ color: colors.textMuted }}>{t.risingSign}</div>
            <div className="text-2xl font-bold" style={{ color: getStabilityColor(data.sensitivity.risingSign.stabilityScore) }}>
              {data.sensitivity.risingSign.stable ? '✓' : `${data.sensitivity.risingSign.signChanges}`}
            </div>
            <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {data.sensitivity.risingSign.stable ? t.risingStable : t.risingChanges}
            </div>
          </div>
          
          {/* Houses Stability */}
          <div
            className="p-4 rounded-xl"
            style={{ background: colors.background, border: `1px solid ${colors.border}` }}
          >
            <div className="text-xs mb-1" style={{ color: colors.textMuted }}>{t.houses}</div>
            <div className="text-2xl font-bold" style={{ color: getStabilityColor(data.sensitivity.houses.stabilityScore) }}>
              {data.sensitivity.houses.stableHouses}/12
            </div>
            <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {data.sensitivity.houses.changingHouses.length === 0 
                ? t.allHousesStable 
                : `${data.sensitivity.houses.changingHouses.length} ${t.changes}`}
            </div>
          </div>
          
          {/* Confidence Level */}
          <div
            className="p-4 rounded-xl"
            style={{ background: colors.background, border: `1px solid ${colors.border}` }}
          >
            <div className="text-xs mb-1" style={{ color: colors.textMuted }}>{t.confidence}</div>
            <div className="text-2xl font-bold" style={{ color: getConfidenceColor(data.sensitivity.confidenceLevel) }}>
              {t[data.sensitivity.confidenceLevel]}
            </div>
            <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {data.originalTime.isUnknown ? t.unknownTime : '●●●'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Time Slider */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold" style={{ color: colors.textPrimary }}>
            {t.timeSlider}
          </h4>
          <div
            className="px-3 py-1.5 rounded-lg"
            style={{ background: colors.background, color: colors.primary }}
          >
            {selectedDataPoint?.birthTime || data.originalTime.time}
            <span className="text-sm ml-2" style={{ color: colors.textMuted }}>
              ({selectedTimeOffset >= 0 ? '+' : ''}{selectedTimeOffset} {t.minutes})
            </span>
          </div>
        </div>
        
        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min={-timeRange}
            max={timeRange}
            step={interval}
            value={selectedTimeOffset}
            onChange={(e) => setSelectedTimeOffset(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          />
          
          {/* Time markers */}
          <div className="flex justify-between mt-2 text-xs" style={{ color: colors.textMuted }}>
            <span>-{timeRange}m</span>
            <span>0</span>
            <span>+{timeRange}m</span>
          </div>
        </div>
        
        {/* Selected Time Details */}
        {selectedDataPoint && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rising Sign at Selected Time */}
            <div
              className="p-4 rounded-xl"
              style={{ 
                background: selectedDataPoint.rising.changed ? `${colors.warning}10` : colors.background,
                border: `1px solid ${selectedDataPoint.rising.changed ? colors.warning : colors.border}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: colors.textMuted }}>{t.risingSign}</span>
                {selectedDataPoint.rising.changed && (
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ background: `${colors.warning}20`, color: colors.warning }}
                  >
                    {language === 'bg' ? 'Променен' : 'Changed'}
                  </span>
                )}
              </div>
              <div className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                {language === 'bg' ? selectedDataPoint.rising.signBg : selectedDataPoint.rising.sign}
              </div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                {selectedDataPoint.rising.degree.toFixed(2)}°
              </div>
            </div>
            
            {/* House Changes Summary */}
            <div
              className="p-4 rounded-xl"
              style={{ background: colors.background, border: `1px solid ${colors.border}` }}
            >
              <div className="text-sm mb-2" style={{ color: colors.textMuted }}>{t.houseChanges}</div>
              <div className="flex flex-wrap gap-2">
                {selectedDataPoint.houseChanges.filter(hc => hc.changed).length === 0 ? (
                  <span className="text-sm" style={{ color: colors.textSecondary }}>{t.noChanges}</span>
                ) : (
                  selectedDataPoint.houseChanges
                    .filter(hc => hc.changed)
                    .map(hc => (
                      <span
                        key={hc.house}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: `${colors.warning}20`, color: colors.warning }}
                      >
                        {hc.house}: {language === 'bg' ? hc.signBg : hc.sign}
                      </span>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Detailed Changes View */}
      {selectedDataPoint && selectedDataPoint.planetShifts.some(ps => ps.changed) && (
        <div
          className="rounded-2xl p-6"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <h4 className="font-semibold mb-4" style={{ color: colors.textPrimary }}>
            {t.planetShifts}
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {selectedDataPoint.planetShifts.map((ps) => (
              <div
                key={ps.planet}
                className="p-3 rounded-xl text-center"
                style={{
                  background: ps.changed ? `${colors.warning}10` : colors.background,
                  border: `1px solid ${ps.changed ? colors.warning : colors.border}`,
                }}
              >
                <div className="text-xl mb-1">{getPlanetSymbol(ps.planet)}</div>
                <div className="text-xs capitalize" style={{ color: colors.textMuted }}>{ps.planet}</div>
                <div className="text-sm mt-1" style={{ color: ps.changed ? colors.warning : colors.textSecondary }}>
                  {ps.originalHouse} → {ps.newHouse}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Settings Panel */}
      <div
        className="rounded-2xl p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <h4 className="font-semibold mb-4" style={{ color: colors.textPrimary }}>
          ⚙️ {language === 'bg' ? 'Настройки на анализ' : 'Analysis Settings'}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Time Range */}
          <div>
            <label className="text-sm mb-2 block" style={{ color: colors.textSecondary }}>
              {t.timeRange} ({t.minutes})
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="w-full p-3 rounded-xl"
              style={{ background: colors.background, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
            >
              <option value={15}>±15</option>
              <option value={30}>±30</option>
              <option value={60}>±60</option>
              <option value={90}>±90</option>
              <option value={120}>±120</option>
            </select>
          </div>
          
          {/* Interval */}
          <div>
            <label className="text-sm mb-2 block" style={{ color: colors.textSecondary }}>
              {t.interval} ({t.minutes})
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full p-3 rounded-xl"
              style={{ background: colors.background, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
            >
              <option value={1}>1</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
          </div>
          
          {/* Apply Button */}
          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                color: 'white',
              }}
            >
              {t.applySettings}
            </button>
          </div>
        </div>
      </div>
      
      {/* Ask AI Button */}
      {onAskAI && (
        <button
          onClick={() => onAskAI(
            language === 'bg' 
              ? `Колко чувствителна е моята карта към промени във времето на раждане? Асцендентът ми е стабилен ли е?`
              : `How sensitive is my chart to birth time changes? Is my rising sign stable?`
          )}
          className="w-full px-6 py-4 rounded-xl font-medium transition-all hover:scale-[1.01]"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.primary}`,
            color: colors.primary,
          }}
        >
          🤖 {t.askAboutSensitivity}
        </button>
      )}
    </div>
  );
}
