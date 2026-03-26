'use client';

/**
 * CreditsUpsellBanner
 * PIX-128 — "You've spent €15+ in credits this month. PRO is €9.99/month with unlimited access."
 *
 * Shown in the main content area when:
 *   - User tier is FREE (PRO/PREMIUM already have unlimited)
 *   - spentEurLast30Days >= CREDITS_UPSELL_EUR_THRESHOLD (15)
 *
 * Dismissible per session (sessionStorage flag).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CREDITS_UPSELL_EUR_THRESHOLD } from '@/lib/credits-api';
import { trackCreditsUpsellConverted, trackCreditsUpsellShown } from '@/lib/analytics';

const DISMISS_KEY = 'credits_upsell_banner_dismissed';

interface CreditsUpsellBannerProps {
  /** EUR spent on credits in the last 30 days */
  spentEurLast30Days: number;
  /** Current user tier — only show for non-unlimited tiers */
  userTier: 'FREE' | 'PRO' | 'PREMIUM';
}

export function CreditsUpsellBanner({
  spentEurLast30Days,
  userTier,
}: CreditsUpsellBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden, reveal after mount
  const hasTrackedShow = useRef(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    if (!wasDismissed) setDismissed(false);
  }, []);

  const shouldShow =
    !dismissed &&
    userTier === 'FREE' &&
    spentEurLast30Days >= CREDITS_UPSELL_EUR_THRESHOLD;

  useEffect(() => {
    if (shouldShow && !hasTrackedShow.current) {
      hasTrackedShow.current = true;
      trackCreditsUpsellShown({ spentEurLast30Days });
    }
  }, [shouldShow, spentEurLast30Days]);

  if (!shouldShow) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  const savedPerMonth = (spentEurLast30Days - 9.99).toFixed(2);

  return (
    <div
      className="relative w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm overflow-hidden"
      style={{
        background: 'rgba(228,26,255,0.05)',
        borderBottom: '1px solid rgba(228,26,255,0.15)',
      }}
    >
      {/* Gradient accent line at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{ background: 'linear-gradient(90deg, #e41aff, #00f0ff, transparent)' }}
      />

      {/* Left: spend context */}
      <p className="text-white/60 text-xs leading-snug">
        <span aria-hidden="true" className="mr-1" style={{ color: '#e41aff' }}>✦</span>
        You&apos;ve spent{' '}
        <span className="font-semibold text-white/90">€{spentEurLast30Days.toFixed(2)}</span>{' '}
        in credits this month.{' '}
        <span className="text-white/40 hidden sm:inline">
          PRO is €9.99/mo with unlimited access — save{' '}
          <span className="font-semibold" style={{ color: '#00f0ff' }}>
            €{savedPerMonth}
          </span>{' '}
          every month.
        </span>
      </p>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/pricing"
          onClick={() => trackCreditsUpsellConverted({ spentEurLast30Days })}
          className="px-3 py-1 rounded-full text-xs font-bold text-white transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #e41aff, #00f0ff)',
            boxShadow: '0 0 12px rgba(228,26,255,0.25)',
          }}
        >
          Switch to PRO
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="w-6 h-6 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/08 transition-all text-base leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
