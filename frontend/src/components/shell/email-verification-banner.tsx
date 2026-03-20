'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiPost } from '@/lib/api-client';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    setLoading(true);
    setError('');
    try {
      await apiPost('/auth/resend-verification', {});
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send email';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-amber-950/40 border-b border-amber-800/40 px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <p className="text-amber-200/80">
        {user.language === 'bg'
          ? 'Потвърди имейла си, за да отключиш пълния достъп.'
          : 'Please verify your email to unlock full access.'}
      </p>

      <div className="flex items-center gap-3 shrink-0">
        {error && <span className="text-red-400 text-xs">{error}</span>}
        {sent ? (
          <span className="text-green-400 text-xs">
            {user.language === 'bg' ? 'Изпратено ✓' : 'Sent ✓'}
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-amber-300 hover:text-amber-100 underline underline-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading
              ? (user.language === 'bg' ? 'Изпращане...' : 'Sending...')
              : (user.language === 'bg' ? 'Изпрати отново' : 'Resend email')}
          </button>
        )}
      </div>
    </div>
  );
}
