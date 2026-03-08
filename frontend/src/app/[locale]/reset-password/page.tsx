/**
 * Reset Password Page
 * US-03: Password Reset
 * 
 * Allows users to reset their password using a token from email
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckIcon, XMarkIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('No reset token provided. Please request a new password reset link.');
    }
  }, [token]);

  // Password validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';
  const isFormValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
          language: typeof window !== 'undefined' && window.location.pathname.includes('/bg/') ? 'bg' : 'en',
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

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'linear-gradient(180deg, #0A0A0F 0%, #050510 100%)' }}>
        <div className="w-full max-w-md">
          <div 
            className="rounded-2xl p-8 text-center"
            style={{ 
              background: '#0A0A1F', 
              border: '1px solid #1A1A3A',
            }}
          >
            <div 
              className="rounded-full p-3 inline-block mb-6"
              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <XMarkIcon 
                className="h-12 w-12"
                style={{ color: '#EF4444' }}
              />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#F8FAFC' }}>
              {t('auth.resetPassword.invalidToken')}
            </h2>
            <p style={{ color: '#CBD5E1' }} className="mb-6">
              {tokenError}
            </p>
            <Link
              href="/forgot-password"
              className="inline-block font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                height: '48px',
                lineHeight: '48px',
                padding: '0 32px',
                borderRadius: '12px',
              }}
            >
              {t('auth.resetPassword.requestNewLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
                  {t('auth.resetPassword.title')}
                </h1>
                <p style={{ color: '#CBD5E1' }}>
                  {t('auth.resetPassword.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password Input */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                    {t('auth.resetPassword.newPassword')}
                  </label>
                  <div className="relative">
                    <LockClosedIcon 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5"
                      style={{ color: '#71717A' }}
                    />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth.resetPassword.passwordPlaceholder')}
                      required
                      className="w-full pl-12 pr-12 rounded-xl transition-all focus:outline-none"
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
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2"
                      style={{ color: '#71717A' }}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {hasMinLength ? (
                        <CheckIcon className="h-4 w-4" style={{ color: '#10B981' }} />
                      ) : (
                        <XMarkIcon className="h-4 w-4" style={{ color: '#71717A' }} />
                      )}
                      <span style={{ color: hasMinLength ? '#10B981' : '#CBD5E1' }}>
                        {t('auth.resetPassword.requirements.minLength')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {hasUppercase ? (
                        <CheckIcon className="h-4 w-4" style={{ color: '#10B981' }} />
                      ) : (
                        <XMarkIcon className="h-4 w-4" style={{ color: '#71717A' }} />
                      )}
                      <span style={{ color: hasUppercase ? '#10B981' : '#CBD5E1' }}>
                        {t('auth.resetPassword.requirements.uppercase')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {hasNumber ? (
                        <CheckIcon className="h-4 w-4" style={{ color: '#10B981' }} />
                      ) : (
                        <XMarkIcon className="h-4 w-4" style={{ color: '#71717A' }} />
                      )}
                      <span style={{ color: hasNumber ? '#10B981' : '#CBD5E1' }}>
                        {t('auth.resetPassword.requirements.number')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                    {t('auth.resetPassword.confirmPassword')}
                  </label>
                  <div className="relative">
                    <LockClosedIcon 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5"
                      style={{ color: '#71717A' }}
                    />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                      required
                      className="w-full pl-12 pr-12 rounded-xl transition-all focus:outline-none"
                      style={{
                        background: '#050510',
                        border: confirmPassword && !passwordsMatch ? '1px solid #EF4444' : '1px solid #1A1A3A',
                        color: '#F8FAFC',
                        height: '56px',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#8B5CF6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = confirmPassword && !passwordsMatch ? '#EF4444' : '#1A1A3A';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2"
                      style={{ color: '#71717A' }}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {passwordsMatch ? (
                        <>
                          <CheckIcon className="h-4 w-4" style={{ color: '#10B981' }} />
                          <span style={{ color: '#10B981' }}>
                            {t('auth.resetPassword.requirements.match')}
                          </span>
                        </>
                      ) : (
                        <>
                          <XMarkIcon className="h-4 w-4" style={{ color: '#EF4444' }} />
                          <span style={{ color: '#EF4444' }}>
                            {t('auth.resetPassword.requirements.noMatch')}
                          </span>
                        </>
                      )}
                    </div>
                  )}
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
                  disabled={!isFormValid || isLoading}
                  className="w-full font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isFormValid ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' : '#1A1A3A',
                    height: '48px',
                    borderRadius: '12px',
                  }}
                  onMouseEnter={(e) => {
                    if (isFormValid && !isLoading) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isLoading ? t('auth.resetPassword.resetting') : t('auth.resetPassword.resetPassword')}
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
                {t('auth.resetPassword.success')}
              </h2>
              <p style={{ color: '#CBD5E1' }} className="mb-6">
                {t('auth.resetPassword.successDescription')}
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
                {t('auth.resetPassword.continueToLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
