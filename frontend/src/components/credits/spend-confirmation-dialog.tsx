'use client';

/**
 * SpendConfirmationDialog
 * PIX-128 — "This costs X credits. You have Y. Proceed?"
 *
 * Shown before debiting credits for a premium action.
 * If balance < cost, renders InsufficientCreditsState instead.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CREDIT_COSTS, CreditAction } from '@/lib/credits-api';
import { trackCreditsSpent } from '@/lib/analytics';

/** Human-readable labels for each credit action */
const ACTION_LABELS: Record<CreditAction, { label: string; icon: string }> = {
  oracle_sonnet:  { label: 'Oracle conversation (Sonnet)', icon: '✦' },
  oracle_opus:    { label: 'Oracle conversation (Opus)',   icon: '✦' },
  solar_return:   { label: 'Solar Return reading',         icon: '☀' },
  lunar_return:   { label: 'Lunar Return reading',         icon: '☽' },
  synastry:       { label: 'Synastry compatibility report',icon: '♡' },
  natal_pdf:      { label: 'Natal chart PDF export',       icon: '◉' },
};

interface SpendConfirmationDialogProps {
  isOpen: boolean;
  action: CreditAction;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
  onGetCredits: () => void;
}

export function SpendConfirmationDialog({
  isOpen,
  action,
  balance,
  onConfirm,
  onCancel,
  onGetCredits,
}: SpendConfirmationDialogProps) {
  const cost = CREDIT_COSTS[action];
  const { label, icon } = ACTION_LABELS[action];
  const hasEnough = balance >= cost;
  const remaining = balance - cost;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="spend-dialog-title"
            className="fixed z-50 inset-x-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm top-1/2 -translate-y-1/2 rounded-3xl p-6"
            style={{
              background: 'rgba(18,6,20,0.98)',
              backdropFilter: 'blur(20px)',
              border: hasEnough
                ? '1px solid rgba(0,240,255,0.2)'
                : '1px solid rgba(228,26,255,0.25)',
              boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 24px rgba(228,26,255,0.08)',
            }}
          >
            {/* Feature icon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto"
              style={{
                background: hasEnough
                  ? 'rgba(0,240,255,0.10)'
                  : 'rgba(228,26,255,0.10)',
                border: hasEnough
                  ? '1px solid rgba(0,240,255,0.2)'
                  : '1px solid rgba(228,26,255,0.2)',
              }}
              aria-hidden="true"
            >
              {icon}
            </div>

            <h3
              id="spend-dialog-title"
              className="text-base font-bold text-white text-center mb-1"
            >
              {label}
            </h3>

            {hasEnough ? (
              <>
                {/* Cost info */}
                <p className="text-sm text-white/55 text-center mb-5">
                  This uses{' '}
                  <span className="font-bold" style={{ color: '#00f0ff' }}>
                    {cost} credit{cost !== 1 ? 's' : ''}
                  </span>
                  . You have{' '}
                  <span className="font-semibold text-white">{balance}</span>.
                </p>

                {/* Balance after */}
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-5 text-sm"
                  style={{
                    background: 'rgba(0,240,255,0.05)',
                    border: '1px solid rgba(0,240,255,0.12)',
                  }}
                >
                  <span className="text-white/50">Balance after</span>
                  <span className="font-bold" style={{ color: '#00f0ff' }}>
                    ✦ {remaining} credit{remaining !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5">
                  <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white/50 hover:text-white transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { trackCreditsSpent({ action, cost, balanceAfter: remaining }); onConfirm(); }}
                    className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:brightness-110"
                    style={{
                      background: 'linear-gradient(135deg, #00d4e8, #00f0ff)',
                      boxShadow: '0 0 16px rgba(0,240,255,0.3)',
                    }}
                  >
                    Use {cost} credit{cost !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            ) : (
              /* Not enough credits */
              <>
                <p className="text-sm text-white/55 text-center mb-5">
                  You need{' '}
                  <span className="font-bold" style={{ color: '#e41aff' }}>
                    {cost} credit{cost !== 1 ? 's' : ''}
                  </span>{' '}
                  but only have{' '}
                  <span className="font-semibold text-white">{balance}</span>.
                </p>

                <button
                  onClick={onGetCredits}
                  className="w-full py-3 rounded-full text-sm font-bold text-white mb-2.5 transition-all hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
                    backgroundSize: '200% 200%',
                    boxShadow: '0 0 20px rgba(228,26,255,0.25)',
                  }}
                >
                  Get Credits
                </button>
                <button
                  onClick={onCancel}
                  className="w-full py-2 rounded-full text-xs font-medium text-white/35 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
