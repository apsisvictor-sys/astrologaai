'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api-client';
import { trackEmailVerified } from '@/lib/analytics';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const isBg = user?.language === 'bg';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(isBg ? 'Липсва токен за потвърждение.' : 'No verification token provided.');
      return;
    }

    apiGet(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async () => {
        setStatus('success');
        trackEmailVerified();
        // Refresh auth context so emailVerified flips to true
        if (refreshUser) await refreshUser();
        // Redirect to dashboard after 2s
        setTimeout(() => router.push('/dashboard'), 2000);
      })
      .catch((err: unknown) => {
        setStatus('error');
        const msg = err instanceof Error ? err.message : '';
        setErrorMsg(
          msg.includes('expired') || msg.includes('Invalid')
            ? (isBg ? 'Връзката е невалидна или е изтекла.' : 'This link is invalid or has expired.')
            : (isBg ? 'Неуспешно потвърждение. Моля, опитай отново.' : 'Verification failed. Please try again.')
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-deep px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4">✨</div>
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              {isBg ? 'Потвърждаване...' : 'Verifying your email...'}
            </h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">🌟</div>
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              {isBg ? 'Имейлът е потвърден!' : 'Email verified!'}
            </h1>
            <p className="text-zinc-400 text-sm">
              {isBg ? 'Пренасочване към таблото...' : 'Redirecting to your dashboard...'}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              {isBg ? 'Неуспешно потвърждение' : 'Verification failed'}
            </h1>
            <p className="text-zinc-400 text-sm mb-6">{errorMsg}</p>
            <Link
              href="/dashboard"
              className="text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2"
            >
              {isBg ? 'Към таблото' : 'Go to dashboard'}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
