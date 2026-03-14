'use client';

import { motion } from 'framer-motion';
import { PlanetaryPosition } from '@/components/astrology/natal-chart-canvas';

const PLANET_SYMBOLS: Record<string, string> = {
  'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀',
  'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '♅',
  'Neptune': '♆', 'Pluto': '♇', 'North Node': '☊', 'South Node': '☋',
  'Chiron': '⚷', 'Lilith': '⚸',
};

const PLANET_COLORS: Record<string, string> = {
  'Sun': '#FBBF24', 'Moon': '#E2E8F0', 'Mercury': '#A78BFA', 'Venus': '#F472B6',
  'Mars': '#EF4444', 'Jupiter': '#34D399', 'Saturn': '#9CA3AF', 'Uranus': '#38BDF8',
  'Neptune': '#818CF8', 'Pluto': '#C084FC', 'North Node': '#00f0ff',
  'South Node': '#00f0ff', 'Chiron': '#F9A8D4', 'Lilith': '#e41aff',
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

function fmt(degree: number) {
  const d = Math.floor(degree % 30);
  const m = Math.floor(((degree % 30) - d) * 60);
  return `${d}°${m.toString().padStart(2, '0')}'`;
}

interface PlanetTableProps {
  planets: PlanetaryPosition[];
}

export function PlanetTable({ planets }: PlanetTableProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold">Planetary Positions</p>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
        {planets.map((planet, i) => {
          const color  = PLANET_COLORS[planet.name]  || '#fff';
          const symbol = PLANET_SYMBOLS[planet.name] || planet.name[0];
          const signSym = SIGN_SYMBOLS[planet.sign]  || '';

          return (
            <motion.div
              key={planet.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.03] transition-colors group"
              style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
            >
              {/* Symbol */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                style={{ background: `${color}12`, color, border: `1px solid ${color}30` }}
              >
                {symbol}
              </div>

              {/* Name */}
              <span className="text-xs text-text-secondary font-medium w-20 truncate group-hover:text-white transition-colors">
                {planet.name}
              </span>

              {/* Sign */}
              <div className="flex items-center gap-1 flex-1">
                <span className="text-sm" style={{ color: '#A78BFA' }}>{signSym}</span>
                <span className="text-xs text-text-muted">{planet.sign}</span>
              </div>

              {/* Degree */}
              <span className="text-[11px] text-text-muted font-mono shrink-0">{fmt(planet.degree)}</span>

              {/* House */}
              {planet.house && (
                <span className="text-[9px] font-mono shrink-0" style={{ color: 'rgba(228,26,255,0.6)' }}>H{planet.house}</span>
              )}

              {/* Retrograde */}
              {planet.retrograde && (
                <span className="text-[9px] font-bold shrink-0" style={{ color }}>ℛ</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
