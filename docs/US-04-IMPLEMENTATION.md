# US-04: Social Login (Google + Apple) - Implementation Documentation

**User Story:** US-04  
**Status:** Completed  
**Date:** 2026-02-27  
**Session ID:** agent:main:subagent:57aad82d-78ee-4cb8-a648-470f5f66eba4

---

## Overview

Implemented social login functionality using Supabase Auth for Google and Apple OAuth providers. This allows users to sign up and log in using their existing Google or Apple accounts, reducing friction in the authentication process.

---

## Implementation Details

### 1. Backend Changes

#### 1.1 New Files

**`/backend/src/utils/supabase.ts`**
- Supabase client configuration for server-side operations
- Functions for verifying OAuth sessions and getting user data

**`/backend/src/controllers/oauthController.ts`**
- `googleLogin()` - Initiates Google OAuth flow
- `appleLogin()` - Initiates Apple OAuth flow
- `oauthCallback()` - Handles OAuth callback and creates/links users
- `getOAuthUrl()` - Returns OAuth URL for client-side redirect

#### 1.2 Modified Files

**`/backend/src/routes/auth.ts`**
- Added OAuth routes:
  - `GET /api/v1/auth/google` - Server-side Google OAuth redirect
  - `GET /api/v1/auth/apple` - Server-side Apple OAuth redirect
  - `GET /api/v1/auth/oauth-url/:provider` - Get OAuth URL for client-side
  - `POST /api/v1/auth/callback` - Handle OAuth callback

**`/prisma/schema.prisma`**
- Added OAuth fields to User model:
  - `oauthProvider` - Stores the provider name ('google', 'apple')
  - `oauthId` - Stores the Supabase auth user ID
  - `avatarUrl` - Stores the user's avatar URL from OAuth provider

#### 1.3 New Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x"
}
```

---

### 2. Frontend Changes

#### 2.1 New Files

**`/frontend/src/lib/supabase-browser.ts`**
- Browser-side Supabase client
- `signInWithGoogle()` - Initiates Google OAuth
- `signInWithApple()` - Initiates Apple OAuth
- `exchangeCodeForSession()` - Exchanges OAuth code for session

**`/frontend/src/app/auth/callback/page.tsx`**
- OAuth callback page that handles redirect from Supabase
- Displays loading state during authentication
- Shows success/error messages
- Redirects to dashboard on success

#### 2.2 Modified Files

**`/frontend/src/lib/auth-context.tsx`**
- Added `signInWithGoogle()` method
- Added `signInWithApple()` method
- Added `handleOAuthCallback()` method
- Added `avatarUrl` to User interface

**`/frontend/src/components/login-form.tsx`**
- Enabled Google and Apple login buttons
- Added loading states for OAuth buttons
- Integrated with auth context social login methods

**`/frontend/src/components/registration-form.tsx`**
- Added social login buttons (Google + Apple)
- Added loading states for OAuth buttons
- Integrated with auth context social login methods

#### 2.3 New Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x"
}
```

---

## API Endpoints

### GET /api/v1/auth/oauth-url/:provider

Returns OAuth URL for client-side redirect.

**Parameters:**
- `provider` (path) - 'google' or 'apple'

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "provider": "google"
  }
}
```

### POST /api/v1/auth/callback

Handles OAuth callback after user authorizes with provider.

**Request Body:**
```json
{
  "code": "authorization_code",
  "provider": "google"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "tier": "FREE",
      "language": "bg",
      "emailVerified": true,
      "avatarUrl": "https://..."
    },
    "tokens": {
      "accessToken": "jwt...",
      "refreshToken": "jwt...",
      "expiresIn": "15m"
    },
    "message": "Login successful"
  }
}
```

---

## OAuth Flow

1. **User clicks "Google" or "Apple" button**
   - Frontend calls `signInWithGoogle()` or `signInWithApple()`
   - Supabase generates OAuth URL and redirects user

2. **User authenticates with provider**
   - User logs in to Google/Apple
   - User authorizes the application

3. **Provider redirects to callback URL**
   - `/auth/callback?code=...`
   - Frontend callback page extracts code

4. **Frontend exchanges code for session**
   - Calls Supabase `exchangeCodeForSession()`
   - Then calls backend `/api/v1/auth/callback`

5. **Backend creates/links user**
   - Checks if user exists by email
   - Creates new user if not exists
   - Updates OAuth info if user exists
   - Returns JWT tokens

6. **Frontend stores tokens and redirects**
   - Stores tokens in localStorage
   - Updates auth context
   - Redirects to dashboard

---

## Database Changes

### User Model Updates

```prisma
model User {
  // ... existing fields ...
  
  // US-04: OAuth fields
  oauthProvider     String?   @map("oauth_provider") // 'google', 'apple', etc.
  oauthId           String?   @map("oauth_id")       // Supabase auth user ID
  avatarUrl         String?   @map("avatar_url")
  
  // ... rest of fields ...
}
```

---

## Configuration Required

### Environment Variables

**Backend (.env):**
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Supabase Configuration

1. **Enable Google OAuth:**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add Google OAuth credentials (Client ID, Client Secret)
   - Configure redirect URLs

2. **Enable Apple OAuth:**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Apple provider
   - Add Apple Sign In credentials (Service ID, Team ID, Key ID, Private Key)
   - Configure redirect URLs

3. **Configure Redirect URLs:**
   - Add `http://localhost:3000/auth/callback` for development
   - Add production URL when deployed

---

## Testing Checklist

- [ ] Google OAuth login initiates correctly
- [ ] Apple OAuth login initiates correctly
- [ ] New users are created with OAuth info
- [ ] Existing users are linked correctly
- [ ] OAuth tokens are properly handled
- [ ] Callback page displays loading state
- [ ] Callback page handles errors gracefully
- [ ] User is redirected to dashboard after successful login
- [ ] Social login buttons show loading state during OAuth
- [ ] Both login and registration forms have social login buttons

---

## Files Modified/Created

### Backend
- `src/utils/supabase.ts` (new)
- `src/controllers/oauthController.ts` (new)
- `src/routes/auth.ts` (modified)
- `prisma/schema.prisma` (modified)
- `package.json` (modified - added Supabase deps)

### Frontend
- `src/lib/supabase-browser.ts` (new)
- `src/app/auth/callback/page.tsx` (new)
- `src/lib/auth-context.tsx` (modified)
- `src/components/login-form.tsx` (modified)
- `src/components/registration-form.tsx` (modified)
- `package.json` (modified - added Supabase deps)

---

## Notes

1. **Supabase Configuration Required:** The OAuth providers must be configured in Supabase Dashboard before testing.

2. **Placeholder Values:** Current implementation uses placeholder values for Supabase credentials. Replace with actual values before production.

3. **Session Management:** OAuth sessions are managed by Supabase, while JWT tokens for API access are managed by our custom auth system.

4. **Account Linking:** If a user with the same email already exists, the OAuth info is linked to their existing account.

---

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| Google OAuth login works via Supabase | ✅ Implemented |
| Apple OAuth login works via Supabase | ✅ Implemented |
| Social login buttons displayed on login page | ✅ Implemented |
| New users are created in database with OAuth provider info | ✅ Implemented |
| Returning OAuth users can log in | ✅ Implemented |
| OAuth tokens properly handled by Supabase | ✅ Implemented |

---

**Implementation completed by:** AstroLogAI-US-04-SocialLogin Subagent  
**Date:** 2026-02-27
