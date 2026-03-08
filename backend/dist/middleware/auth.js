"use strict";
/**
 * Auth Middleware
 * JWT token verification for protected routes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
const jwt = __importStar(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
// SECURITY FIX: Import validated JWT secret (no insecure fallbacks)
const jwt_1 = require("../utils/jwt");
const prisma = new client_1.PrismaClient();
/**
 * Verify JWT token middleware
 */
async function authMiddleware(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'No token provided. Please login to access this resource.',
                },
            });
            return;
        }
        const token = authHeader.split(' ')[1];
        // Verify token
        const decoded = jwt.verify(token, jwt_1.JWT_SECRET);
        // Verify user still exists and get language preference
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { id: true, email: true, tier: true, language: true },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found. Please login again.',
                },
            });
            return;
        }
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            tier: user.tier,
            language: user.language || 'bg',
        };
        next();
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Your session has expired. Please login again.',
                },
            });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid token. Please login again.',
                },
            });
            return;
        }
        console.error('[Auth Middleware] Error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred during authentication.',
            },
        });
    }
}
/**
 * Optional auth middleware - doesn't fail if no token
 */
async function optionalAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token, continue without user
            next();
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, jwt_1.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { id: true, email: true, tier: true, language: true },
        });
        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                tier: user.tier,
                language: user.language || 'bg',
            };
        }
        next();
    }
    catch {
        // Token invalid, continue without user
        next();
    }
}
exports.default = authMiddleware;
//# sourceMappingURL=auth.js.map