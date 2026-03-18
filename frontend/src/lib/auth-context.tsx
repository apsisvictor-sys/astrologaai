/**
 * Auth Context Provider
 * Manages authentication state across the application
 * 
 * US-01: User Registration
 * US-02: User Login
 * US-03: Password Reset
 * US-04: Social Login (Google + Apple)
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInWithMagicLink } from './supabase-browser';
import { getApiBaseUrl } from './runtime-config';

// Types
interface User {
  id: string;
  email: string;
  fullName?: string | null;
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  language: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  handleOAuthCallback: (code: string, provider: string) => Promise<void>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserLanguage: (language: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = getApiBaseUrl();

// Storage keys
const ACCESS_TOKEN_KEY = 'astrologaai_access_token';

function friendlyAuthError(error: unknown, response?: Response | null): string {
  // Handle fetch/Type errors (network issues)
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'Cannot reach AstroLogAI servers right now. Please check your connection and try again.';
  }

  // Handle 401 invalid credentials
  if (response?.status === 401) {
    return 'Invalid credentials. Please check your email and password.';
  }

  // Handle 500 errors specifically
  if (response?.status === 500) {
    return 'AstroLogAI servers are experiencing issues. Please try again in a few moments.';
  }

  // Handle 503 errors
  if (response?.status === 503) {
    return 'Authentication service is temporarily unavailable. Please try again shortly.';
  }

  // Handle 504 gateway timeout
  if (response?.status === 504) {
    return 'Request timed out. Please try again.';
  }

  // Handle 429 rate limiting
  if (response?.status === 429) {
    return 'Too many requests. Please wait a moment before trying again.';
  }

  // Handle regular errors
  if (error instanceof Error) {
    return error.message;
  }

  return 'Authentication request failed. Please try again.';
}

async function parseApiResponse(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: `Unexpected server response (${response.status})` } };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const localePath = (path: string): string => {
    if (typeof window === 'undefined') return path;
    const parts = window.location.pathname.split('/').filter(Boolean);
    const currentLocale = parts[0] === 'bg' ? 'bg' : 'en';
    return currentLocale === 'bg' ? `/bg${path}` : path;
  };

  // Hydrate user from server on mount — server-authoritative tier (ARCH-02/03)
  useEffect(() => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_URL}/api/v1/user/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => parseApiResponse(res))
      .then((data) => {
        if (data?.data?.user) {
          const u = data.data.user;
          setUser({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            tier: u.tier,
            language: u.language,
            emailVerified: u.emailVerified,
            avatarUrl: u.avatarUrl,
          });
        } else {
          // Token invalid or profile missing — clear tokens
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Migrate guest session data to a newly registered/logged-in account.
   * Uploads guest birth data + imports chat history as first DB session.
   * Returns the migrated session ID (or null if no guest data / migration failed).
   */
  const migrateGuestSession = async (
    accessToken: string,
    userData: { fullName?: string; email?: string },
  ): Promise<string | null> => {
    // Upload guest birth data
    const guestBirthDataStr = localStorage.getItem('astrologaai_guest_birth_data');
    if (guestBirthDataStr) {
      try {
        const gd = JSON.parse(guestBirthDataStr);
        const res = await fetch(`${API_URL}/api/v1/birth-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            name: userData.fullName || userData.email || 'My Chart',
            birthDate: gd.birthDate,
            birthTime: gd.birthTime || null,
            isUnknownTime: !gd.birthTime,
            locationName: gd.locationName,
            latitude: gd.latitude,
            longitude: gd.longitude,
            timezone: gd.timezone || undefined,
          }),
        });
        if (!res.ok) {
          // Birth data upload failed — show notice on dashboard
          localStorage.setItem('astrologaai_pending_notice', 'birth_data_failed');
        }
      } catch {
        localStorage.setItem('astrologaai_pending_notice', 'birth_data_failed');
      }
      localStorage.removeItem('astrologaai_guest_birth_data');
    }

    // Migrate guest chat messages → first registered chat session
    const guestMsgsStr = localStorage.getItem('astrologaai_guest_messages');
    let migratedSessionId: string | null = null;

    if (guestMsgsStr) {
      try {
        const guestMsgs: Array<{ role: string; content: string; timestamp: string }> = JSON.parse(guestMsgsStr);
        if (guestMsgs.length > 0) {
          // Derive session title from first user message (ChatGPT-style)
          const firstUserMsg = guestMsgs.find(m => m.role === 'user');
          const title = firstUserMsg
            ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '…' : '')
            : 'My first reading';

          const sessionRes = await fetch(`${getApiBaseUrl()}/api/v1/chat/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ title }),
          });
          const sessionData = await sessionRes.json();
          const newSessionId = sessionData.data?.session?.id;

          if (newSessionId) {
            const importRes = await fetch(`${getApiBaseUrl()}/api/v1/chat/sessions/${newSessionId}/import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ messages: guestMsgs }),
            });
            if (importRes.ok) {
              migratedSessionId = newSessionId;
            } else {
              // Import failed — delete the orphaned empty session
              fetch(`${getApiBaseUrl()}/api/v1/chat/sessions/${newSessionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('[Auth] Guest chat migration failed (non-blocking):', err);
      }
    }

    // Always clear guest session keys regardless of whether migration ran
    localStorage.removeItem('astrologaai_guest_messages');
    localStorage.removeItem('astrologaai_guest_session');
    localStorage.removeItem('astrologaai_guest_oracle_count');
    localStorage.removeItem('astrologaai_guest_user_count');

    return migratedSessionId;
  };

  /**
   * Sign up a new user
   * US-26: Include Accept-Language header for language detection
   */
  const signUp = async (email: string, password: string, fullName?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    // Get browser language for Accept-Language header
    const acceptLanguage = typeof window !== 'undefined'
      ? (navigator.language || 'bg')
      : 'bg';

    // Read referral slug captured from ?ref= URL param (Task 3)
    const referralSlug = typeof window !== 'undefined'
      ? localStorage.getItem('referral_slug') || undefined
      : undefined;

    let response: Response | null = null;

    try {
      response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': acceptLanguage,
        },
        body: JSON.stringify({ email, password, fullName, referralSlug }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data?.error?.message || friendlyAuthError(new Error('Registration failed'), response));
      }

      // Store tokens and user
      const { user: userData, tokens } = data.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

      // Clear referral slug after successful registration
      if (typeof window !== 'undefined') {
        localStorage.removeItem('referral_slug');
      }

      setUser(userData);

      const migratedSessionId = await migrateGuestSession(tokens.accessToken, userData);

      // Redirect to migrated session if available, otherwise to /chat
      router.push(localePath(migratedSessionId ? `/chat?session=${migratedSessionId}` : '/chat'));
    } catch (err) {
      const message = friendlyAuthError(err, response) || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in an existing user
   * US-26: Include Accept-Language header
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const acceptLanguage = typeof window !== 'undefined' ? (navigator.language || 'bg') : 'bg';

    let response: Response | null = null;

    try {
      response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': acceptLanguage,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data?.error?.message || friendlyAuthError(new Error('Login failed'), response));
      }

      // Store tokens and user
      const { user: userData, tokens } = data.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

      setUser(userData);

      // Clear any lingering guest session keys
      localStorage.removeItem('astrologaai_guest_session');
      localStorage.removeItem('astrologaai_guest_messages');
      localStorage.removeItem('astrologaai_guest_oracle_count');
      localStorage.removeItem('astrologaai_guest_user_count');

      // Redirect to chat
      router.push(localePath('/chat'));
    } catch (err) {
      const message = friendlyAuthError(err, response) || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with Google OAuth (US-04)
   */
  const handleGoogleSignIn = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await signInWithGoogle();
      // The redirect happens automatically via Supabase
      // After redirect, the callback page will handle the rest
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Sign in with Magic Link (passwordless email)
   */
  const handleMagicLinkSignIn = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithMagicLink(email);
      // Email sent — user clicks the link to complete sign-in
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Magic link failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle OAuth callback (US-04)
   * Called by the callback page after OAuth redirect
   */
  const handleOAuthCallback = async (code: string, provider: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    let response: Response | null = null;

    try {
      response = await fetch(`${API_URL}/api/v1/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, provider }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data?.error?.message || friendlyAuthError(new Error('OAuth login failed'), response));
      }

      // Store tokens and user
      const { user: userData, tokens } = data.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

      setUser(userData);

      // Migrate any guest session data (same as email signUp)
      const migratedSessionId = await migrateGuestSession(tokens.accessToken, userData);

      router.push(localePath(migratedSessionId ? `/chat?session=${migratedSessionId}` : '/chat'));
    } catch (err) {
      const message = friendlyAuthError(err, response) || 'OAuth login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    router.push(localePath('/login'));
  };

  /**
   * Refresh the access token
   */
  const refreshSession = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        signOut();
        return;
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
    } catch {
      signOut();
    }
  };

  /**
   * Refresh user data from API
   * US-28: Used after profile updates
   */
  const refreshUser = async (): Promise<void> => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        console.warn('[Auth] Failed to refresh user:', data?.error?.message);
        return;
      }

      const userData = data.data.user;
      
      // Update local user state
      const updatedUser: User = {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        tier: userData.tier,
        language: userData.language,
        emailVerified: userData.emailVerified,
        avatarUrl: userData.avatarUrl,
      };

      setUser(updatedUser);
    } catch (err) {
      console.error('[Auth] Failed to refresh user:', err);
    }
  };

  /**
   * Update user's language preference
   * US-26: Auto-Detect User Language
   */
  const updateUserLanguage = async (language: string): Promise<void> => {
    if (!user) return;
    
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/user/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept-Language': language,
        },
        body: JSON.stringify({ language }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to update language');
      }

      // Update local user state
      setUser({ ...user, language });
    } catch (err) {
      console.error('[Auth] Failed to update language:', err);
      throw err;
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signInWithGoogle: handleGoogleSignIn,
    signInWithMagicLink: handleMagicLinkSignIn,
    handleOAuthCallback,
    signOut,
    refreshSession,
    refreshUser,
    updateUserLanguage,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export default AuthContext;
