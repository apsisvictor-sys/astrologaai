'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OracleAvatar } from './oracle-avatar';
import { VisitorChat } from './visitor-chat';
import { InputOval } from '@/components/ui/input-oval';
import { useRouter } from '@/i18n/navigation';

const QUICK_PROMPTS = ['Daily Horoscope', 'Birth Chart Analysis', 'Love Compatibility'];

export function OracleHero() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const router = useRouter();

  if (showRegisterPrompt) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel glow-primary p-8 rounded-3xl text-center max-w-md mx-auto"
      >
        <div
          className="w-14 h-14 mx-auto mb-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center"
          style={{ boxShadow: '0 0 20px rgba(228,26,255,0.3)' }}
        >
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px #e41aff)' }}>✦</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Your chart is ready.</h2>
        <p className="text-text-secondary text-sm mb-7 leading-relaxed">
          Create your free account to save your chart, continue this conversation, and access your full cosmic blueprint.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/register')}
            className="gradient-button text-white font-bold py-3 px-8 rounded-full"
          >
            Create Free Account
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            View all plans
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* ── DORMANT STATE ── */
          <motion.div
            key="dormant"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <OracleAvatar />

            <motion.p
              className="text-text-muted text-sm mb-7"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              Peer into the cosmic void for your personalized astrological insights
            </motion.p>

            <div className="relative group max-w-md mx-auto">
              {/* Outer glow on focus */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent-pink/20 to-accent-cyan/20 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <InputOval
                placeholder="What does your future hold?"
                onFocus={() => setIsExpanded(true)}
                onClick={() => setIsExpanded(true)}
                readOnly
                className="cursor-pointer relative"
              />
            </div>

            {/* Quick-action chips — from oracle_home_v1 */}
            <div className="flex justify-center gap-3 mt-5 flex-wrap">
              {QUICK_PROMPTS.map((label) => (
                <button
                  key={label}
                  onClick={() => setIsExpanded(true)}
                  className="px-4 py-2 rounded-full text-[11px] text-text-muted hover:text-white transition-all border border-white/8 hover:border-primary/30 hover:bg-primary/5"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── EXPANDED CHAT STATE ── */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 64 }}
            animate={{ opacity: 1, height: 540 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(228,26,255,0.2)',
              boxShadow: '0 0 40px rgba(228,26,255,0.12)',
              minHeight: 480,
            }}
          >
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-[10px] text-primary">✦</span>
              </div>
              <span className="text-sm font-semibold text-white">The Oracle</span>
              <span className="ml-auto text-[10px] uppercase tracking-widest text-text-muted">AI Astrologer</span>
            </div>

            <VisitorChat onRegisterPrompt={() => setShowRegisterPrompt(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
