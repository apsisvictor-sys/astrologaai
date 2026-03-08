"use strict";
/**
 * Supabase Client Configuration
 * US-04: Social Login (Google + Apple)
 *
 * Used for OAuth authentication with Google and Apple providers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
exports.getSupabaseUser = getSupabaseUser;
exports.verifyOAuthSession = verifyOAuthSession;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. OAuth login will not work.');
}
/**
 * Supabase admin client for server-side operations
 * Uses service role key for elevated permissions
 */
exports.supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null;
/**
 * Get user by ID from Supabase Auth
 */
async function getSupabaseUser(userId) {
    if (!exports.supabaseAdmin) {
        throw new Error('Supabase client not configured');
    }
    const { data, error } = await exports.supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
        console.error('[Supabase] Error getting user:', error);
        return null;
    }
    return data.user;
}
/**
 * Verify OAuth session from Supabase
 */
async function verifyOAuthSession(accessToken) {
    if (!exports.supabaseAdmin) {
        throw new Error('Supabase client not configured');
    }
    const { data, error } = await exports.supabaseAdmin.auth.getUser(accessToken);
    if (error) {
        console.error('[Supabase] Error verifying session:', error);
        return null;
    }
    return data.user;
}
exports.default = exports.supabaseAdmin;
//# sourceMappingURL=supabase.js.map