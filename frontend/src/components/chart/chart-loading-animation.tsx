'use client';

import { motion } from 'framer-motion';

export function ChartLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 select-none">
      {/* Animated rings */}
      <div className="relative w-44 h-44 mb-8">
        {/* Outer ring — slow clockwise */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(228,26,255,0.25)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          {/* Dot on outer ring */}
          <div
            className="absolute w-2 h-2 rounded-full"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) translateY(-71px)',
              background: '#e41aff',
              boxShadow: '0 0 8px #e41aff',
            }}
          />
        </motion.div>

        {/* Middle ring — counter-clockwise */}
        <motion.div
          className="absolute inset-6 rounded-full"
          style={{ border: '1px solid rgba(0,240,255,0.2)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) translateY(-44px)',
              background: '#00f0ff',
              boxShadow: '0 0 6px #00f0ff',
            }}
          />
        </motion.div>

        {/* Inner ring — slow clockwise */}
        <motion.div
          className="absolute inset-12 rounded-full"
          style={{ border: '1px solid rgba(228,26,255,0.3)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Ambient radial glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.1) 0%, transparent 65%)', filter: 'blur(8px)' }}
        />

        {/* Center ✦ */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-2xl"
            style={{ color: '#e41aff', filter: 'drop-shadow(0 0 10px #e41aff)' }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✦
          </motion.span>
        </div>
      </div>

      {/* Text */}
      <p className="text-xs uppercase tracking-widest text-text-muted mb-3">
        Calculating your cosmic blueprint
      </p>

      {/* Dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-primary/50"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </div>
    </div>
  );
}
