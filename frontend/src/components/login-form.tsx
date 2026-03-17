/**
 * Login Form Component
 * US-02: User Login
 * US-04: Social Login (Google + Apple)
 */
'use client';

import React, { useState, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { CosmicSpinner } from '@/components/ui/spinner';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const { signIn, signInWithGoogle, signInWithMagicLink, isLoading, error: authError, clearError } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [magicLinkOpen, setMagicLinkOpen] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    return undefined;
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (authError) clearError();
    if (submitError) setSubmitError(null);
  }, [errors, authError, clearError, submitError]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error: string | undefined;

    switch (name) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
    }

    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };

    if (Object.values(newErrors).some(error => error)) {
      setErrors(newErrors);
      return;
    }

    try {
      await signIn(formData.email, formData.password);
      onSuccess?.();
    } catch {
      setSubmitError('Invalid credentials. Please check your email and password.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold mb-2 text-white">
          Sign In
        </h1>
        <p className="text-text-muted">
          Welcome back to the Oracle
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-text-secondary">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="your@email.com"
            autoComplete="email"
            className={`w-full bg-white/5 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/50 transition-all`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2 text-text-secondary">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`w-full bg-white/5 border ${errors.password ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3.5 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/50 transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border-subtle bg-background-dark/50 text-primary focus:ring-primary/50"
            />
            <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
              Remember me
            </span>
          </label>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline transition-colors">
            Forgot password?
          </Link>
        </div>

        {/* Auth Error — reserved space prevents layout jump */}
        <div className="min-h-[44px]">
          {(submitError || authError) && (
            <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20 animate-fade-in">
              {submitError || authError}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full font-bold rounded-full gradient-button text-white py-3.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <CosmicSpinner size="sm" />
              Signing in...
            </span>
          ) : (
            'Enter the Void'
          )}
        </button>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-subtle"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background-dark text-text-muted text-xs uppercase tracking-widest">
              or continue with
            </span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={async () => {
              try {
                setOauthLoading('google');
                await signInWithGoogle();
              } catch (error) {
                console.error('Google login error:', error);
                setOauthLoading(null);
              }
            }}
            disabled={isLoading || oauthLoading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-colors duration-200 text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'google' ? (
              <CosmicSpinner size="sm" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Google
          </button>

          <button
            type="button"
            onClick={() => {
              setMagicLinkOpen(true);
              setMagicLinkEmail(formData.email);
            }}
            disabled={isLoading || oauthLoading !== null}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-primary/20 transition-colors duration-200 text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-primary text-base leading-none">✦</span>
            Magic Link
          </button>
        </div>

        {/* Magic Link inline form */}
        {magicLinkOpen && !magicLinkSent && (
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
            <p className="text-xs text-text-muted">Enter your email to receive a magic sign-in link</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/50 transition-all"
              />
              <button
                type="button"
                disabled={!magicLinkEmail || oauthLoading === 'magic'}
                onClick={async () => {
                  try {
                    setOauthLoading('magic');
                    await signInWithMagicLink(magicLinkEmail);
                    setMagicLinkSent(true);
                  } catch {
                    // error handled by auth context
                  } finally {
                    setOauthLoading(null);
                  }
                }}
                className="px-4 py-2.5 rounded-xl gradient-button text-white text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'magic' ? (
                  <CosmicSpinner size="sm" />
                ) : 'Send'}
              </button>
            </div>
          </div>
        )}
        {magicLinkSent && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
            <p className="text-sm text-white font-medium">Check your email ✦</p>
            <p className="text-xs text-text-muted mt-1">Magic link sent to {magicLinkEmail}</p>
          </div>
        )}
      </form>

      {/* Register Link */}
      <p className="text-center mt-8 text-text-muted">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onRegisterClick}
          className="font-medium text-primary hover:text-primary-light hover:underline transition-colors"
        >
          Create account
        </button>
      </p>
    </div>
  );
}

export default LoginForm;
