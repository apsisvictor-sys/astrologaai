'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { BestDay, ratingColor } from './day-cell';

const AREA_CONFIG = [
  { key: 'love' as const,   emoji: '❤️', label: 'Love' },
  { key: 'career' as const, emoji: '💼', label: 'Career' },
  { key: 'health' as const, emoji: '🏃', label: 'Health' },
  { key: 'money' as const,  emoji: '💰', label: 'Money' },
];

const PLANET_COLORS: Record<string, string> = {
  Sun: '#FBBF24', Moon: '#94A3B8', Mercury: '#A78BFA',
  Venus: '#F472B6', Mars: '#EF4444', Jupiter: '#F59E0B',
  Saturn: '#6B7280', Uranus: '#06B6D4', Neptune: '#3B82F6', Pluto: '#8B5CF6',
};

function ratingLabel(r: number): string {
  if (r >= 4.5) return 'Excellent';
  if (r >= 3.5) return 'Good';
  if (r >= 2.5) return 'Mixed';
  if (r >= 1.5) return 'Challenging';
  return 'Difficult';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function RatingBar({ rating }: { rating: number | null }) {
  const filled = Math.round(rating ?? 0);
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-all"
          style={{ background: i <= filled ? ratingColor(filled) : 'rgba(255,255,255,0.08)' }}
        />
      ))}
    </div>
  );
}

interface DayDetailPanelProps {
  day: BestDay | null;
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  onClose: () => void;
}

export function DayDetailPanel({ day, tier, onClose }: DayDetailPanelProps) {
  const showTransits = tier !== 'FREE';
  const showOracle = tier === 'PREMIUM';
  const visibleAreas = tier === 'FREE' ? AREA_CONFIG.slice(0, 2) : AREA_CONFIG;

  const panelContent = day ? (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-0.5">
            {formatDate(day.date)}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: ratingColor(day.composite) }}>
              {day.composite !== null ? ratingLabel(day.composite) : 'Unknown'}
            </span>
            {day.composite !== null && (
              <span className="text-xs text-text-muted">({day.composite.toFixed(1)} / 5)</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-white transition-colors shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Area breakdown */}
      <div className="flex flex-col gap-3">
        {visibleAreas.map(({ key, emoji, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">{emoji}</span>
                <span className="text-xs font-medium text-text-secondary">{label}</span>
              </div>
              <span className="text-[10px] font-bold" style={{ color: ratingColor(day[key]) }}>
                {day[key] !== null ? ratingLabel(day[key]!) : '—'}
              </span>
            </div>
            <RatingBar rating={day[key]} />
          </div>
        ))}

        {/* FREE: locked areas teaser */}
        {tier === 'FREE' && (
          <div
            className="rounded-xl p-3 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-sm leading-none">🏃</span>
            <span className="text-sm leading-none">💰</span>
            <span className="text-xs text-text-muted flex-1">Health &amp; Money with PRO</span>
            <Link
              href="/pricing"
              className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{
                background: 'rgba(228,26,255,0.12)',
                color: '#e41aff',
                border: '1px solid rgba(228,26,255,0.25)',
              }}
            >
              Upgrade
            </Link>
          </div>
        )}
      </div>

      {/* Key transits */}
      {showTransits && day.transits && day.transits.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-2">
            Key Transits
          </p>
          <div className="flex flex-col gap-1.5">
            {day.transits.map((t, i) => {
              const color = PLANET_COLORS[t.planet] || '#94A3B8';
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}35`,
                      color,
                    }}
                  >
                    {t.planet.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 leading-snug">
                      {t.planet} {t.aspect} {t.natalPlanet}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">{t.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Oracle commentary (PREMIUM) */}
      {showOracle && day.oracleCommentary && (
        <div
          className="rounded-xl p-3.5"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(228,26,255,0.05))',
            border: '1px solid rgba(139,92,246,0.20)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3" style={{ color: '#8B5CF6' }} />
            <span
              className="text-[10px] uppercase tracking-[0.15em] font-bold"
              style={{ color: '#8B5CF6' }}
            >
              Oracle
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{day.oracleCommentary}</p>
        </div>
      )}

      {/* PRO upgrade CTA for free users (transits upsell) */}
      {!showTransits && (
        <Link
          href="/pricing"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80"
          style={{
            background: 'linear-gradient(135deg, rgba(228,26,255,0.25), rgba(228,26,255,0.10))',
            border: '1px solid rgba(228,26,255,0.28)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Unlock transits &amp; full forecast — PRO
        </Link>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* Mobile: bottom sheet */}
      <AnimatePresence>
        {day && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 pb-10 overflow-y-auto max-h-[80vh]"
              style={{
                background: 'rgba(10,0,16,0.97)',
                border: '1px solid rgba(228,26,255,0.15)',
                borderBottom: 'none',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
              {panelContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop: side panel */}
      <AnimatePresence>
        {day && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="hidden md:block w-72 lg:w-80 shrink-0 rounded-2xl p-4 self-start sticky top-4 overflow-y-auto max-h-[calc(100vh-6rem)]"
            style={{
              background: 'rgba(10,0,16,0.85)',
              border: '1px solid rgba(228,26,255,0.15)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
