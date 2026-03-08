'use client';

import { motion } from 'framer-motion';

interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
  nature?: string;
}

interface AspectsSummaryProps {
  aspects: Aspect[];
}

const PLANET_SYMBOLS: Record<string, string> = {
  'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀',
  'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '♅',
  'Neptune': '♆', 'Pluto': '♇', 'North Node': '☊', 'South Node': '☋',
  'Chiron': '⚷', 'rising': '↑', 'ascendant': '↑',
};

const ASPECT_STYLES: Record<string, { color: string; symbol: string; label: string }> = {
  conjunction: { color: '#FBBF24', symbol: '☌', label: 'Conj' },
  sextile:     { color: '#34D399', symbol: '⚹', label: 'Sext' },
  square:      { color: '#e41aff', symbol: '□', label: 'Sq'   },
  trine:       { color: '#00f0ff', symbol: '△', label: 'Trine'},
  opposition:  { color: '#ff0080', symbol: '☍', label: 'Opp'  },
  quincunx:    { color: '#9CA3AF', symbol: 'Qx', label: 'Qx'  },
};

function getAspectStyle(aspectName: string) {
  const key = aspectName.toLowerCase().replace(/\s+/g, '');
  return ASPECT_STYLES[key] ?? { color: '#9CA3AF', symbol: '?', label: aspectName.slice(0, 4) };
}

function sym(name: string): string {
  const k = name.toLowerCase().replace(/\s+/g, '');
  return PLANET_SYMBOLS[name] ?? PLANET_SYMBOLS[k] ?? name[0];
}

export function AspectsSummary({ aspects }: AspectsSummaryProps) {
  const visible = aspects.slice(0, 12);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold">Key Aspects</p>
      </div>

      <div className="px-3 pb-3 space-y-1">
        {visible.map((asp, i) => {
          const style = getAspectStyle(asp.aspect);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.04 * i + 0.2 }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.03] transition-colors"
            >
              {/* Aspect symbol */}
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: `${style.color}15`, color: style.color, border: `1px solid ${style.color}30` }}
              >
                {style.symbol}
              </span>

              {/* Planets */}
              <span className="text-xs text-white font-medium w-5 shrink-0">{sym(asp.planet1)}</span>
              <span className="text-[10px] text-text-muted shrink-0">{style.label}</span>
              <span className="text-xs text-white font-medium flex-1">{sym(asp.planet2)}</span>

              {/* Orb */}
              <span className="text-[10px] font-mono text-text-muted shrink-0">
                {asp.orb.toFixed(1)}°
              </span>

              {/* Nature dot */}
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: asp.nature === 'harmonious'
                    ? '#34D399'
                    : asp.nature === 'challenging'
                    ? '#EF4444'
                    : '#9CA3AF',
                }}
              />
            </motion.div>
          );
        })}

        {aspects.length === 0 && (
          <p className="text-xs text-text-muted px-2 py-2">No significant aspects detected.</p>
        )}
      </div>
    </div>
  );
}
