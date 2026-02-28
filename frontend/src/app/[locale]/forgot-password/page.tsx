/**
 * Forgot Password Page
 * US-03: Password Reset
 * 
 * Allows users to request a password reset email
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          language: typeof window !== 'undefined' && window.location.pathname.includes('/en/') ? 'en' : 'bg',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.error?.message || 'An error occurred');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'linear-gradient(180deg, #0A0A0F 0%, #050510 100%)' }}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div 
          className="rounded-2xl p-8"
          style={{ 
            background: '#0A0A1F', 
            border: '1px solid #1A1A3A',
          }}
        >
          {/* Back Link */}
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
            style={{ color: '#A1A1AA' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FAFAFA'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#A1A1AA'}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t('auth.forgotPassword.backToLogin')}
          </Link>

          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
                  {t('auth.forgotPassword.title')}
                </h1>
                <p style={{ color: '#CBD5E1' }}>
                  {t('auth.forgotPassword.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                    {t('auth.forgotPassword.email')}
                  </label>
                  <div className="relative">
                    <EnvelopeIcon 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5"
                      style={{ color: '#71717A' }}
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.forgotPassword.emailPlaceholder')}
                      required
                      className="w-full pl-12 pr-4 rounded-xl transition-all focus:outline-none"
                      style={{
                        background: '#050510',
                        border: '1px solid #1A1A3A',
                        color: '#F8FAFC',
                        height: '56px',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#8B5CF6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#1A1A3A';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div 
                    className="p-4 rounded-xl text-sm"
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                    height: '48px',
                    borderRadius: '12px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isLoading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendResetLink')}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div 
                  className="rounded-full p-3"
                  style={{ background: 'rgba(16, 185, 129, 0.1)' }}
                >
                  <CheckCircleIcon 
                    className="h-12 w-12"
                    style={{ color: '#10B981' }}
                  />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#F8FAFC' }}>
                {t('auth.forgotPassword.checkYourEmail')}
              </h2>
              <p style={{ color: '#CBD5E1' }} className="mb-6">
                {t('auth.forgotPassword.emailSentDescription')}
              </p>
              <Link
                href="/login"
                className="inline-block font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  height: '48px',
                  lineHeight: '48px',
                  padding: '0 32px',
                  borderRadius: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
