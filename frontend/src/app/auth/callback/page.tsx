/**
 * OAuth Callback Page
 * US-04: Social Login (Google + Apple)
 * 
 * Handles OAuth redirect from Supabase after Google/Apple login
 * Exchanges authorization code for session and redirects to dashboard
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { exchangeCodeForSession } from '@/lib/supabase-browser';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get authorization code and provider from URL
        const code = searchParams.get('code');
        const provider = searchParams.get('provider') || 'google';

        if (!code) {
          setError('No authorization code received');
          setStatus('error');
          return;
        }

        setStatus('processing');

        // First, exchange code with Supabase to get session
        // This validates the OAuth flow
        const sessionData = await exchangeCodeForSession(code);
        
        if (!sessionData?.session) {
          setError('Failed to establish session');
          setStatus('error');
          return;
        }

        // Now send the code to our backend to create/link user
        await handleOAuthCallback(code, provider);
        
        setStatus('success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, router]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ 
        background: 'radial-gradient(ellipse at top, #1A1A2E 0%, #050510 50%, #000000 100%)',
      }}
    >
      <div 
        className="p-8 rounded-2xl border max-w-md w-full text-center"
        style={{
          background: '#0A0A1F',
          borderColor: '#1A1A3A',
        }}
      >
        {status === 'processing' && (
          <>
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-6 animate-spin"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              }}
            />
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: '#F8FAFC' }}
            >
              Signing you in...
            </h1>
            <p style={{ color: '#64748B' }}>
              Please wait while we complete your authentication
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: '#F8FAFC' }}
            >
              Welcome!
            </h1>
            <p style={{ color: '#64748B' }}>
              Redirecting you to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: '#F8FAFC' }}
            >
              Authentication Failed
            </h1>
            <p className="mb-4" style={{ color: '#EF4444' }}>
              {error || 'Something went wrong during authentication'}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 rounded-xl font-medium transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                color: '#FFFFFF',
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
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
          <p style={{ color: '#64748B' }}>Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
