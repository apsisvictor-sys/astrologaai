'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
  nature?: string;
}

interface AspectGridProps {
  aspects: Aspect[];
  planets: string[];
  defaultExpanded?: boolean;
}

const PLANET_SYMBOLS: Record<string, string> = {
  'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀',
  'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '♅',
  'Neptune': '♆', 'Pluto': '♇', 'North Node': '☊', 'South Node': '☋',
  'Chiron': '⚷',
};

const ASPECT_STYLES: Record<string, { color: string; symbol: string }> = {
  conjunction: { color: '#FBBF24', symbol: '☌' },
  sextile:     { color: '#34D399', symbol: '⚹' },
  square:      { color: '#e41aff', symbol: '□' },
  trine:       { color: '#00f0ff', symbol: '△' },
  opposition:  { color: '#ff0080', symbol: '☍' },
  quincunx:    { color: '#9CA3AF', symbol: 'Qx' },
};

function getAspectStyle(aspectName: string) {
  const key = aspectName.toLowerCase().replace(/\s+/g, '');
  return ASPECT_STYLES[key] ?? null;
}

function sym(name: string): string {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return PLANET_SYMBOLS[name] ?? PLANET_SYMBOLS[cap] ?? name[0];
}

export function AspectGrid({ aspects, planets, defaultExpanded = false }: AspectGridProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Build O(1) lookup map keyed by lowercase: "planet1:planet2" -> Aspect
  const aspectMap = new Map<string, Aspect>();
  for (const asp of aspects) {
    const k1 = asp.planet1.toLowerCase();
    const k2 = asp.planet2.toLowerCase();
    aspectMap.set(`${k1}:${k2}`, asp);
    aspectMap.set(`${k2}:${k1}`, asp);
  }

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && typeof window !== 'undefined') {
      posthog.capture('aspect_grid_expanded');
    }
  }

  function handleMouseEnter(e: React.MouseEvent, asp: Aspect, style: { color: string; symbol: string }) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      text: `${sym(asp.planet1)} ${style.symbol} ${sym(asp.planet2)} • ${asp.orb.toFixed(1)}°`,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header / toggle button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold">Aspect Grid</p>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[10px] text-primary/40"
        >
          ▼
        </motion.span>
      </button>

      {/* Collapsible grid */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3 pb-3 overflow-x-auto">
              <table className="border-separate" style={{ borderSpacing: 2 }}>
                <thead>
                  <tr>
                    {/* Empty corner cell */}
                    <td className="w-5 h-5" />
                    {/* Column headers: planet symbols */}
                    {planets.map((p) => (
                      <td
                        key={p}
                        className="text-center text-[9px] sm:text-[11px] text-primary/40 font-bold select-none"
                        style={{ width: 20, height: 20, minWidth: 18 }}
                        title={p}
                      >
                        {sym(p)}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {planets.map((rowPlanet, rowIdx) => (
                    <tr key={rowPlanet}>
                      {/* Row header: planet symbol */}
                      <td
                        className="text-[9px] sm:text-[11px] text-primary/40 font-bold pr-1 select-none"
                        title={rowPlanet}
                      >
                        {sym(rowPlanet)}
                      </td>
                      {planets.map((colPlanet, colIdx) => {
                        // Upper triangle: skip (render empty)
                        if (colIdx > rowIdx) {
                          return <td key={colPlanet} />;
                        }

                        // Diagonal: self
                        if (colIdx === rowIdx) {
                          return (
                            <td
                              key={colPlanet}
                              className="text-center text-[9px] sm:text-[11px] text-primary/30 select-none"
                              style={{
                                width: 20, height: 20, minWidth: 18,
                                borderRadius: 4,
                              }}
                            >
                              ·
                            </td>
                          );
                        }

                        // Lower triangle: check for aspect (normalize to lowercase for lookup)
                        const asp = aspectMap.get(`${rowPlanet.toLowerCase()}:${colPlanet.toLowerCase()}`);
                        if (!asp) {
                          return (
                            <td
                              key={colPlanet}
                              style={{
                                width: 20, height: 20, minWidth: 18,
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: 4,
                              }}
                            />
                          );
                        }

                        const style = getAspectStyle(asp.aspect);
                        if (!style) {
                          return (
                            <td
                              key={colPlanet}
                              style={{
                                width: 20, height: 20, minWidth: 18,
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: 4,
                              }}
                            />
                          );
                        }

                        return (
                          <td
                            key={colPlanet}
                            className="text-center cursor-default select-none"
                            style={{
                              width: 20, height: 20, minWidth: 18,
                              fontSize: style.symbol.length > 1 ? 7 : 10,
                              background: `${style.color}10`,
                              border: `1px solid ${style.color}25`,
                              color: style.color,
                              borderRadius: 4,
                              fontWeight: 700,
                              lineHeight: '18px',
                            }}
                            onMouseEnter={(e) => handleMouseEnter(e, asp, style)}
                            onMouseLeave={handleMouseLeave}
                          >
                            {style.symbol}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip (fixed position) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 rounded-lg text-[11px] font-mono text-white whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(10,0,16,0.92)',
            border: '1px solid rgba(228,26,255,0.25)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
