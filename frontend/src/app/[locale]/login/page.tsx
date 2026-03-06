/**
 * Login Page
 * Route: /login (Bulgarian default) or /en/login (English)
 */
'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { LoginForm } from '@/components/login-form';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function LoginPage() {
  const t = useTranslations();
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
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin border-t-2 border-primary" />
          <p className="text-text-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex text-text-primary items-center justify-center px-4 py-12 bg-background-deep relative overflow-hidden">

      {/* Massive Neon Glowing Orbs Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute shrink-0 top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-primary blur-sphere pointer-events-none"></div>
        <div className="absolute shrink-0 bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-accent-blue blur-sphere pointer-events-none"></div>
      </div>

      <div className="absolute top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Logo/Brand */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-blue leading-tight tracking-tight">
            AstroLogAI
          </h1>
          <p className="text-text-secondary text-lg">
            {t('app.tagline')}
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-panel p-[1px] shadow-panel">
          <div className="bg-background-surface/80 rounded-[32px] p-8">
            <LoginForm
              onSuccess={() => router.push('/dashboard')}
              onRegisterClick={() => router.push('/register')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
