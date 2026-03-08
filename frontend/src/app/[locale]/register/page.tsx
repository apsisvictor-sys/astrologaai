'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { RegistrationForm } from '@/components/registration-form';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

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
        onSuccess={() => router.push('/dashboard')}
        onLoginClick={() => router.push('/login')}
      />
    </AuthShell>
  );
}
