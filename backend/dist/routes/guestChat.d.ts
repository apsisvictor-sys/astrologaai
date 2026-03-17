/**
 * Guest Chat Routes
 * Public chat endpoint for unauthenticated users
 * Rate limited + HMAC-signed session tokens for abuse prevention
 */
declare const router: import("express-serve-static-core").Router;
export declare const MAX_GUEST_MESSAGES = 10;
export declare function signGuestToken(sessionId: string, ip: string): string;
export declare function verifyGuestToken(token: string, ip: string): {
    sessionId: string;
    createdAt: number;
    ip: string;
} | null;
export default router;
//# sourceMappingURL=guestChat.d.ts.map