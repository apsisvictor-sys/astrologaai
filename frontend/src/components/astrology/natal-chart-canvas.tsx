'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface PlanetaryPosition {
  name: string;
  degree: number; // absolute 0–360
  sign: string;
  retrograde?: boolean;
  house?: number;
}

export interface NatalChartData {
  planets: PlanetaryPosition[];
  houses: number[]; // 12 house cusp degrees (absolute 0–360)
  ascendant: number;
}

interface NatalChartCanvasProps {
  data?: NatalChartData;
  size?: number;
}

// Fallback data
const DUMMY_DATA: NatalChartData = {
  planets: [
    { name: 'Sun',     degree: 45,  sign: 'Taurus' },
    { name: 'Moon',    degree: 180, sign: 'Libra' },
    { name: 'Mercury', degree: 52,  sign: 'Taurus' },
    { name: 'Venus',   degree: 15,  sign: 'Aries' },
    { name: 'Mars',    degree: 210, sign: 'Scorpio' },
    { name: 'Jupiter', degree: 330, sign: 'Pisces' },
    { name: 'Saturn',  degree: 120, sign: 'Leo' },
    { name: 'Uranus',  degree: 270, sign: 'Capricorn' },
    { name: 'Neptune', degree: 295, sign: 'Capricorn' },
    { name: 'Pluto',   degree: 230, sign: 'Scorpio' },
  ],
  houses: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
  ascendant: 0,
};

const ZODIAC_SIGNS = [
  { name: 'Aries',       symbol: '♈', color: '#FF6B35', element: 'fire'  },
  { name: 'Taurus',      symbol: '♉', color: '#10B981', element: 'earth' },
  { name: 'Gemini',      symbol: '♊', color: '#A78BFA', element: 'air'   },
  { name: 'Cancer',      symbol: '♋', color: '#38BDF8', element: 'water' },
  { name: 'Leo',         symbol: '♌', color: '#FBBF24', element: 'fire'  },
  { name: 'Virgo',       symbol: '♍', color: '#34D399', element: 'earth' },
  { name: 'Libra',       symbol: '♎', color: '#C084FC', element: 'air'   },
  { name: 'Scorpio',     symbol: '♏', color: '#60A5FA', element: 'water' },
  { name: 'Sagittarius', symbol: '♐', color: '#FB923C', element: 'fire'  },
  { name: 'Capricorn',   symbol: '♑', color: '#6EE7B7', element: 'earth' },
  { name: 'Aquarius',    symbol: '♒', color: '#818CF8', element: 'air'   },
  { name: 'Pisces',      symbol: '♓', color: '#67E8F9', element: 'water' },
];

const ELEMENT_FILL: Record<string, string> = {
  fire:  '#FF6B35',
  earth: '#10B981',
  air:   '#A78BFA',
  water: '#38BDF8',
};

const PLANET_SYMBOLS: Record<string, string> = {
  'Sun':        '☉',
  'Moon':       '☽',
  'Mercury':    '☿',
  'Venus':      '♀',
  'Mars':       '♂',
  'Jupiter':    '♃',
  'Saturn':     '♄',
  'Uranus':     '♅',
  'Neptune':    '♆',
  'Pluto':      '♇',
  'North Node': '☊',
  'South Node': '☋',
  'Chiron':     '⚷',
  'Lilith':     '⚸',
};

const PLANET_COLORS: Record<string, string> = {
  'Sun':        '#FBBF24',
  'Moon':       '#E2E8F0',
  'Mercury':    '#A78BFA',
  'Venus':      '#F472B6',
  'Mars':       '#EF4444',
  'Jupiter':    '#34D399',
  'Saturn':     '#9CA3AF',
  'Uranus':     '#38BDF8',
  'Neptune':    '#818CF8',
  'Pluto':      '#C084FC',
  'North Node': '#00f0ff',
  'South Node': '#00f0ff',
  'Chiron':     '#F9A8D4',
  'Lilith':     '#e41aff',
};

const ROMAN_NUMERALS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// Angular house indices and their labels/colors
const ANGULAR_AXES = [
  { index: 0, label: 'ASC', color: '#00f0ff' },
  { index: 3, label: 'IC',  color: '#F59E0B' },
  { index: 6, label: 'DSC', color: '#00f0ff' },
  { index: 9, label: 'MC',  color: '#F59E0B' },
];

