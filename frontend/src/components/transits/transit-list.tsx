'use client';

import { motion } from 'framer-motion';

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀',
  Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅',
  Neptune: '♆', Pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
  Sun: '#FBBF24', Moon: '#CBD5E1', Mercury: '#A78BFA', Venus: '#F472B6',
  Mars: '#EF4444', Jupiter: '#F59E0B', Saturn: '#6B7280',
  Uranus: '#06B6D4', Neptune: '#3B82F6', Pluto: '#8B5CF6',
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const ASPECT_STYLES: Record<string, { color: string; symbol: string; label: string }> = {
  conjunction: { color: '#FBBF24', symbol: '☌', label: 'Conj' },
  sextile:     { color: '#34D399', symbol: '⚹', label: 'Sext' },
  square:      { color: '#e41aff', symbol: '□', label: 'Sq'   },
  trine:       { color: '#00f0ff', symbol: '△', label: 'Trine'},
  opposition:  { color: '#ff0080', symbol: '☍', label: 'Opp'  },
};

function getAspectStyle(name: string) {
  const key = name.toLowerCase().replace(/\s+/g, '');
  return ASPECT_STYLES[key] ?? { color: '#9CA3AF', symbol: '◦', label: name.slice(0, 4) };
}

const ROMAN_NUMERALS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const toRoman = (n: number) => ROMAN_NUMERALS[n - 1] ?? String(n);

interface Transit {
  planet: string;
  planetBg: string;
  sign: string;
  signBg: string;
  degree: number;
  house?: number; // computed client-side from natal house cusps
  aspectToNatal?: {
    natalPlanet: string;
    aspect: string;
    aspectBg: string;
    orb: number;
    influence: 'positive' | 'challenging' | 'neutral';
    description: string;
  };
}

interface TransitListProps {
  transits: Transit[];
  locale: string;
}

export function TransitList({ transits, locale }: TransitListProps) {
  if (!transits.length) {
    return (
      <p className="text-xs text-text-muted px-1 py-4 text-center">No active transits found.</p>
    );
  }

  return (
    <div className="space-y-2">
      {transits.map((transit, i) => {
        const pName  = locale === 'bg' ? transit.planetBg : transit.planet;
        const sName  = locale === 'bg' ? transit.signBg   : transit.sign;
        const pColor = PLANET_COLORS[transit.planet] ?? '#e41aff';
        const pSym   = PLANET_SYMBOLS[transit.planet] ?? transit.planet.charAt(0);
        const sSym   = SIGN_SYMBOLS[transit.sign] ?? '';

        const asp = transit.aspectToNatal;
        const aspStyle = asp ? getAspectStyle(asp.aspect) : null;
        const influenceColor = asp?.influence === 'positive'
          ? '#34D399'
          : asp?.influence === 'challenging'
          ? '#e41aff'
          : '#64748B';

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i + 0.15 }}
            className="group rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Top row: planet circle + planet-in-sign */}
            <div className="flex items-center gap-3">
              {/* Planet symbol circle */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                style={{
                  background: `${pColor}18`,
                  border: `1px solid ${pColor}38`,
                  color: pColor,
                  boxShadow: `0 0 10px ${pColor}20`,
                }}
              >
                {pSym}
              </div>

              {/* Right of planet */}
              <div className="flex-1 min-w-0">
                {/* "Planet in Sign Degree · House X" line */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-white">{pName}</span>
                  <span className="text-xs text-text-muted">in</span>
                  <span className="text-xs text-accent-cyan">{sSym}</span>
                  <span className="text-xs text-white/70">{sName}</span>
                  <span className="text-[10px] font-mono text-text-muted">{transit.degree}°</span>
                  {transit.house && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(228,26,255,0.1)', color: 'rgba(228,26,255,0.7)', border: '1px solid rgba(228,26,255,0.2)' }}
                    >
                      H.{toRoman(transit.house)}
                    </span>
                  )}
                </div>

                {/* Aspect row */}
                {asp && aspStyle && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {/* Aspect badge */}
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{
                        background: `${aspStyle.color}20`,
                        color: aspStyle.color,
                        border: `1px solid ${aspStyle.color}35`,
                      }}
                    >
                      {aspStyle.symbol}
                    </span>
                    <span className="text-[10px] text-text-muted">{aspStyle.label}</span>
                    <span className="text-[10px] text-white/50">{asp.natalPlanet}</span>
                    <span className="text-[10px] font-mono text-text-muted ml-auto">{asp.orb.toFixed(1)}°</span>
                    {/* Influence dot */}
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: influenceColor }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {asp?.description && (
              <p className="text-[11px] text-text-muted leading-relaxed mt-2 ml-12 opacity-60 group-hover:opacity-100 transition-opacity">
                {asp.description}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
