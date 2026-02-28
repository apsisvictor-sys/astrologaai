/**
 * Email Verification Page
 * US-28: Edit Profile
 * 
 * Handles email verification for email changes
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { userProfileApi } from '@/lib/api-client';

// Design System Colors
const COLORS = {
  backgroundPrimary: '#050510',
  backgroundSecondary: '#0A0A1F',
  primary: '#8B5CF6',
  secondary: '#EC4899',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#71717A',
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  success: '#10B981',
  error: '#EF4444',
};

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    async function verifyEmail() {
      if (!token || !userId) {
        setStatus('error');
        setMessage('Missing verification token');
        return;
      }
      
      try {
        const response = await userProfileApi.confirmEmail(token, userId);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
        
        // Redirect to settings after 3 seconds
        setTimeout(() => {
          router.push('/settings/profile');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage('Verification failed. The link may be invalid or expired.');
      }
    }
    
    verifyEmail();
  }, [token, userId, router]);

  const lang = 'bg'; // Could detect from browser

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ 
        background: COLORS.backgroundPrimary,
        backgroundImage: `radial-gradient(ellipse at top, #1A1A2E 0%, ${COLORS.backgroundPrimary} 50%, #000000 100%)`,
      }}
    >
      <div 
        className="max-w-md w-full p-8 rounded-2xl text-center"
        style={{ 
          background: COLORS.backgroundSecondary,
          border: `1px solid ${COLORS.primary}30`,
        }}
      >
        {status === 'loading' && (
          <>
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-6 animate-spin"
              style={{ background: COLORS.gradient }}
            />
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: COLORS.textPrimary, fontFamily: 'Playfair Display, serif' }}
            >
              {lang === 'bg' ? 'Потвърждаване...' : 'Verifying...'}
            </h1>
            <p style={{ color: COLORS.textSecondary }}>
              {lang === 'bg' 
                ? 'Моля, изчакайте докато потвърдим вашия имейл.' 
                : 'Please wait while we verify your email.'}
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: `${COLORS.success}20` }}
            >
              <span className="text-3xl" style={{ color: COLORS.success }}>✓</span>
            </div>
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: COLORS.textPrimary, fontFamily: 'Playfair Display, serif' }}
            >
              {lang === 'bg' ? 'Успешно потвърден!' : 'Successfully Verified!'}
            </h1>
            <p style={{ color: COLORS.textSecondary, marginBottom: '1.5rem' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/settings/profile')}
              className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
              style={{ 
                background: COLORS.gradient,
                color: 'white',
              }}
            >
              {lang === 'bg' ? 'Към профила' : 'Go to Profile'}
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: `${COLORS.error}20` }}
            >
              <span className="text-3xl" style={{ color: COLORS.error }}>✕</span>
            </div>
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: COLORS.textPrimary, fontFamily: 'Playfair Display, serif' }}
            >
              {lang === 'bg' ? 'Грешка при потвърждение' : 'Verification Error'}
            </h1>
            <p style={{ color: COLORS.textSecondary, marginBottom: '1.5rem' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
              style={{ 
                background: COLORS.gradient,
                color: 'white',
              }}
            >
              {lang === 'bg' ? 'Към настройки' : 'Go to Settings'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.backgroundPrimary }}
      >
        <div 
          className="w-12 h-12 rounded-full animate-spin"
          style={{ background: COLORS.gradient }}
        />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
