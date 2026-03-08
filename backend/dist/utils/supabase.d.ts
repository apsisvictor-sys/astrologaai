/**
 * Supabase Client Configuration
 * US-04: Social Login (Google + Apple)
 *
 * Used for OAuth authentication with Google and Apple providers
 */
/**
 * Supabase admin client for server-side operations
 * Uses service role key for elevated permissions
 */
export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any> | null;
/**
 * Get user by ID from Supabase Auth
 */
export declare function getSupabaseUser(userId: string): Promise<import("@supabase/supabase-js").AuthUser | null>;
/**
 * Verify OAuth session from Supabase
 */
export declare function verifyOAuthSession(accessToken: string): Promise<import("@supabase/supabase-js").AuthUser | null>;
export default supabaseAdmin;
//# sourceMappingURL=supabase.d.ts.map