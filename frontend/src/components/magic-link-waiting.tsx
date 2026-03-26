/**
 * MagicLinkWaitingScreen — PIX-225
 * Reusable "check your inbox" UI shown after a magic link is sent.
 * Features: 30s resend countdown, spam guidance, 3-resend limit.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CosmicSpinner } from '@/components/ui/spinner';
import { getApiBaseUrl } from '@/lib/runtime-config';

const RESEND_COOLDOWN_SEC = 30;
const MAX_RESENDS = 3;

interface MagicLinkWaitingScreenProps {
  email: string;
  /** Called to actually send the magic link (Supabase OTP). */
  onResend: (email: string) => Promise<void>;
}

export function MagicLinkWaitingScreen({ email, onResend }: MagicLinkWaitingScreenProps) {
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SEC);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start countdown on mount and reset after each resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isResending || resendCount >= MAX_RESENDS) return;

    setIsResending(true);
    setConfirmation(null);
    setError(null);

    try {
      // Backend rate-limit check + audit log
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/v1/auth/resend-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError('Too many attempts. Please try again later.');
        setResendCount(MAX_RESENDS); // force hide button
        return;
      }

      if (!res.ok) {
        setError('Failed to resend. Please try again.');
        return;
      }

      // Trigger the actual Supabase OTP send
      await onResend(email);

      setResendCount((c) => c + 1);
      setCountdown(RESEND_COOLDOWN_SEC);
      setConfirmation('A new link has been sent.');
    } catch {
      setError('Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [countdown, isResending, resendCount, email, onResend]);

  return (
    <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4 text-center">
      {/* Header */}
      <div>
        <p className="text-base text-white font-semibold">Check your email ✦</p>
        <p className="text-sm text-text-muted mt-1">
          Magic link sent to{' '}
          <span className="text-text-secondary font-medium">{email}</span>
        </p>
      </div>

      {/* Spam guidance */}
      <p className="text-xs text-text-muted">
        Check <span className="text-text-secondary">Promotions / Spam</span> if you don&apos;t see it in 60 seconds.
      </p>

      {/* Confirmation toast */}
      {confirmation && (
        <p className="text-xs text-emerald-400 font-medium">{confirmation}</p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Resend section */}
      {resendCount >= MAX_RESENDS ? (
        <p className="text-xs text-text-muted">
          Too many attempts. Please try again later.
        </p>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={countdown > 0 || isResending}
            onClick={handleResend}
            className="text-sm text-primary hover:text-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isResending ? (
              <>
                <CosmicSpinner size="sm" />
                Sending…
              </>
            ) : countdown > 0 ? (
              `Resend in ${countdown}s…`
            ) : (
              'Resend link'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default MagicLinkWaitingScreen;
