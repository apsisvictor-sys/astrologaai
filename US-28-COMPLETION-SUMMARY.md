# US-28: Edit Profile - COMPLETION SUMMARY

## Date: 2026-02-27

## Implemented Features

### Backend (API Endpoints)
1. **PUT /api/v1/user/profile** - Updated to support email verification flow
   - When email is changed, sets `pendingEmail` and sends verification email
   - Returns pendingEmail status in response
   
2. **POST /api/v1/user/avatar** - NEW endpoint
   - Accepts multipart form data with 'avatar' field
   - Validates: JPG/PNG only, max 2MB
   - Uses Sharp for resize/crop to 256x256 square avatar
   - Falls back gracefully if Sharp is unavailable
   
3. **DELETE /api/v1/user/avatar** - NEW endpoint
   - Removes user's avatar
   
4. **POST /api/v1/user/verify-email** - NEW endpoint
   - Sends verification email to new email address
   
5. **POST /api/v1/user/confirm-email** - NEW endpoint
   - Confirms email change via token
   
6. **POST /api/v1/user/cancel-email-change** - NEW endpoint
   - Cancels pending email change

### Frontend (Pages)
1. **/settings/profile** - NEW page
   - Edit name and email fields
   - Upload avatar with drag-and-drop or file picker
   - Client-side validation (JPG/PNG, max 2MB)
   - Success/error notifications
   - Unsaved changes warning on cancel
   - Shows email verification status
   
2. **/verify-email** - NEW page
   - Handles email verification link
   - Shows success/error states
   - Auto-redirects to profile after success

### Database Schema Updates
- Added `pendingEmail` field to User model
- Added `pendingEmailToken` field to User model

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| User can edit name and email in settings | ✅ |
| Email change requires verification | ✅ |
| User can upload profile picture (JPG, PNG, max 2MB) | ✅ |
| Profile picture cropped to square (avatar style) | ✅ |
| Changes saved immediately with success notification | ✅ |
| Cancel button discards unsaved changes | ✅ |

## Files Created/Modified

### Backend
- `backend/src/controllers/avatarController.ts` (NEW)
- `backend/src/routes/user.ts` (MODIFIED - added avatar routes)
- `backend/src/controllers/userPreferencesController.ts` (MODIFIED - email verification)
- `backend/src/__tests__/user-profile.test.ts` (NEW)
- `prisma/schema.prisma` (MODIFIED - added pendingEmail fields)

### Frontend
- `frontend/src/app/settings/profile/page.tsx` (NEW)
- `frontend/src/app/verify-email/page.tsx` (NEW)
- `frontend/src/lib/api-client.ts` (MODIFIED - added userProfileApi)
- `frontend/src/lib/auth-context.tsx` (MODIFIED - added refreshUser)

## Testing Notes

- Backend unit tests created at: `backend/src/__tests__/user-profile.test.ts`
- Tests cover: profile update, email validation, email verification flow
- Manual testing recommended for avatar upload flow
