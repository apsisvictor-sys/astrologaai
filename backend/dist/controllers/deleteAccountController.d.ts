/**
 * Delete Account Controller
 * US-31: Delete Account (GDPR Right to be Forgotten)
 *
 * Handles permanent account deletion with all associated data
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Delete user account permanently
 * DELETE /api/v1/user
 *
 * GDPR Compliance - Hard delete all user data
 *
 * Acceptance Criteria:
 * - User can delete their account with password confirmation
 * - All user data is permanently deleted (GDPR right to be forgotten)
 * - User receives confirmation of deletion
 * - Active sessions are invalidated
 * - Active subscription is cancelled
 */
export declare function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    deleteAccount: typeof deleteAccount;
};
export default _default;
//# sourceMappingURL=deleteAccountController.d.ts.map