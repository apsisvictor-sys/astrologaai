'use client';

import { motion } from 'framer-motion';

export function OracleAvatar() {
  return (
    <motion.div
      className="relative w-52 h-52 md:w-64 md:h-64 mx-auto mb-8"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-primary/15 blur-[60px] animate-pulse-slow" />
      <div className="absolute inset-4 rounded-full bg-accent-cyan/10 blur-[40px]" />

      {/* Rotating orbit ring */}
      <motion.div
        className="absolute inset-3 rounded-full border border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div
            key={deg}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/50"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateY(-46px) translate(-50%, -50%)`,
            }}
          />
        ))}
      </motion.div>

      {/* Inner counter-rotating ring */}
      <motion.div
        className="absolute inset-8 rounded-full border border-accent-cyan/15"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />

      {/* Cosmic sphere — layered radial gradients with blend mode (from Stitch reference) */}
      <div className="absolute inset-6 rounded-full overflow-hidden border border-white/10 shadow-2xl shadow-primary/20">
        {/* Base dark */}
        <div className="absolute inset-0 bg-black rounded-full" />
        {/* Layered color gradients, mix-blend-mode screen */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-90"
          style={{ mixBlendMode: 'screen' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, #e41aff 0%, transparent 55%), radial-gradient(circle at 70% 70%, #00f0ff 0%, transparent 55%), radial-gradient(circle at 50% 50%, #ff0080 0%, transparent 40%)',
            }}
          />
        </motion.div>
        {/* Dark inner core for depth */}
        <div className="absolute inset-[30%] rounded-full bg-black blur-lg opacity-70" />
      </div>

      {/* Center glyph */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-3xl md:text-4xl select-none"
          style={{ filter: 'drop-shadow(0 0 14px #e41aff)' }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✦
        </motion.span>
      </div>

      {/* Ambient star particles */}
      {[
        { top: '12%', left: '18%', delay: 0 },
        { top: '78%', left: '72%', delay: 0.8 },
        { top: '20%', left: '82%', delay: 1.5 },
        { top: '68%', left: '15%', delay: 0.4 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/60"
          style={{ top: p.top, left: p.left }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </motion.div>
  );
}
