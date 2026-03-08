'use client';

import { motion } from 'framer-motion';

interface LockedSectionProps {
  children: React.ReactNode;
  onUpgrade: () => void;
  featureName?: string;
  description?: string;
}

export function LockedSection({
  children,
  onUpgrade,
  featureName = 'Planetary Transits',
  description = 'See which planets are forming aspects to your natal chart right now, and what it means for you today.',
}: LockedSectionProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred preview — shows the content behind the lock */}
      <div
        style={{
          filter: 'blur(7px)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.65,
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{
          background: 'linear-gradient(to bottom, rgba(13,0,16,0.6) 0%, rgba(13,0,16,0.85) 100%)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Lock icon */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{
            background: 'rgba(228,26,255,0.08)',
            border: '1px solid rgba(228,26,255,0.25)',
            boxShadow: '0 0 20px rgba(228,26,255,0.15)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="#e41aff" strokeWidth="1.5" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#e41aff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* PRO badge */}
        <div
          className="text-[9px] uppercase tracking-[0.15em] font-bold px-3 py-1 rounded-full mb-3"
          style={{
            background: 'rgba(245,158,11,0.12)',
            color: '#F59E0B',
            border: '1px solid rgba(245,158,11,0.28)',
          }}
        >
          PRO Feature
        </div>

        <h3 className="text-base font-bold text-white mb-1.5">Unlock {featureName}</h3>
        <p className="text-xs text-text-muted mb-5 max-w-[220px] leading-relaxed">{description}</p>

        <motion.button
          onClick={onUpgrade}
          whileTap={{ scale: 0.96 }}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          Upgrade to PRO
        </motion.button>
      </div>
    </div>
  );
}
