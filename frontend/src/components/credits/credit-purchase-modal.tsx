'use client';

/**
 * CreditPurchaseModal
 * PIX-128 — 3-tier credit pack selector with Stripe Checkout redirect.
 *
 * Design: dark glass panel, neon accents, bottom-sheet on mobile / centered on desktop.
 * "Popular" pack (10 credits) is pre-selected and visually elevated.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CREDIT_PACKS, CreditPackId, initiateCreditCheckout } from '@/lib/credits-api';
import { trackCreditsPurchased } from '@/lib/analytics';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optionally pre-select a specific pack */
  initialPack?: CreditPackId;
  /** If true shows BGN prices instead of EUR */
  useBgn?: boolean;
}

export function CreditPurchaseModal({
  isOpen,
  onClose,
  initialPack = 'popular',
  useBgn = false,
}: CreditPurchaseModalProps) {
  const [selectedPack, setSelectedPack] = useState<CreditPackId>(initialPack);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = CREDIT_PACKS.find((p) => p.id === selectedPack)!;

  async function handleCheckout() {
    setError(null);
    setIsCheckingOut(true);
    try {
      const { checkoutUrl } = await initiateCreditCheckout(
        selectedPack,
        useBgn ? 'BGN' : 'EUR'
      );
      trackCreditsPurchased({
        packId: selectedPack,
        credits: selected.credits,
        eurAmount: selected.priceEur,
      });
      window.location.href = checkoutUrl;
    } catch {
      setError('Payment could not be started. Please try again.');
      setIsCheckingOut(false);
    }
  }

  const price = (pack: typeof CREDIT_PACKS[0]) =>
    useBgn
      ? `${pack.priceBgn.toFixed(2)} BGN`
      : `€${pack.priceEur.toFixed(2)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full z-50 rounded-t-3xl md:rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(18,6,20,0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(228,26,255,0.18)',
              boxShadow: '0 0 60px rgba(228,26,255,0.15), 0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all text-xl leading-none"
              >
                ×
              </button>

              <p className="text-[11px] font-bold uppercase tracking-widest mb-1"
                style={{ color: 'rgba(0,240,255,0.6)' }}>
                ✦ Credits
              </p>
              <h2 className="text-xl font-bold text-white">Get Credits</h2>
              <p className="text-sm text-white/50 mt-0.5">
                One-time purchase · No subscription
              </p>
            </div>

            {/* Pack cards */}
            <div className="px-4 pb-2 flex flex-col gap-2.5">
              {CREDIT_PACKS.map((pack) => {
                const isSelected = pack.id === selectedPack;

                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    aria-pressed={isSelected}
                    className="relative w-full text-left rounded-2xl p-4 transition-all duration-200"
                    style={{
                      background: isSelected
                        ? pack.isPopular
                          ? 'rgba(228,26,255,0.10)'
                          : 'rgba(255,255,255,0.06)'
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected
                        ? pack.isPopular
                          ? '1.5px solid rgba(228,26,255,0.5)'
                          : '1.5px solid rgba(255,255,255,0.18)'
                        : '1px solid rgba(255,255,255,0.07)',
                      boxShadow: isSelected && pack.isPopular
                        ? '0 0 20px rgba(228,26,255,0.12)'
                        : undefined,
                    }}
                  >
                    {/* Popular badge */}
                    {pack.isPopular && (
                      <span
                        className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          background: 'linear-gradient(135deg, #ff0080, #e41aff)',
                          color: '#fff',
                        }}
                      >
                        Most popular
                      </span>
                    )}

                    {/* Savings badge */}
                    {pack.savingsPercent && !pack.isPopular && (
                      <span
                        className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          background: 'rgba(0,240,255,0.15)',
                          border: '1px solid rgba(0,240,255,0.3)',
                          color: '#00f0ff',
                        }}
                      >
                        Save {pack.savingsPercent}%
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      {/* Left: credit count + label */}
                      <div className="flex items-center gap-3">
                        {/* Selection indicator */}
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            borderColor: isSelected
                              ? pack.isPopular ? '#e41aff' : 'rgba(255,255,255,0.5)'
                              : 'rgba(255,255,255,0.2)',
                            background: isSelected
                              ? pack.isPopular ? '#e41aff' : 'rgba(255,255,255,0.15)'
                              : 'transparent',
                          }}
                        >
                          {isSelected && (
                            <span className="block w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className="text-2xl font-bold"
                              style={{ color: pack.isPopular ? '#e41aff' : '#fff' }}
                            >
                              {pack.credits}
                            </span>
                            <span className="text-sm text-white/50">credits</span>
                          </div>
                          <p className="text-xs text-white/40">
                            {pack.label} · {useBgn
                              ? `${(pack.priceBgn / pack.credits).toFixed(2)} BGN`
                              : `€${pack.pricePerCredit.toFixed(2)}`} each
                          </p>
                        </div>
                      </div>

                      {/* Right: price */}
                      <div className="text-right">
                        <span
                          className="text-lg font-bold"
                          style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)' }}
                        >
                          {price(pack)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <div className="px-4 pt-3 pb-6 md:pb-5">
              {error && (
                <p className="text-xs text-red-400 text-center mb-2">{error}</p>
              )}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full py-3.5 rounded-full font-bold text-white text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
                  backgroundSize: '200% 200%',
                  boxShadow: '0 0 24px rgba(228,26,255,0.3)',
                }}
              >
                {isCheckingOut
                  ? 'Redirecting to payment…'
                  : `Get ${selected.credits} credits for ${price(selected)}`}
              </button>

              <p className="text-center text-xs text-white/25 mt-2.5">
                Secured by Stripe · Credits never expire
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
