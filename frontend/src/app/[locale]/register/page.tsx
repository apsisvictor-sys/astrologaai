/**
 * Registration Page
 * US-01: User Registration
 * 
 * Route: /register (Bulgarian default) or /en/register (English)
 */

'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { RegistrationForm } from '@/components/registration-form';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state while checking auth
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#050510' }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            }}
          />
          <p style={{ color: '#64748B' }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Don't render if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ 
        background: 'radial-gradient(ellipse at top, #1A1A2E 0%, #050510 50%, #000000 100%)',
      }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars effect */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(2px 2px at 20px 30px, #8B5CF6, transparent),
                             radial-gradient(2px 2px at 40px 70px, #EC4899, transparent),
                             radial-gradient(1px 1px at 90px 40px, #F8FAFC, transparent),
                             radial-gradient(2px 2px at 130px 80px, #8B5CF6, transparent),
                             radial-gradient(1px 1px at 160px 30px, #EC4899, transparent)`,
            backgroundSize: '200px 100px',
          }}
        />
      </div>

      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AstroLogAI
          </h1>
          <p style={{ color: '#64748B' }}>
            {t('app.tagline')}
          </p>
        </div>

        {/* Registration Form */}
        <RegistrationForm 
          onSuccess={() => router.push('/dashboard')}
          onLoginClick={() => router.push('/login')}
        />
      </div>
    </div>
  );
}
