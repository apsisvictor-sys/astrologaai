'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { RegistrationForm } from '@/components/registration-form';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';

function RegisterPage() {
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
      <RegistrationForm
        onSuccess={() => router.push(returnUrl as any)}
        onLoginClick={() => router.push(returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` as any : '/login')}
      />
    </AuthShell>
  );
}

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background-deep"><Spinner /></div>}>
      <RegisterPage />
    </Suspense>
  );
}
