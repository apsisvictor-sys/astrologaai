"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
// SECURITY FIX: Import validated JWT secret (no insecure fallbacks)
const jwt_1 = require("../utils/jwt");
const SALT_ROUNDS = 12;
class AuthService {
    /**
     * Register a new user
     */
    static async register(data) {
        const { email, password, fullName } = data;
        // Check if user already exists
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw {
                code: 'EMAIL_EXISTS',
                message: 'An account with this email already exists',
                statusCode: 409,
            };
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        // Create user with default preferences
        const user = await prisma_1.default.user.create({
            data: {
                email,
                passwordHash,
                fullName: fullName || null,
                tier: 'FREE',
                language: 'bg',
                emailVerified: false,
            },
        });
        // Create default profile with notification preferences
        await prisma_1.default.profile.create({
            data: {
                userId: user.id,
                notificationPrefs: {
                    email: true,
                    push: false,
                    dailyHoroscope: true,
                    weeklyForecast: true,
                },
            },
        });
        // Create usage record for current month
        const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"
        await prisma_1.default.usageRecord.create({
            data: {
                userId: user.id,
                month: currentMonth,
                queryCount: 0,
            },
        });
        // Generate tokens
        const tokens = this.generateTokens(user.id, user.email);
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                tier: user.tier,
                language: user.language,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
            },
            session: tokens,
        };
    }
    /**
     * Generate JWT access and refresh tokens
     * SECURITY FIX: Uses 'sub' claim for userId (standard JWT claim) and validated JWT_SECRET
     */
    static generateTokens(userId, email) {
        // @ts-expect-error - Type mismatch between string and StringValue from ms
        const accessToken = jsonwebtoken_1.default.sign({ sub: userId, email }, // Use 'sub' claim for consistency with HTTP/WebSocket auth
        jwt_1.JWT_SECRET, { expiresIn: jwt_1.JWT_CONFIG.expiresIn });
        // @ts-expect-error - Type mismatch between string and StringValue from ms  
        const refreshToken = jsonwebtoken_1.default.sign({ sub: userId, email, type: 'refresh' }, // Use 'sub' claim for consistency
        jwt_1.JWT_SECRET, { expiresIn: jwt_1.JWT_CONFIG.refreshExpiresIn });
        // Calculate expiration time in seconds
        const expiresIn = this.parseExpiresIn(jwt_1.JWT_CONFIG.expiresIn);
        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }
    /**
     * Parse JWT expiresIn string to seconds
     */
    static parseExpiresIn(expiresIn) {
        const unit = expiresIn.slice(-1);
        const value = parseInt(expiresIn.slice(0, -1));
        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 60 * 60;
            case 'd':
                return value * 60 * 60 * 24;
            default:
                return 900; // Default 15 minutes
        }
    }
    /**
     * Verify password against hash
     */
    static async verifyPassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    /**
     * Verify JWT token
     * SECURITY FIX: Uses validated JWT_SECRET and expects 'sub' claim
     */
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwt_1.JWT_SECRET);
            // Map 'sub' back to 'userId' for backward compatibility with callers
            return { userId: decoded.sub, email: decoded.email };
        }
        catch {
            return null;
        }
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=authService.js.map