/**
 * Supabase Client Configuration
 * US-04: Social Login (Google + Apple)
 * 
 * Used for OAuth authentication with Google and Apple providers
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. OAuth login will not work.');
}

/**
 * Supabase admin client for server-side operations
 * Uses service role key for elevated permissions
 */
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Get user by ID from Supabase Auth
 */
export async function getSupabaseUser(userId: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase client not configured');
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (error) {
    console.error('[Supabase] Error getting user:', error);
    return null;
  }
  
  return data.user;
}

/**
 * Verify OAuth session from Supabase
 */
export async function verifyOAuthSession(accessToken: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase client not configured');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  
  if (error) {
    console.error('[Supabase] Error verifying session:', error);
    return null;
  }
  
  return data.user;
}

export default supabaseAdmin;
