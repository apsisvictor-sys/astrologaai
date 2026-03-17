'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CosmicSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function CosmicSpinner({ size = 'md', label, className }: CosmicSpinnerProps) {
  if (size === 'sm') {
    return (
      <span className={cn('relative inline-flex items-center justify-center w-5 h-5', className)}>
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(228,26,255,0.5)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <span
            className="absolute w-1 h-1 rounded-full"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) translateY(-8px)',
              background: '#e41aff',
              boxShadow: '0 0 4px #e41aff',
            }}
          />
        </motion.span>
        <motion.span
          style={{ color: '#e41aff', fontSize: '7px', lineHeight: 1 }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✦
        </motion.span>
      </span>
    );
  }

  if (size === 'md') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
        <div className="relative w-16 h-16">
          {/* Outer ring — clockwise */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: '1px solid rgba(228,26,255,0.25)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <div
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) translateY(-28px)',
                background: '#e41aff',
                boxShadow: '0 0 6px #e41aff',
              }}
            />
          </motion.div>
          {/* Middle ring — counter-clockwise */}
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{ border: '1px solid rgba(0,240,255,0.2)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          >
            <div
              className="absolute w-1 h-1 rounded-full"
              style={{
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) translateY(-18px)',
                background: '#00f0ff',
                boxShadow: '0 0 5px #00f0ff',
              }}
            />
          </motion.div>
          {/* Ambient glow */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.1) 0%, transparent 65%)', filter: 'blur(6px)' }}
          />
          {/* Center ✦ */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="text-base"
              style={{ color: '#e41aff', filter: 'drop-shadow(0 0 8px #e41aff)' }}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              ✦
            </motion.span>
          </div>
        </div>
        {label && (
          <p className="text-xs uppercase tracking-widest text-text-muted">{label}</p>
        )}
      </div>
    );
  }

  // lg — full page
  return (
    <div className={cn('flex flex-col items-center justify-center flex-1 py-20 select-none', className)}>
      <div className="relative w-44 h-44 mb-8">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(228,26,255,0.25)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
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
        {/* Middle ring */}
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
        {/* Inner ring */}
        <motion.div
          className="absolute inset-12 rounded-full"
          style={{ border: '1px solid rgba(228,26,255,0.3)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        {/* Ambient glow */}
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
      {label && (
        <p className="text-xs uppercase tracking-widest text-text-muted mb-3">{label}</p>
      )}
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

// Backward-compat alias — used in login/page and register/page as full-screen loader
export function Spinner({ className }: { className?: string }) {
  return <CosmicSpinner size="md" className={className} />;
}
