'use client';

import { motion } from 'framer-motion';

interface ElementsCardProps {
  elements: { fire: number; earth: number; air: number; water: number };
}

const ELEMENTS = [
  { key: 'fire'  as const, label: 'Fire',  icon: '🔥', color: '#FB923C', bg: '#FB923C15' },
  { key: 'earth' as const, label: 'Earth', icon: '🌿', color: '#34D399', bg: '#34D39915' },
  { key: 'air'   as const, label: 'Air',   icon: '💨', color: '#A78BFA', bg: '#A78BFA15' },
  { key: 'water' as const, label: 'Water', icon: '💧', color: '#38BDF8', bg: '#38BDF815' },
];

export function ElementsCard({ elements }: ElementsCardProps) {
  const total = Object.values(elements).reduce((a, b) => a + b, 0) || 1;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="px-4 pt-3 pb-3">
        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-3">Elements</p>
        <div className="space-y-2.5">
          {ELEMENTS.map((el, i) => {
            const val  = elements[el.key] ?? 0;
            const pct  = Math.round((val / total) * 100);

            return (
              <div key={el.key} className="flex items-center gap-2.5">
                <span className="text-sm w-4 shrink-0">{el.icon}</span>
                <span className="text-[11px] text-text-muted w-8 shrink-0">{el.label}</span>

                {/* Bar */}
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.1 * i + 0.3, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${el.color}60, ${el.color})`,
                      boxShadow: `0 0 6px ${el.color}40`,
                    }}
                  />
                </div>

                <span className="text-[11px] font-mono text-text-muted w-7 shrink-0 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
