import { RegisterInput } from '../utils/validation';
export interface RegisterResult {
    user: {
        id: string;
        email: string;
        fullName: string | null;
        tier: string;
        language: string;
        emailVerified: boolean;
        createdAt: Date;
    };
    session: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}
export interface AuthError {
    code: string;
    message: string;
    statusCode: number;
}
export declare class AuthService {
    /**
     * Register a new user
     */
    static register(data: RegisterInput): Promise<RegisterResult>;
    /**
     * Generate JWT access and refresh tokens
     * SECURITY FIX: Uses 'sub' claim for userId (standard JWT claim) and validated JWT_SECRET
     */
    static generateTokens(userId: string, email: string): {
        accessToken: never;
        refreshToken: never;
        expiresIn: number;
    };
    /**
     * Parse JWT expiresIn string to seconds
     */
    private static parseExpiresIn;
    /**
     * Verify password against hash
     */
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    /**
     * Verify JWT token
     * SECURITY FIX: Uses validated JWT_SECRET and expects 'sub' claim
     */
    static verifyToken(token: string): {
        userId: string;
        email: string;
    } | null;
}
export default AuthService;
//# sourceMappingURL=authService.d.ts.map