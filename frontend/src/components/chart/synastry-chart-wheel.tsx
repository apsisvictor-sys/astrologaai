/**
 * Synastry Chart Wheel Component
 * US-19: Synastry Chart Generation
 * 
 * Renders a dual-wheel synastry chart with:
 * - Outer wheel: User's chart
 * - Inner wheel: Partner's chart
 * - Inter-planetary aspect lines with color coding
 * - Tooltips for aspect interpretations
 * 
 * Design: Follows 06-ux-ui-design.md specifications
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';

// Design system colors - exact from spec
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  // Synastry aspect colors from spec
  harmonious1: '#22D3EE', // cyan
  harmonious2: '#10B981', // green
  challenging1: '#F97316', // orange
  challenging2: '#EF4444', // red
};

// Zodiac signs in order
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Zodiac symbols
const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
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

// Aspect colors based on nature
const ASPECT_NATURE_COLORS: Record<string, { harmonious: string; challenging: string; neutral: string }> = {
  default: {
    harmonious: colors.harmonious1,
    challenging: colors.challenging1,
    neutral: colors.primary,
  },
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

interface InterPlanetaryAspect {
  userPlanet: string;
  userSign: string;
  userDegree: number;
  partnerPlanet: string;
  partnerSign: string;
  partnerDegree: number;
  aspect: string;
  aspectBg: string;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  interpretation: {
    en: string;
    bg: string;
  };
}

interface SynastryChartWheelProps {
  userChart: Record<string, PlanetPosition>;
  partnerChart: Record<string, PlanetPosition>;
  interAspects: InterPlanetaryAspect[];
  userName?: string;
  partnerName?: string;
  size?: number;
  language?: 'en' | 'bg';
  showAspects?: boolean;
  onAspectClick?: (aspect: InterPlanetaryAspect) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

export default function SynastryChartWheel({
  userChart,
  partnerChart,
  interAspects,
  userName = 'You',
  partnerName = 'Partner',
  size = 600,
  language = 'bg',
  showAspects = true,
  onAspectClick,
}: SynastryChartWheelProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [hoveredAspect, setHoveredAspect] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const isBulgarian = language === 'bg';
  const center = size / 2;
  const outerRadius = size / 2 - 20;
  const userZodiacRadius = outerRadius - 25;
  const userPlanetRadius = outerRadius - 65;
  const partnerZodiacRadius = outerRadius - 100;
  const partnerPlanetRadius = outerRadius - 140;
  const innerRadius = outerRadius - 180;

  // Get sign index
  const getSignIndex = (sign: string): number => ZODIAC_SIGNS.indexOf(sign);

  // Calculate absolute degree from sign + degree
  const getAbsoluteDegree = (sign: string, degree: number): number => {
    const signIndex = getSignIndex(sign);
    return signIndex >= 0 ? signIndex * 30 + degree : degree;
  };

  // Convert degree to SVG coordinates
  const degreeToCoords = useCallback((degree: number, radius: number) => {
    const angle = ((degree - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }, [center]);

  // Get aspect color based on nature
  const getAspectColor = (nature: string): string => {
    switch (nature) {
      case 'harmonious':
        return colors.harmonious1;
      case 'challenging':
        return colors.challenging1;
      default:
        return colors.primary;
    }
  };

  // Get all planets from chart
  const getPlanets = (chart: Record<string, PlanetPosition>): PlanetPosition[] => {
    const planetNames = ['sun', 'moon', 'rising', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northNode', 'southNode', 'chiron'];
    return planetNames
      .map(name => chart[name])
      .filter(Boolean);
  };

  const userPlanets = getPlanets(userChart);
  const partnerPlanets = getPlanets(partnerChart);

  // Show tooltip for aspect
  const showAspectTooltip = (e: React.MouseEvent, aspect: InterPlanetaryAspect) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const userSymbol = PLANET_SYMBOLS[aspect.userPlanet] || aspect.userPlanet;
    const partnerSymbol = PLANET_SYMBOLS[aspect.partnerPlanet] || aspect.partnerPlanet;

    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      content: (
        <div className="p-3 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{userSymbol}</span>
            <span style={{ color: colors.textSecondary }}>—</span>
            <span className="text-xl">{partnerSymbol}</span>
            <span 
              className="ml-2 px-2 py-0.5 rounded text-sm"
              style={{ 
                background: `${getAspectColor(aspect.nature)}20`,
                color: getAspectColor(aspect.nature),
              }}
            >
              {isBulgarian ? aspect.aspectBg : aspect.aspect}
            </span>
          </div>
          <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>
            {isBulgarian ? 'Орб:' : 'Orb:'} {aspect.orb.toFixed(1)}°
          </div>
          <div className="text-sm" style={{ color: colors.textPrimary }}>
            {isBulgarian ? aspect.interpretation.bg : aspect.interpretation.en}
          </div>
        </div>
      ),
    });
  };

  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: null });
    setHoveredAspect(null);
  };

  // Render zodiac wheel segment
  const renderZodiacWheel = (radius: number, innerR: number, isOuter: boolean) => {
    const elements = [];

    for (let i = 0; i < 12; i++) {
      const startAngle = i * 30 - 90;
      const endAngle = startAngle + 30;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      const x3 = center + innerR * Math.cos(endRad);
      const y3 = center + innerR * Math.sin(endRad);
      const x4 = center + innerR * Math.cos(startRad);
      const y4 = center + innerR * Math.sin(startRad);

      // Element colors
      const sign = ZODIAC_SIGNS[i];
      let fillColor = 'transparent';
      if (['Aries', 'Leo', 'Sagittarius'].includes(sign)) fillColor = 'rgba(239, 68, 68, 0.08)';
      else if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) fillColor = 'rgba(16, 185, 129, 0.08)';
      else if (['Gemini', 'Libra', 'Aquarius'].includes(sign)) fillColor = 'rgba(59, 130, 246, 0.08)';
      else if (['Cancer', 'Scorpio', 'Pisces'].includes(sign)) fillColor = 'rgba(6, 182, 212, 0.08)';

      const path = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;

      elements.push(
        <path
          key={`zodiac-${isOuter ? 'outer' : 'inner'}-${i}`}
          d={path}
          fill={fillColor}
          stroke={colors.border}
          strokeWidth={0.5}
        />
      );

      // Zodiac symbol
      const symbolAngle = ((i * 30 + 15 - 90) * Math.PI) / 180;
      const symbolRadius = (radius + innerR) / 2;
      const symbolX = center + symbolRadius * Math.cos(symbolAngle);
      const symbolY = center + symbolRadius * Math.sin(symbolAngle);

      elements.push(
        <text
          key={`symbol-${isOuter ? 'outer' : 'inner'}-${i}`}
          x={symbolX}
          y={symbolY}
          fill={isOuter ? colors.textPrimary : colors.textSecondary}
          fontSize={isOuter ? 14 : 11}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          {ZODIAC_SYMBOLS[ZODIAC_SIGNS[i]]}
        </text>
      );
    }

    return elements;
  };

  // Render planets
  const renderPlanets = (planets: PlanetPosition[], radius: number, isUser: boolean) => {
    return planets.map((planet) => {
      const degree = getAbsoluteDegree(planet.sign, planet.degree);
      const coords = degreeToCoords(degree, radius);
      const aspectKey = isUser ? `${planet.name}-partner` : `user-${planet.name}`;
      const isHovered = hoveredAspect?.includes(planet.name);

      return (
        <g
          key={`planet-${isUser ? 'user' : 'partner'}-${planet.name}`}
          transform={`translate(${coords.x}, ${coords.y})`}
          style={{ cursor: 'pointer' }}
        >
          {isHovered && (
            <circle r="14" fill={isUser ? colors.primary : colors.secondary} opacity={0.3} />
          )}
          <circle
            r="11"
            fill={colors.surface}
            stroke={isUser ? colors.primary : colors.secondary}
            strokeWidth={1.5}
          />
          <text
            fill={isUser ? colors.textPrimary : colors.textSecondary}
            fontSize="11"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {PLANET_SYMBOLS[planet.name]}
          </text>
          {planet.retrograde && (
            <text x="8" y="-6" fill={colors.secondary} fontSize="7" fontWeight="bold">R</text>
          )}
        </g>
      );
    });
  };

  // Render inter-planetary aspect lines
  const renderAspectLines = () => {
    if (!showAspects || !interAspects) return null;

    // Filter to show only tighter aspects (lower orb)
    const significantAspects = interAspects.filter(a => a.orb < 6);

    return significantAspects.map((aspect, index) => {
      const userPlanet = userPlanets.find(p => p.name === aspect.userPlanet);
      const partnerPlanet = partnerPlanets.find(p => p.name === aspect.partnerPlanet);

      if (!userPlanet || !partnerPlanet) return null;

      const userDegree = getAbsoluteDegree(userPlanet.sign, userPlanet.degree);
      const partnerDegree = getAbsoluteDegree(partnerPlanet.sign, partnerPlanet.degree);

      const userCoords = degreeToCoords(userDegree, userPlanetRadius);
      const partnerCoords = degreeToCoords(partnerDegree, partnerPlanetRadius);

      const aspectKey = `${aspect.userPlanet}-${aspect.partnerPlanet}`;
      const isHovered = hoveredAspect === aspectKey;
      const color = getAspectColor(aspect.nature);

      return (
        <line
          key={`aspect-${index}`}
          x1={userCoords.x}
          y1={userCoords.y}
          x2={partnerCoords.x}
          y2={partnerCoords.y}
          stroke={color}
          strokeWidth={isHovered ? 2.5 : 1}
          opacity={isHovered ? 1 : 0.4}
          strokeDasharray={aspect.nature === 'challenging' ? '6,4' : 'none'}
          onMouseEnter={(e) => {
            setHoveredAspect(aspectKey);
            showAspectTooltip(e, aspect);
          }}
          onMouseLeave={hideTooltip}
          onClick={() => onAspectClick?.(aspect)}
          style={{ cursor: 'pointer' }}
        />
      );
    });
  };

  // Render center info
  const renderCenter = () => {
    return (
      <g transform={`translate(${center}, ${center})`}>
        <circle
          r={innerRadius - 5}
          fill={colors.background}
          stroke={colors.border}
          strokeWidth={1}
        />
        
        {/* User info */}
        <text
          y={-25}
          fill={colors.primary}
          fontSize="11"
          textAnchor="middle"
          fontWeight="bold"
        >
          {userName}
        </text>
        <text
          y={-10}
          fill={colors.textSecondary}
          fontSize="10"
          textAnchor="middle"
        >
          {PLANET_SYMBOLS.sun} {isBulgarian ? userChart.sun?.signBg : userChart.sun?.sign}
        </text>
        <text
          y={3}
          fill={colors.textSecondary}
          fontSize="10"
          textAnchor="middle"
        >
          {PLANET_SYMBOLS.moon} {isBulgarian ? userChart.moon?.signBg : userChart.moon?.sign}
        </text>

        {/* Divider */}
        <line
          x1={-20}
          y1={18}
          x2={20}
          y2={18}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Partner info */}
        <text
          y={35}
          fill={colors.secondary}
          fontSize="11"
          textAnchor="middle"
          fontWeight="bold"
        >
          {partnerName}
        </text>
        <text
          y={48}
          fill={colors.textSecondary}
          fontSize="10"
          textAnchor="middle"
        >
          {PLANET_SYMBOLS.sun} {isBulgarian ? partnerChart.sun?.signBg : partnerChart.sun?.sign}
        </text>
        <text
          y={61}
          fill={colors.textSecondary}
          fontSize="10"
          textAnchor="middle"
        >
          {PLANET_SYMBOLS.moon} {isBulgarian ? partnerChart.moon?.signBg : partnerChart.moon?.sign}
        </text>
      </g>
    );
  };

  return (
    <div className="relative inline-block">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ background: colors.background, borderRadius: '50%' }}
      >
        {/* Background */}
        <circle cx={center} cy={center} r={outerRadius} fill={colors.surface} />
        
        {/* User's chart (outer wheel) */}
        {renderZodiacWheel(outerRadius - 5, userZodiacRadius + 20, true)}
        {renderPlanets(userPlanets, userPlanetRadius, true)}
        
        {/* Partner's chart (inner wheel) */}
        {renderZodiacWheel(partnerZodiacRadius + 30, partnerZodiacRadius, false)}
        {renderPlanets(partnerPlanets, partnerPlanetRadius, false)}
        
        {/* Inter-planetary aspects */}
        {renderAspectLines()}
        
        {/* Center info */}
        {renderCenter()}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legend */}
      <div 
        className="mt-4 flex justify-center gap-6"
        style={{ color: colors.textSecondary }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-0.5"
            style={{ background: colors.harmonious1 }}
          />
          <span className="text-xs">{isBulgarian ? 'Хармонични' : 'Harmonious'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-0.5"
            style={{ 
              background: colors.challenging1,
              backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 3px, transparent 3px, transparent 5px)',
            }}
          />
          <span className="text-xs">{isBulgarian ? 'Предизвикателни' : 'Challenging'}</span>
        </div>
      </div>
    </div>
  );
}

export type { SynastryChartWheelProps, InterPlanetaryAspect, PlanetPosition };
