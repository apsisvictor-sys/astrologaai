'use client';

/**
 * CreditBalanceIndicator
 * PIX-128 — Shows the user's current credit balance as a clickable chip.
 * Clicking opens the CreditPurchaseModal.
 *
 * Placement: sidebar user card (desktop) + bottom-nav settings area (mobile)
 */

import { useEffect, useState, useCallback } from 'react';
import { fetchCreditBalance } from '@/lib/credits-api';

interface CreditBalanceIndicatorProps {
  /** Called when the chip is clicked — parent controls modal visibility */
  onOpenPurchase: () => void;
  /** Optional: supply balance externally (skips internal fetch) */
  balance?: number;
  /** If true renders a compact single-line pill suitable for tight spaces */
  compact?: boolean;
}

export function CreditBalanceIndicator({
  onOpenPurchase,
  balance: externalBalance,
  compact = false,
}: CreditBalanceIndicatorProps) {
  const [balance, setBalance] = useState<number | null>(
    externalBalance !== undefined ? externalBalance : null
  );
  const [isLoading, setIsLoading] = useState(externalBalance === undefined);

  const loadBalance = useCallback(async () => {
    if (externalBalance !== undefined) return;
    setIsLoading(true);
    try {
      const data = await fetchCreditBalance();
      setBalance(data.balance);
    } catch {
      // Silently fail — credits are non-critical UI
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [externalBalance]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const displayBalance = balance ?? 0;

  if (compact) {
    return (
      <button
        onClick={onOpenPurchase}
        aria-label={`${displayBalance} credits — tap to buy more`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all hover:brightness-110 active:scale-95"
        style={{
          background: 'rgba(0,240,255,0.08)',
          border: '1px solid rgba(0,240,255,0.25)',
          color: '#00f0ff',
        }}
      >
        <span aria-hidden="true" className="text-[10px]">✦</span>
        {isLoading ? (
          <span className="opacity-50 animate-pulse">…</span>
        ) : (
          <span>{displayBalance}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onOpenPurchase}
      aria-label={`${displayBalance} credits — click to buy more`}
      className="flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all group hover:brightness-110 active:scale-95"
      style={{
        background: 'rgba(0,240,255,0.06)',
        border: '1px solid rgba(0,240,255,0.18)',
      }}
    >
      <div className="flex items-center gap-2">
        {/* Credit coin icon */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
          style={{ background: 'rgba(0,240,255,0.15)', color: '#00f0ff' }}
          aria-hidden="true"
        >
          ✦
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs text-white/60">Credits</span>
          {isLoading ? (
            <span className="text-sm font-bold animate-pulse" style={{ color: '#00f0ff' }}>
              …
            </span>
          ) : (
            <span className="text-sm font-bold" style={{ color: '#00f0ff' }}>
              {displayBalance}
            </span>
          )}
        </div>
      </div>
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'rgba(0,240,255,0.12)',
          color: '#00f0ff',
        }}
      >
        + Buy
      </span>
    </button>
  );
}