const ASPECT_CONFIG: { name: string; degree: number; orb: number; color: string; opacity: number }[] = [
  { name: 'Conjunction', degree: 0,   orb: 8,  color: '#FBBF24', opacity: 0.5 },
  { name: 'Sextile',     degree: 60,  orb: 6,  color: '#34D399', opacity: 0.3 },
  { name: 'Square',      degree: 90,  orb: 8,  color: '#e41aff', opacity: 0.35 },
  { name: 'Trine',       degree: 120, orb: 8,  color: '#00f0ff', opacity: 0.35 },
  { name: 'Opposition',  degree: 180, orb: 8,  color: '#ff0080', opacity: 0.35 },
];

const degToRad = (d: number) => d * (Math.PI / 180);

const coord = (degree: number, radius: number, cx: number, cy: number) => {
  const adj = (180 - degree) % 360;
  const rad = degToRad(adj);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
};

// Arc path along a single ring (used for colored strips)
const zodiacArcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  const s = coord(end, r, cx, cy);
  const e = coord(start, r, cx, cy);
  const large = end - start <= 180 ? '0' : '1';
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
};

// Filled wedge between two radii for a degree range
function zodiacWedgePath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number,
): string {
  const oEnd   = coord(endDeg,   outerR, cx, cy);
  const oStart = coord(startDeg, outerR, cx, cy);
  const iStart = coord(startDeg, innerR, cx, cy);
  const iEnd   = coord(endDeg,   innerR, cx, cy);
  const diff   = endDeg - startDeg;
  const large  = diff <= 180 ? '0' : '1';
  return [
    `M ${oEnd.x} ${oEnd.y}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${oStart.x} ${oStart.y}`,
    `L ${iStart.x} ${iStart.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${iEnd.x} ${iEnd.y}`,
    'Z',
  ].join(' ');
}

function detectAspect(d1: number, d2: number) {
  const diff = Math.abs(d1 - d2);
  const dist = Math.min(diff, 360 - diff);
  return ASPECT_CONFIG.find((a) => Math.abs(dist - a.degree) <= a.orb) ?? null;
}

