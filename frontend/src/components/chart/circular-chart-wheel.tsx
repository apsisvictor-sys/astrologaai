/**
 * Circular Natal Chart Wheel Component
 * US-12: View Natal Chart
 * 
 * Renders an interactive circular natal chart with:
 * - Zodiac signs wheel
 * - 12 houses
 * - Planet glyphs positioned by degree
 * - Aspect lines
 * - Hover tooltips
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';

// Design system colors (US-12 spec)
const colors = {
  background: '#0D0010',
  surface: '#130019',
  primary: '#e41aff',
  secondary: '#00f0ff',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: 'rgba(228,26,255,0.18)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Zodiac signs in order
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_SIGNS_BG = [
  'Овен', 'Телец', 'Близнаци', 'Рак', 'Лъв', 'Дева',
  'Везни', 'Скорпион', 'Стрелец', 'Козирог', 'Водолей', 'Риби'
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
  lilith: '⚹',
  rising: 'ASC',
};

// Planet descriptions (Bulgarian and English)
const PLANET_DESCRIPTIONS: Record<string, { en: string; bg: string }> = {
  sun: {
    en: 'Core identity, ego, vitality, and life purpose. Represents your conscious self.',
    bg: 'Основна идентичност, его, жизненост и житейска цел. Представлява вашето съзнателно аз.',
  },
  moon: {
    en: 'Emotions, instincts, subconscious, and inner self. Represents your emotional needs.',
    bg: 'Емоции, инстинкти, подсъзнание и вътрешно аз. Представлява вашите емоционални нужди.',
  },
  rising: {
    en: 'Outer personality, first impressions, and how others perceive you.',
    bg: 'Външна личност, първи впечатления и как ви възприемат другите.',
  },
  mercury: {
    en: 'Communication, thinking, learning, and intellectual expression.',
    bg: 'Комуникация, мислене, учене и интелектуално изразяване.',
  },
  venus: {
    en: 'Love, beauty, values, pleasure, and what you attract.',
    bg: 'Любов, красота, ценности, удоволствие и това, което привличате.',
  },
  mars: {
    en: 'Action, drive, energy, passion, and how you assert yourself.',
    bg: 'Действие, драйв, енергия, страст и как се утвърждавате.',
  },
  jupiter: {
    en: 'Expansion, growth, abundance, wisdom, and good fortune.',
    bg: 'Разширение, растеж, изобилие, мъдрост и късмет.',
  },
  saturn: {
    en: 'Discipline, responsibility, limitations, life lessons, and karma.',
    bg: 'Дисциплина, отговорност, ограничения, житейски уроци и карма.',
  },
  uranus: {
    en: 'Innovation, rebellion, sudden change, and breaking free from convention.',
    bg: 'Иновации, бунт, внезапна промяна и освобождаване от условности.',
  },
  neptune: {
    en: 'Dreams, intuition, spirituality, illusions, and the subconscious.',
    bg: 'Мечти, интуиция, духовност, илюзии и подсъзнание.',
  },
  pluto: {
    en: 'Transformation, power, death and rebirth, deep psychological change.',
    bg: 'Трансформация, власт, смърт и прераждане, дълбока психологическа промяна.',
  },
  northNode: {
    en: 'Karmic path forward, soul growth, and destiny direction.',
    bg: 'Кармичен път напред, духовен растеж и посока на съдбата.',
  },
  southNode: {
    en: 'Past lives, innate talents, comfort zone, and karmic baggage.',
    bg: 'Минали животи, вродени таланти, зона на комфорт и кармичен багаж.',
  },
  chiron: {
    en: 'Wounded healer, deepest wounds, and how you heal others.',
    bg: 'Раненият лечител, най-дълбоките рани и как лекувате другите.',
  },
};

// Aspect colors
const ASPECT_COLORS: Record<string, string> = {
  conjunction: colors.primary,
  sextile: colors.success,
  square: '#ff0080',
  trine: colors.secondary,
  opposition: '#ff6b6b',
  quincunx: colors.warning,
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
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
  calculatedAt?: string;
  source?: string;
}

interface CircularChartWheelProps {
  chart: NatalChart;
  size?: number;
  language?: 'en' | 'bg';
  showAspects?: boolean;
  onPlanetClick?: (planet: PlanetPosition) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

export default function CircularChartWheel({
  chart,
  size = 500,
  language = 'bg',
  showAspects = true,
  onPlanetClick,
}: CircularChartWheelProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const isBulgarian = language === 'bg';
  const center = size / 2;
  const outerRadius = size / 2 - 20;
  const zodiacRadius = outerRadius - 30;
  const houseRadius = outerRadius - 70;
  const planetRadius = outerRadius - 100;
  const innerRadius = outerRadius - 140;
  
  // Get all planets
  const planets: PlanetPosition[] = [
    chart.sun,
    chart.moon,
    chart.rising,
    chart.mercury,
    chart.venus,
    chart.mars,
    chart.jupiter,
    chart.saturn,
    chart.uranus,
    chart.neptune,
    chart.pluto,
    chart.northNode,
    chart.southNode,
    chart.chiron,
  ].filter(Boolean);
  
  // Convert degree to SVG coordinates
  const degreeToCoords = useCallback((degree: number, radius: number) => {
    // Rotate so Aries (0°) is at the left (9 o'clock position)
    const angle = ((degree - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }, [center]);
  
  // Get sign index from sign name
  const getSignIndex = (sign: string): number => {
    return ZODIAC_SIGNS.indexOf(sign);
  };
  
  // Calculate absolute degree from sign + degree within sign
  const getAbsoluteDegree = (sign: string, degree: number): number => {
    const signIndex = getSignIndex(sign);
    return signIndex * 30 + degree;
  };
  
  // Show tooltip
  const showTooltip = (e: React.MouseEvent, planet: PlanetPosition) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const description = PLANET_DESCRIPTIONS[planet.name] || { en: '', bg: '' };
    
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      content: (
        <div className="p-3 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{PLANET_SYMBOLS[planet.name]}</span>
            <span className="font-semibold" style={{ color: colors.textPrimary }}>
              {isBulgarian ? 
                planet.name.charAt(0).toUpperCase() + planet.name.slice(1) :
                planet.name.charAt(0).toUpperCase() + planet.name.slice(1)}
            </span>
            {planet.retrograde && (
              <span className="text-xs px-1.5 py-0.5 rounded" 
                style={{ background: `${colors.secondary}30`, color: colors.secondary }}>
                R
              </span>
            )}
          </div>
          <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>
            {isBulgarian ? planet.signBg : planet.sign} • {planet.degree.toFixed(1)}° • House {planet.house}
          </div>
          <div className="text-sm" style={{ color: colors.textSecondary }}>
            {isBulgarian ? description.bg : description.en}
          </div>
        </div>
      ),
    });
    setHoveredPlanet(planet.name);
  };
  
  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: null });
    setHoveredPlanet(null);
  };
  
  // Render zodiac wheel
  const renderZodiacWheel = () => {
    const elements = [];
    
    for (let i = 0; i < 12; i++) {
      const startAngle = i * 30 - 90;
      const endAngle = startAngle + 30;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calculate arc path
      const x1 = center + outerRadius * Math.cos(startRad);
      const y1 = center + outerRadius * Math.sin(startRad);
      const x2 = center + outerRadius * Math.cos(endRad);
      const y2 = center + outerRadius * Math.sin(endRad);
      const x3 = center + zodiacRadius * Math.cos(endRad);
      const y3 = center + zodiacRadius * Math.sin(endRad);
      const x4 = center + zodiacRadius * Math.cos(startRad);
      const y4 = center + zodiacRadius * Math.sin(startRad);
      
      // Determine element color
      const sign = ZODIAC_SIGNS[i];
      let fillColor = 'transparent';
      if (['Aries', 'Leo', 'Sagittarius'].includes(sign)) fillColor = 'rgba(251,191,36,0.1)';
      else if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) fillColor = 'rgba(16,185,129,0.1)';
      else if (['Gemini', 'Libra', 'Aquarius'].includes(sign)) fillColor = 'rgba(167,139,250,0.1)';
      else if (['Cancer', 'Scorpio', 'Pisces'].includes(sign)) fillColor = 'rgba(0,240,255,0.1)';
      
      const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${zodiacRadius} ${zodiacRadius} 0 0 0 ${x4} ${y4} Z`;
      
      elements.push(
        <path
          key={`zodiac-${i}`}
          d={path}
          fill={fillColor}
          stroke={colors.border}
          strokeWidth={1}
        />
      );
      
      // Add zodiac symbol
      const symbolAngle = ((i * 30 + 15 - 90) * Math.PI) / 180;
      const symbolRadius = (outerRadius + zodiacRadius) / 2;
      const symbolX = center + symbolRadius * Math.cos(symbolAngle);
      const symbolY = center + symbolRadius * Math.sin(symbolAngle);
      
      elements.push(
        <text
          key={`symbol-${i}`}
          x={symbolX}
          y={symbolY}
          fill={colors.textPrimary}
          fontSize="18"
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
  
  // Render house cusps
  const renderHouses = () => {
    const elements = [];
    
    // Draw house lines
    for (let i = 0; i < 12; i++) {
      const house = chart.houses[i];
      if (!house) continue;
      
      const degree = getAbsoluteDegree(house.sign, house.degree);
      const angle = ((degree - 90) * Math.PI) / 180;
      
      const x1 = center + houseRadius * Math.cos(angle);
      const y1 = center + houseRadius * Math.sin(angle);
      const x2 = center + innerRadius * Math.cos(angle);
      const y2 = center + innerRadius * Math.sin(angle);
      
      elements.push(
        <line
          key={`house-line-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={colors.border}
          strokeWidth={1}
        />
      );
      
      // House number
      const numAngle = ((degree + 15 - 90) * Math.PI) / 180;
      const numRadius = (houseRadius + innerRadius) / 2;
      const numX = center + numRadius * Math.cos(numAngle);
      const numY = center + numRadius * Math.sin(numAngle);
      
      elements.push(
        <text
          key={`house-num-${i}`}
          x={numX}
          y={numY}
          fill={colors.textSecondary}
          fontSize="12"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          {i + 1}
        </text>
      );
    }
    
    return elements;
  };
  
  // Render aspect lines
  const renderAspects = () => {
    if (!showAspects || !chart.aspects) return null;
    
    return chart.aspects.map((aspect, index) => {
      const planet1 = planets.find(p => p.name === aspect.planet1);
      const planet2 = planets.find(p => p.name === aspect.planet2);
      
      if (!planet1 || !planet2) return null;
      
      const degree1 = getAbsoluteDegree(planet1.sign, planet1.degree);
      const degree2 = getAbsoluteDegree(planet2.sign, planet2.degree);
      
      const coords1 = degreeToCoords(degree1, planetRadius);
      const coords2 = degreeToCoords(degree2, planetRadius);
      
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      const isHighlighted = selectedAspect === aspectKey;
      const isHovered = hoveredPlanet === aspect.planet1 || hoveredPlanet === aspect.planet2;
      
      return (
        <line
          key={`aspect-${index}`}
          x1={coords1.x}
          y1={coords1.y}
          x2={coords2.x}
          y2={coords2.y}
          stroke={ASPECT_COLORS[aspect.aspect] || colors.border}
          strokeWidth={isHighlighted || isHovered ? 2 : 1}
          opacity={isHighlighted || isHovered ? 1 : 0.3}
          strokeDasharray={aspect.nature === 'challenging' ? '5,5' : 'none'}
          onClick={() => setSelectedAspect(selectedAspect === aspectKey ? null : aspectKey)}
          style={{ cursor: 'pointer' }}
        />
      );
    });
  };
  
  // Render planets
  const renderPlanets = () => {
    return planets.map((planet) => {
      const degree = getAbsoluteDegree(planet.sign, planet.degree);
      const coords = degreeToCoords(degree, planetRadius);
      const isHovered = hoveredPlanet === planet.name;
      
      return (
        <g
          key={`planet-${planet.name}`}
          transform={`translate(${coords.x}, ${coords.y})`}
          onMouseEnter={(e) => showTooltip(e, planet)}
          onMouseLeave={hideTooltip}
          onClick={() => onPlanetClick?.(planet)}
          style={{ cursor: 'pointer' }}
        >
          {/* Planet glow on hover */}
          {isHovered && (
            <circle
              r="18"
              fill={colors.primary}
              opacity={0.3}
            />
          )}
          
          {/* Planet background */}
          <circle
            r="14"
            fill={colors.surface}
            stroke={planet.name === 'sun' || planet.name === 'moon' || planet.name === 'rising' 
              ? colors.primary 
              : colors.border}
            strokeWidth={2}
          />
          
          {/* Planet symbol */}
          <text
            fill={colors.textPrimary}
            fontSize="14"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {PLANET_SYMBOLS[planet.name]}
          </text>
          
          {/* Retrograde indicator */}
          {planet.retrograde && (
            <text
              x="10"
              y="-8"
              fill={colors.secondary}
              fontSize="8"
              fontWeight="bold"
            >
              R
            </text>
          )}
        </g>
      );
    });
  };
  
  // Render center info
  const renderCenter = () => {
    return (
      <g transform={`translate(${center}, ${center})`}>
        {/* Inner circle */}
        <circle
          r={innerRadius - 10}
          fill={colors.background}
          stroke={colors.border}
          strokeWidth={1}
        />
        
        {/* Sun/Moon/Rising summary */}
        <text
          y={-20}
          fill={colors.textPrimary}
          fontSize="12"
          textAnchor="middle"
          fontWeight="bold"
        >
          {PLANET_SYMBOLS.sun} {isBulgarian ? chart.sun.signBg : chart.sun.sign}
        </text>
        <text
          y={0}
          fill={colors.textSecondary}
          fontSize="11"
          textAnchor="middle"
        >
          {PLANET_SYMBOLS.moon} {isBulgarian ? chart.moon.signBg : chart.moon.sign}
        </text>
        <text
          y={20}
          fill={colors.textSecondary}
          fontSize="11"
          textAnchor="middle"
        >
          {PLANET_SYMBOLS.rising} {isBulgarian ? chart.rising.signBg : chart.rising.sign}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: '1 / 1', maxWidth: size }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{ background: colors.background, borderRadius: '50%', display: 'block' }}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill={colors.surface}
        />
        
        {/* Chart layers */}
        {renderZodiacWheel()}
        {renderHouses()}
        {renderAspects()}
        {renderPlanets()}
        {renderCenter()}
      </svg>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15,
            background: colors.background,
            border: '1px solid rgba(228,26,255,0.3)',
            borderRadius: '12px',
            boxShadow: '0 4px 30px rgba(228,26,255,0.15)',
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

export type { NatalChart, PlanetPosition, HouseCusp, Aspect };
