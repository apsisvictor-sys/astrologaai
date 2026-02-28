/**
 * Supabase Browser Client
 * US-04: Social Login (Google + Apple)
 * 
 * Client-side Supabase instance for OAuth authentication
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. OAuth login will not work.');
}

export const createSupabaseBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const supabase = createSupabaseBrowserClient();
  
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple() {
  const supabase = createSupabaseBrowserClient();
  
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get current Supabase session
 */
export async function getSupabaseSession() {
  const supabase = createSupabaseBrowserClient();
  
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('[Supabase] Error getting session:', error);
    return null;
  }

  return data.session;
}

/**
 * Exchange OAuth code for session
 */
export async function exchangeCodeForSession(code: string) {
  const supabase = createSupabaseBrowserClient();
  
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    throw error;
  }

  return data;
}

export default createSupabaseBrowserClient;
