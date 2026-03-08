'use client';

import { motion } from 'framer-motion';

interface BigThreeCardProps {
  sun:     { sign: string; degree: number };
  moon:    { sign: string; degree: number };
  rising?: { sign: string; degree: number };
}

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water',
  Leo: 'fire', Virgo: 'earth', Libra: 'air', Scorpio: 'water',
  Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water',
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: '#FB923C',
  earth: '#34D399',
  air: '#A78BFA',
  water: '#38BDF8',
};

function fmt(degree: number) {
  const d = Math.floor(degree % 30);
  const m = Math.floor(((degree % 30) - d) * 60);
  return `${d}°${m.toString().padStart(2, '0')}'`;
}

function PlanetPill({
  label, symbol, planetColor, sign, degree, delay,
}: {
  label: string; symbol: string; planetColor: string;
  sign: string; degree: number; delay: number;
}) {
  const signSymbol = SIGN_SYMBOLS[sign] ?? sign[0];
  const element    = SIGN_ELEMENTS[sign] ?? 'fire';
  const elemColor  = ELEMENT_COLORS[element];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl relative overflow-hidden group cursor-default"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${elemColor}22`,
      }}
    >
      {/* Element glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${elemColor}10 0%, transparent 70%)` }}
      />

      {/* Planet symbol */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-medium relative z-10"
        style={{
          background: `${planetColor}15`,
          border: `1px solid ${planetColor}40`,
          boxShadow: `0 0 12px ${planetColor}20`,
          color: planetColor,
        }}
      >
        {symbol}
      </div>

      {/* Label */}
      <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold relative z-10">
        {label}
      </span>

      {/* Sign */}
      <div className="flex items-center gap-1.5 relative z-10">
        <span style={{ color: elemColor }} className="text-lg">{signSymbol}</span>
        <span className="text-sm font-semibold text-white">{sign}</span>
      </div>

      {/* Degree */}
      <span className="text-[11px] text-text-muted font-mono relative z-10">{fmt(degree)}</span>
    </motion.div>
  );
}

export function BigThreeCard({ sun, moon, rising }: BigThreeCardProps) {
  return (
    <div
      className="rounded-2xl p-1 overflow-hidden"
      style={{ background: 'rgba(228,26,255,0.04)', border: '1px solid rgba(228,26,255,0.1)' }}
    >
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold">Personal Alignment</p>
        <h3 className="text-sm font-semibold text-white">The Big Three</h3>
      </div>
      <div className="flex gap-1 px-1 pb-1">
        <PlanetPill label="Sun"    symbol="☉" planetColor="#FBBF24" sign={sun.sign}          degree={sun.degree}          delay={0.1} />
        <PlanetPill label="Moon"   symbol="☽" planetColor="#E2E8F0" sign={moon.sign}         degree={moon.degree}         delay={0.2} />
        {rising
          ? <PlanetPill label="Rising" symbol="↑" planetColor="#00f0ff" sign={rising.sign} degree={rising.degree} delay={0.3} />
          : <div className="flex-1 flex items-center justify-center py-4 opacity-30 text-xs text-text-muted">Unknown</div>
        }
      </div>
    </div>
  );
}
