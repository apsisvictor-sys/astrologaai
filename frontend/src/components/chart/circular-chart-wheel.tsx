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

import React, { useState, useRef, useCallback, useEffect } from 'react';

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

// Roman numerals for house labels
const ROMAN_NUMERALS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// Premium 3-letter zodiac abbreviations (replace cartoonish Unicode glyphs)
const ZODIAC_ABBREV: Record<string, string> = {
  Aries: 'ARI', Taurus: 'TAU', Gemini: 'GEM', Cancer: 'CAN',
  Leo: 'LEO', Virgo: 'VIR', Libra: 'LIB', Scorpio: 'SCO',
  Sagittarius: 'SAG', Capricorn: 'CAP', Aquarius: 'AQU', Pisces: 'PIS',
};

// Aspect colors — trine gets magenta (beautiful, common); conjunction gets gold (visible even when short)
const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#FFD580',   // gold — fusion of energies, powerful
  sextile: '#10B981',       // green — opportunity, ease
  square: '#ff0080',        // hot pink — tension, growth through friction
  trine: '#e41aff',         // magenta — flowing harmony, appears often
  opposition: '#00f0ff',    // cyan — polarity, need for balance
  quincunx: '#F59E0B',      // amber — awkward adjustment
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
  const [animPhase, setAnimPhase] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Phased entrance animation: chart assembles over ~2.5s
  useEffect(() => {
    const t1 = setTimeout(() => setAnimPhase(1), 80);   // SVG appears + zodiac ring
    const t2 = setTimeout(() => setAnimPhase(2), 550);  // house lines
    const t3 = setTimeout(() => setAnimPhase(3), 1000); // planets materialize
    const t4 = setTimeout(() => setAnimPhase(4), 1600); // aspect lines draw in
    const t5 = setTimeout(() => setAnimPhase(5), 2200); // center eye + breathing starts
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);
  
  const isBulgarian = language === 'bg';
  const center = size / 2;
  const outerRadius = size / 2 - 20;
  const zodiacRadius = outerRadius - 30;
  const houseRadius = outerRadius - 70;
  const planetOuterRing = outerRadius - 55;
  const planetInnerRing = outerRadius - 90;
  const innerRadius = outerRadius - 170;

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

  // Get sign index from sign name
  const getSignIndex = (sign: string): number => {
    return ZODIAC_SIGNS.indexOf(sign);
  };

  // Calculate absolute degree from sign + degree within sign
  const getAbsoluteDegree = (sign: string, degree: number): number => {
    const signIndex = getSignIndex(sign);
    return signIndex * 30 + degree;
  };

  // ASC ecliptic degree (0–360): determines chart orientation
  // ASC must sit at 9 o'clock; houses and zodiac run counter-clockwise
  const ascDegree = chart.rising
    ? getAbsoluteDegree(chart.rising.sign, chart.rising.degree)
    : 0;

  // Convert ecliptic degree to SVG coordinates
  // ASC sits at 9 o'clock (180°); zodiac runs counter-clockwise
  // (increasing ecliptic degree → decreasing SVG angle)
  const degreeToCoords = useCallback((degree: number, radius: number) => {
    const angleDeg = ((ascDegree - degree + 180) % 360 + 360) % 360;
    const angle = (angleDeg * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }, [center, ascDegree]);

  // Dual-ring planet placement: planets within MIN_PLANET_SEP degrees go to inner ring
  const MIN_PLANET_SEP = 10;
  const circularDiff = (a: number, b: number): number => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };
  const planetRingMap: Record<string, number> = (() => {
    const map: Record<string, number> = {};
    const outerSlots: number[] = [];
    const sorted = [...planets].sort((a, b) =>
      getAbsoluteDegree(a.sign, a.degree) - getAbsoluteDegree(b.sign, b.degree)
    );
    for (const p of sorted) {
      const deg = getAbsoluteDegree(p.sign, p.degree);
      const tooClose = outerSlots.some(d => circularDiff(d, deg) < MIN_PLANET_SEP);
      if (!tooClose) {
        outerSlots.push(deg);
        map[p.name] = planetOuterRing;
      } else {
        map[p.name] = planetInnerRing;
      }
    }
    return map;
  })();
  
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
  // Signs run counter-clockwise; each sign's start edge is at its ecliptic degree
  // converted via the ASC-relative formula
  const renderZodiacWheel = () => {
    const elements = [];

    for (let i = 0; i < 12; i++) {
      const startEcliptic = i * 30;
      const endEcliptic   = (i + 1) * 30;

      // SVG angle: higher ecliptic → lower SVG angle (counter-clockwise on screen)
      const startSVGdeg = ((ascDegree - startEcliptic + 180) % 360 + 360) % 360;
      const endSVGdeg   = ((ascDegree - endEcliptic   + 180) % 360 + 360) % 360;
      const startRad = (startSVGdeg * Math.PI) / 180;
      const endRad   = (endSVGdeg   * Math.PI) / 180;

      const x1 = center + outerRadius  * Math.cos(startRad);
      const y1 = center + outerRadius  * Math.sin(startRad);
      const x2 = center + outerRadius  * Math.cos(endRad);
      const y2 = center + outerRadius  * Math.sin(endRad);
      const x3 = center + zodiacRadius * Math.cos(endRad);
      const y3 = center + zodiacRadius * Math.sin(endRad);
      const x4 = center + zodiacRadius * Math.cos(startRad);
      const y4 = center + zodiacRadius * Math.sin(startRad);

      // Determine element color
      const sign = ZODIAC_SIGNS[i];
      let fillColor = 'transparent';
      if (['Aries', 'Leo', 'Sagittarius'].includes(sign))      fillColor = 'rgba(251,191,36,0.1)';
      else if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) fillColor = 'rgba(16,185,129,0.1)';
      else if (['Gemini', 'Libra', 'Aquarius'].includes(sign))  fillColor = 'rgba(167,139,250,0.1)';
      else if (['Cancer', 'Scorpio', 'Pisces'].includes(sign))  fillColor = 'rgba(0,240,255,0.1)';

      // Outer arc: CCW (sweep=0); inner return arc: CW (sweep=1)
      const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${zodiacRadius} ${zodiacRadius} 0 0 1 ${x4} ${y4} Z`;

      elements.push(
        <path
          key={`zodiac-${i}`}
          d={path}
          fill={fillColor}
          stroke={colors.border}
          strokeWidth={1}
        />
      );

      // Symbol at mid-point of each sign
      const midEcliptic = startEcliptic + 15;
      const midSVGdeg = ((ascDegree - midEcliptic + 180) % 360 + 360) % 360;
      const symbolRad = (midSVGdeg * Math.PI) / 180;
      const symbolRadius = (outerRadius + zodiacRadius) / 2;
      const symbolX = center + symbolRadius * Math.cos(symbolRad);
      const symbolY = center + symbolRadius * Math.sin(symbolRad);

      elements.push(
        <text
          key={`symbol-${i}`}
          x={symbolX}
          y={symbolY}
          fill="rgba(255,255,255,0.7)"
          fontSize="7.5"
          fontWeight="600"
          letterSpacing="0.8"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none', fontFamily: 'system-ui, sans-serif' }}
        >
          {ZODIAC_ABBREV[ZODIAC_SIGNS[i]]}
        </text>
      );
    }

    return (
      <g style={{ opacity: animPhase >= 1 ? 1 : 0, transition: 'opacity 0.9s ease' }}>
        {elements}
      </g>
    );
  };

  // Render house cusps
  const renderHouses = () => {
    const elements = [];
    
    // Draw house lines
    for (let i = 0; i < 12; i++) {
      const house = chart.houses[i];
      if (!house) continue;
      
      const degree = getAbsoluteDegree(house.sign, house.degree);
      const angleDeg = ((ascDegree - degree + 180) % 360 + 360) % 360;
      const angle = (angleDeg * Math.PI) / 180;

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

      // House number: 15° into the house (counter-clockwise = +15° ecliptic)
      // Placed close to the center circle
      const numAngleDeg = ((ascDegree - (degree + 15) + 180) % 360 + 360) % 360;
      const numAngle = (numAngleDeg * Math.PI) / 180;
      const numRadius = innerRadius + 22;
      const numX = center + numRadius * Math.cos(numAngle);
      const numY = center + numRadius * Math.sin(numAngle);

      elements.push(
        <text
          key={`house-num-${i}`}
          x={numX}
          y={numY}
          fill="rgba(255,255,255,0.35)"
          fontSize="9"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          {ROMAN_NUMERALS[i]}
        </text>
      );
    }

    return (
      <g style={{ opacity: animPhase >= 2 ? 1 : 0, transition: 'opacity 0.7s ease 0.1s' }}>
        {elements}
      </g>
    );
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
      
      const coords1 = degreeToCoords(degree1, planetRingMap[aspect.planet1] ?? planetOuterRing);
      const coords2 = degreeToCoords(degree2, planetRingMap[aspect.planet2] ?? planetOuterRing);
      
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      const isHighlighted = selectedAspect === aspectKey;
      const isHovered = hoveredPlanet === aspect.planet1 || hoveredPlanet === aspect.planet2;
      const isChallenging = aspect.nature === 'challenging';
      const delay = `${index * 0.07}s`;

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
          strokeDasharray={isChallenging ? '5,5' : animPhase >= 4 ? '10000' : '10000'}
          strokeDashoffset={!isChallenging && animPhase >= 4 ? 0 : (!isChallenging ? 10000 : undefined)}
          onClick={() => setSelectedAspect(selectedAspect === aspectKey ? null : aspectKey)}
          style={{
            cursor: 'pointer',
            opacity: animPhase >= 4 ? (isHighlighted || isHovered ? 1 : 0.3) : 0,
            transition: isChallenging
              ? `opacity 0.5s ease ${delay}`
              : `opacity 0.5s ease ${delay}, stroke-dashoffset 1.2s ease ${delay}`,
          }}
        />
      );
    });
  };
  
  // Render planets
  const renderPlanets = () => {
    return planets.map((planet, index) => {
      const degree = getAbsoluteDegree(planet.sign, planet.degree);
      const ring = planetRingMap[planet.name] ?? planetOuterRing;
      const coords = degreeToCoords(degree, ring);
      const isHovered = hoveredPlanet === planet.name;
      const delay = `${index * 0.055}s`;

      return (
        <g
          key={`planet-${planet.name}`}
          transform={`translate(${coords.x}, ${coords.y})`}
          onMouseEnter={(e) => showTooltip(e, planet)}
          onMouseLeave={hideTooltip}
          onClick={() => onPlanetClick?.(planet)}
          style={{
            cursor: 'pointer',
            opacity: animPhase >= 3 ? 1 : 0,
            transition: `opacity 0.45s ease ${delay}`,
          }}
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
  
  // Render center — oracle eye
  const renderCenter = () => {
    const r = innerRadius - 8;
    // Scale oracle eye smaller — about 40% of circle diameter
    const eyeScale = r * 0.022;
    return (
      <g
        transform={`translate(${center}, ${center})`}
        style={{ opacity: animPhase >= 2 ? 1 : 0, transition: 'opacity 0.6s ease 0.2s' }}
      >
        {/* Inner circle — purple gradient matching features page */}
        <circle
          r={r}
          fill="url(#centerCircleBg)"
          stroke="rgba(228,26,255,0.3)"
          strokeWidth={1}
        />
        {/* Subtle inner glow ring */}
        <circle
          r={r * 0.65}
          fill="none"
          stroke="rgba(228,26,255,0.06)"
          strokeWidth={r * 0.5}
        />
        {/* Oracle eye — phase-gated, centered at (0,0), scaled */}
        <g
          transform={`scale(${eyeScale}) translate(-22, -14)`}
          style={{
            opacity: animPhase >= 5 ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          {/* Outer eye shape */}
          <path
            d="M2 14 C8 2 36 2 42 14 C36 26 8 26 2 14Z"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Iris — breathing animation starts with phase 5 */}
          <circle
            cx="22" cy="14" r="7"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.2"
            fill="none"
            className={animPhase >= 5 ? 'eye-iris' : ''}
          />
          {/* Pupil */}
          <circle
            cx="22" cy="14" r="3.5"
            fill="url(#oracleEyePupil)"
            className={animPhase >= 5 ? 'eye-pupil' : ''}
          />
          {/* Orbital arc */}
          <path
            d="M15 14 A7 7 0 0 1 22 7"
            stroke="rgba(228,26,255,0.7)"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
          />
          {/* Star glints */}
          <circle cx="10" cy="9" r="0.8" fill="white" opacity="0.6" />
          <circle cx="34" cy="19" r="0.6" fill="white" opacity="0.5" />
          <circle cx="30" cy="8" r="0.5" fill="rgba(0,240,255,0.9)" />
        </g>
      </g>
    );
  };

  return (
    <div className="relative w-full h-full" style={{ aspectRatio: '1 / 1' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{
          background: colors.background,
          borderRadius: '50%',
          display: 'block',
          opacity: animPhase >= 1 ? 1 : 0,
          transform: `scale(${animPhase >= 1 ? 1 : 0.88})`,
          transition: 'opacity 0.7s ease, transform 1s cubic-bezier(0.34, 1.4, 0.64, 1)',
        }}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill={colors.surface}
        />
        
        <defs>
          <style>{`
            @keyframes eyeIrisBreathe {
              0%, 100% { stroke-opacity: 0.45; }
              50% { stroke-opacity: 1; filter: drop-shadow(0 0 4px rgba(228,26,255,0.9)); }
            }
            @keyframes eyePupilPulse {
              0%, 100% { opacity: 0.75; }
              50% { opacity: 1; }
            }
            .eye-iris { animation: eyeIrisBreathe 2.8s ease-in-out infinite; }
            .eye-pupil { animation: eyePupilPulse 2.8s ease-in-out infinite; }
          `}</style>
          <radialGradient id="oracleEyePupil" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#e41aff" />
            <stop offset="100%" stopColor="#00f0ff" />
          </radialGradient>
          <radialGradient id="centerCircleBg" cx="38%" cy="35%">
            <stop offset="0%" stopColor="#2d0038" />
            <stop offset="55%" stopColor="#0D0010" />
            <stop offset="100%" stopColor="#1a0b1c" />
          </radialGradient>
        </defs>

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