export function NatalChartCanvas({ data = DUMMY_DATA, size = 460 }: NatalChartCanvasProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const outerR  = (size / 2) * 0.90; // outer edge of zodiac ring
  const zodiacR = outerR - 34;       // inner edge of zodiac ring (34px wide band)
  const houseR  = zodiacR - 6;       // outer house boundary
  const planetR = houseR * 0.73;     // planet orbit radius
  const coreR   = houseR * 0.23;     // clear central space

  // Starfield — deterministic pseudo-random dots
  const stars = Array.from({ length: 40 }, (_, i) => {
    const angle  = (i * 137.508) % 360;
    const radius = coreR + 4 + ((i * 31) % (planetR - coreR - 8));
    return coord(angle, radius, cx, cy);
  });

  return (
    <div className="relative w-full aspect-square mx-auto" style={{ maxWidth: size }}>
      {/* Ambient glow behind the wheel */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(228,26,255,0.12) 0%, rgba(0,240,255,0.04) 50%, transparent 75%)',
          filter: 'blur(20px)',
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{ filter: 'drop-shadow(0 0 16px rgba(228,26,255,0.18))' }}
      >
        <defs>
          <filter id="glow-soft">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="bg-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1a0520" stopOpacity="1" />
            <stop offset="60%"  stopColor="#100315" stopOpacity="1" />
            <stop offset="100%" stopColor="#0a0010" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#e41aff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#e41aff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background disc */}
        <circle cx={cx} cy={cy} r={outerR} fill="url(#bg-gradient)" />
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(228,26,255,0.25)" strokeWidth="1" />

        {/* Layer 0: Starfield */}
        <g opacity={isVisible ? 1 : 0} style={{ transition: 'opacity 1.2s ease' }}>
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={s.x} cy={s.y}
              r={i % 5 === 0 ? 1.2 : 0.7}
              fill="white"
              opacity={0.12 + (i % 4) * 0.06}
            />
          ))}
        </g>

        {/* Layer 1: Zodiac ring */}
        <g opacity={isVisible ? 1 : 0} style={{ transition: 'opacity 0.8s ease 0.1s' }}>
          {/* Inner / outer ring borders */}
          <circle cx={cx} cy={cy} r={zodiacR} fill="none" stroke="rgba(228,26,255,0.18)" strokeWidth="0.75" />
          <circle cx={cx} cy={cy} r={outerR}  fill="none" stroke="rgba(228,26,255,0.22)" strokeWidth="0.75" />

          {ZODIAC_SIGNS.map((sign, i) => {
            const startDeg = i * 30;
            const endDeg   = startDeg + 30;
            const midDeg   = startDeg + 15;
            const textPos  = coord(midDeg, (outerR + zodiacR) / 2, cx, cy);
            const elemColor = ELEMENT_FILL[sign.element];

            return (
              <g key={sign.name}>
                {/* Element-colored wedge fill */}
                <path
                  d={zodiacWedgePath(cx, cy, zodiacR + 1, outerR - 1, startDeg, endDeg)}
                  fill={elemColor}
                  opacity="0.09"
                />

                {/* Colored accent arc on outer edge */}
                <path
                  d={zodiacArcPath(cx, cy, outerR - 2, startDeg, endDeg)}
                  fill="none"
                  stroke={sign.color}
                  strokeWidth="2.5"
                  opacity="0.35"
                  filter="url(#glow-soft)"
                />

                {/* Segment divider at each 30° boundary */}
                <line
                  x1={coord(startDeg, zodiacR, cx, cy).x}
                  y1={coord(startDeg, zodiacR, cx, cy).y}
                  x2={coord(startDeg, outerR,  cx, cy).x}
                  y2={coord(startDeg, outerR,  cx, cy).y}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="0.75"
                />

                {/* Degree tick marks at 10° and 20° within each sign */}
                {[10, 20].map((tick) => {
                  const tickDeg   = startDeg + tick;
                  const tickOuter = coord(tickDeg, outerR - 1,  cx, cy);
                  const tickInner = coord(tickDeg, outerR - 6,  cx, cy);
                  return (
                    <line
                      key={tick}
                      x1={tickOuter.x} y1={tickOuter.y}
                      x2={tickInner.x} y2={tickInner.y}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="0.75"
                    />
                  );
                })}

                {/* Sign symbol */}
                <text
                  x={textPos.x} y={textPos.y}
                  fill={sign.color}
                  fontSize="15"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  opacity="0.88"
                  className="select-none"
                >
                  {sign.symbol}
                </text>
              </g>
            );
          })}
        </g>

        {/* Layer 2: House lines */}
        <g opacity={isVisible ? 1 : 0} style={{ transition: 'opacity 0.8s ease 0.25s' }}>
          <circle cx={cx} cy={cy} r={houseR} fill="none" stroke="rgba(228,26,255,0.15)" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={coreR}  fill="none" stroke="rgba(228,26,255,0.2)"  strokeWidth="0.5" />

          {data.houses.map((houseDeg, i) => {
            const isAxis = i === 0 || i === 3 || i === 6 || i === 9;
            const from   = coord(houseDeg, zodiacR, cx, cy);
            const to     = coord(houseDeg, coreR,   cx, cy);

            const next = data.houses[(i + 1) % 12];
            let diff = next - houseDeg;
            if (diff < 0) diff += 360;
            const mid    = houseDeg + diff / 2;
            const numPos = coord(mid, (houseR + coreR) / 2, cx, cy);

            return (
              <g key={`house-${i}`}>
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isAxis ? '#e41aff' : 'rgba(228,26,255,0.3)'}
                  strokeWidth={isAxis ? '1.5' : '0.5'}
                  opacity={isAxis ? '0.9' : '0.5'}
                  filter={isAxis ? 'url(#glow-soft)' : undefined}
                />
                {/* Roman numeral house label */}
                <text
                  x={numPos.x} y={numPos.y}
                  fill="rgba(228,26,255,0.45)"
                  fontSize="9"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="select-none"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {ROMAN_NUMERALS[i]}
                </text>
              </g>
            );
          })}

          {/* Angular axis labels: ASC / IC / DSC / MC */}
          {ANGULAR_AXES.map(({ index, label, color }) => {
            const deg = data.houses[index];
            if (deg === undefined) return null;
            const pos = coord(deg, zodiacR - 10, cx, cy);
            return (
              <motion.text
                key={label}
                x={pos.x} y={pos.y}
                fill={color}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
                className="select-none"
                filter="url(#glow-soft)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {label}
              </motion.text>
            );
          })}
        </g>

        {/* Layer 3: Aspect lines */}
        <g opacity={isVisible ? 1 : 0} style={{ transition: 'opacity 0.9s ease 0.4s' }}>
          {data.planets.map((p1, i) =>
            data.planets.slice(i + 1).map((p2, j) => {
              const aspect = detectAspect(p1.degree, p2.degree);
              if (!aspect) return null;

              const isHovered = hoveredPlanet === p1.name || hoveredPlanet === p2.name;
              const isDimmed  = hoveredPlanet !== null && !isHovered;

              const pos1 = coord(p1.degree, planetR * 0.95, cx, cy);
              const pos2 = coord(p2.degree, planetR * 0.95, cx, cy);

              return (
                <line
                  key={`asp-${i}-${j}`}
                  x1={pos1.x} y1={pos1.y}
                  x2={pos2.x} y2={pos2.y}
                  stroke={aspect.color}
                  strokeWidth={isHovered ? 2 : 0.8}
                  opacity={isDimmed ? 0.03 : isHovered ? 0.85 : aspect.opacity}
                  filter={isHovered ? 'url(#glow-strong)' : undefined}
                  style={{ transition: 'opacity 0.25s, stroke-width 0.25s' }}
                />
              );
            })
          )}
        </g>

        {/* Layer 4: Planets */}
        <g>
          {data.planets.map((planet, i) => {
            const { x, y }  = coord(planet.degree, planetR, cx, cy);
            const isHovered = hoveredPlanet === planet.name;
            const isDimmed  = hoveredPlanet !== null && !isHovered;
            const color     = PLANET_COLORS[planet.name] || '#FFF';
            const symbol    = PLANET_SYMBOLS[planet.name] || planet.name[0];

            return (
              <motion.g
                key={planet.name}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: isDimmed ? 0.2 : 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.07, ease: 'backOut' }}
                onMouseEnter={() => setHoveredPlanet(planet.name)}
                onMouseLeave={() => setHoveredPlanet(null)}
                onTouchStart={() => setHoveredPlanet(planet.name)}
                onTouchEnd={() => setTimeout(() => setHoveredPlanet(null), 1200)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hit area */}
                <circle cx={x} cy={y} r={18} fill="transparent" />

                {/* Outer glow halo */}
                <circle
                  cx={x} cy={y}
                  r={isHovered ? 14 : 10}
                  fill={color}
                  opacity={isHovered ? 0.55 : 0.2}
                  filter={isHovered ? 'url(#glow-strong)' : 'url(#glow-soft)'}
                  style={{ transition: 'r 0.2s, opacity 0.2s' }}
                />

                {/* Planet symbol */}
                <text
                  x={x} y={y + 0.5}
                  fill={isHovered ? '#fff' : color}
                  fontSize={isHovered ? '13' : '11'}
                  fontWeight="500"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="select-none pointer-events-none"
                  style={{ transition: 'font-size 0.2s' }}
                >
                  {symbol}
                </text>

                {/* Retrograde indicator */}
                {planet.retrograde && (
                  <text
                    x={x + 8} y={y - 7}
                    fill={color}
                    fontSize="7"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                    opacity="0.9"
                  >
                    ℛ
                  </text>
                )}

                {/* Hover tooltip */}
                {isHovered && (
                  <g className="pointer-events-none">
                    <rect
                      x={x - 52} y={y - 52}
                      width="104" height="32"
                      rx="6"
                      fill="#0D0010"
                      stroke={color}
                      strokeWidth="0.8"
                      opacity="0.96"
                    />
                    <text x={x} y={y - 42} fill="#fff" fontSize="10" fontWeight="600" textAnchor="middle">
                      {planet.name}{planet.retrograde ? ' ℛ' : ''}
                    </text>
                    <text x={x} y={y - 28} fill={color} fontSize="9" textAnchor="middle" opacity="0.85">
                      {(planet.degree % 30).toFixed(1)}° {planet.sign}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </g>

        {/* Central core */}
        <circle cx={cx} cy={cy} r={coreR - 1} fill="url(#center-glow)" />
        <motion.circle
          cx={cx} cy={cy} r={5}
          fill="#e41aff"
          filter="url(#glow-soft)"
          opacity="0.7"
          animate={{ r: [4, 6, 4], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={cx} cy={cy} r={2} fill="#fff" />
      </svg>
    </div>
  );
}
