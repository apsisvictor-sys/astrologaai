'use client';

import { motion } from 'framer-motion';

interface MoonPhaseCardProps {
  phase: string;
  phaseBg: string;
  illumination: number;
  sign?: string;
  signBg?: string;
  locale: string;
}

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

/**
 * Draw the lit portion of the moon as an SVG path.
 *
 * Waxing (right side lit):
 *   - Right semicircle: (0,-R)→(0,R) clockwise (sweep=1)
 *   - Terminator: crescent(<50%) bows LEFT (sweep=1), gibbous(>50%) bows RIGHT (sweep=0)
 *
 * Waning (left side lit):
 *   - Left semicircle: (0,-R)→(0,R) counter-clockwise (sweep=0)
 *   - Terminator: crescent(<50%) bows RIGHT (sweep=0), gibbous(>50%) bows LEFT (sweep=1)
 */
function getMoonPath(R: number, illumination: number, isWaxing: boolean): string {
  if (illumination >= 99) {
    // Full moon: two 180° arcs form a complete circle
    return `M 0 -${R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 -${R} Z`;
  }
  if (illumination <= 1) {
    return ''; // New moon: nothing lit
  }

  const angle = (illumination / 100) * Math.PI;
  const rx = (R * Math.abs(Math.cos(angle))).toFixed(3);

  if (isWaxing) {
    const termSweep = illumination <= 50 ? 1 : 0;
    return `M 0 -${R} A ${R} ${R} 0 0 1 0 ${R} A ${rx} ${R} 0 0 ${termSweep} 0 -${R} Z`;
  } else {
    const termSweep = illumination <= 50 ? 0 : 1;
    return `M 0 -${R} A ${R} ${R} 0 0 0 0 ${R} A ${rx} ${R} 0 0 ${termSweep} 0 -${R} Z`;
  }
}

export function MoonPhaseCard({ phase, phaseBg, illumination, sign, signBg, locale }: MoonPhaseCardProps) {
  const displayPhase = locale === 'bg' ? phaseBg : phase;
  const displaySign  = locale === 'bg' ? (signBg ?? '') : (sign ?? '');

  const isWaxing  = !phase.toLowerCase().includes('waning') && !phase.toLowerCase().includes('last');
  const isFullMoon = illumination >= 99;
  const isNewMoon  = illumination <= 1;

  const R = 44;
  const moonPath = getMoonPath(R, illumination, isWaxing);

  const ambientGlow = isFullMoon
    ? 'rgba(210,200,255,0.22)'
    : isNewMoon
    ? 'transparent'
    : 'rgba(160,150,220,0.12)';

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-3">
        Lunar Phase
      </p>

      <div className="flex items-center gap-4">
        {/* Moon SVG */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: R * 2 + 16, height: R * 2 + 16 }}>
          {/* Ambient glow behind moon */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${ambientGlow} 0%, transparent 70%)`,
              filter: 'blur(10px)',
              transform: 'scale(1.5)',
            }}
          />

          <motion.svg
            width={R * 2 + 16}
            height={R * 2 + 16}
            viewBox={`${-R - 8} ${-R - 8} ${(R + 8) * 2} ${(R + 8) * 2}`}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'backOut' }}
          >
            <defs>
              <filter id="moon-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="moon-lit" cx="38%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#f0eaff" />
                <stop offset="50%" stopColor="#c8c0e8" />
                <stop offset="100%" stopColor="#807098" />
              </radialGradient>
            </defs>

            {/* Dark disc (shadow side / base) */}
            <circle
              cx="0" cy="0" r={R}
              fill="#080016"
              stroke="rgba(140,130,200,0.18)"
              strokeWidth="0.75"
            />

            {/* Lit portion */}
            {moonPath && (
              <path
                d={moonPath}
                fill="url(#moon-lit)"
                filter="url(#moon-glow)"
              />
            )}

            {/* Full moon outer pulse ring */}
            {isFullMoon && (
              <motion.circle
                cx="0" cy="0" r={R + 4}
                fill="none"
                stroke="rgba(210,200,255,0.25)"
                strokeWidth="1.5"
                animate={{ r: [R + 3, R + 8, R + 3], opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.svg>
        </div>

        {/* Moon info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white mb-1 leading-tight">{displayPhase}</div>
          {(sign || signBg) && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-accent-cyan text-xs">{SIGN_SYMBOLS[sign ?? ''] ?? '☽'}</span>
              <span className="text-[11px] text-text-muted">in {displaySign}</span>
            </div>
          )}

          {/* Illumination bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[9px] uppercase tracking-widest text-text-muted">Illumination</span>
              <span className="text-[9px] font-mono text-white/50">{illumination}%</span>
            </div>
            <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${illumination}%` }}
                transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                style={{
                  background: 'linear-gradient(90deg, rgba(200,190,255,0.4) 0%, rgba(210,200,255,0.9) 100%)',
                  boxShadow: '0 0 6px rgba(200,190,255,0.4)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
