'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const returnUrl = searchParams.get('returnUrl') ?? '/dashboard';

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(returnUrl as any);
    }
  }, [isAuthenticated, isLoading, router, returnUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-deep">
        <Spinner />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <AuthShell>
      <LoginForm
        onSuccess={() => router.push(returnUrl as any)}
        onRegisterClick={() => router.push(returnUrl ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` as any : '/register')}
      />
    </AuthShell>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background-deep"><Spinner /></div>}>
      <LoginPage />
    </Suspense>
  );
}
