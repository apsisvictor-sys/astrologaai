/**
 * Avatar Upload Controller
 * US-28: Edit Profile
 *
 * Handles profile picture upload with image processing (resize/crop to square)
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Upload avatar
 * POST /api/v1/user/avatar
 *
 * Accepts multipart form data with 'avatar' field
 * Validates: JPG, PNG, max 2MB
 * Resizes to square avatar (256x256) if sharp is available
 */
export declare function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Delete avatar
 * DELETE /api/v1/user/avatar
 */
export declare function deleteAvatar(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Send email verification for pending email change
 * POST /api/v1/user/verify-email
 */
export declare function sendEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Verify pending email change
 * POST /api/v1/user/confirm-email
 */
export declare function confirmEmailChange(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Cancel pending email change
 * POST /api/v1/user/cancel-email-change
 */
export declare function cancelEmailChange(req: Request, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    uploadAvatar: typeof uploadAvatar;
    deleteAvatar: typeof deleteAvatar;
    sendEmailVerification: typeof sendEmailVerification;
    confirmEmailChange: typeof confirmEmailChange;
    cancelEmailChange: typeof cancelEmailChange;
};
export default _default;
//# sourceMappingURL=avatarController.d.ts.map