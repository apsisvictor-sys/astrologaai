'use client';

import { motion } from 'framer-motion';

export function ToolIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'rgba(228,26,255,0.12)', border: '1px solid rgba(228,26,255,0.28)' }}
        >
          <span className="text-[9px] text-primary">✦</span>
        </div>
        <div
          className="flex gap-1 px-4 py-3 rounded-2xl rounded-tl-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
