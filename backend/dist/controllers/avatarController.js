"use strict";
/**
 * Avatar Upload Controller
 * US-28: Edit Profile
 *
 * Handles profile picture upload with image processing (resize/crop to square)
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = uploadAvatar;
exports.deleteAvatar = deleteAvatar;
exports.sendEmailVerification = sendEmailVerification;
exports.confirmEmailChange = confirmEmailChange;
exports.cancelEmailChange = cancelEmailChange;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const crypto_1 = require("crypto");
// Avatar upload directory
const AVATAR_DIR = path_1.default.join(process.cwd(), 'public', 'avatars');
// Ensure avatar directory exists
function ensureAvatarDir() {
    if (!fs_1.default.existsSync(AVATAR_DIR)) {
        fs_1.default.mkdirSync(AVATAR_DIR, { recursive: true });
    }
}
/**
 * Upload avatar
 * POST /api/v1/user/avatar
 *
 * Accepts multipart form data with 'avatar' field
 * Validates: JPG, PNG, max 2MB
 * Resizes to square avatar (256x256) if sharp is available
 */
async function uploadAvatar(req, res, next) {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        // Check if file was uploaded - access via any type to avoid TS issues with multer
        const file = req.file;
        if (!file) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'NO_FILE',
                    message: 'No avatar file provided',
                },
            });
            return;
        }
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            // Clean up uploaded file
            if (fs_1.default.existsSync(file.path)) {
                fs_1.default.unlinkSync(file.path);
            }
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_FILE_TYPE',
                    message: 'Only JPG and PNG images are allowed',
                },
            });
            return;
        }
        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            // Clean up uploaded file
            if (fs_1.default.existsSync(file.path)) {
                fs_1.default.unlinkSync(file.path);
            }
            res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: 'Avatar file must be less than 2MB',
                },
            });
            return;
        }
        ensureAvatarDir();
        // Try to process with Sharp, fall back to plain copy if not available
        let finalPath;
        let filename;
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const sharp = require('sharp');
            // Generate unique filename
            filename = `avatar_${req.user.id}_${Date.now()}.jpg`;
            finalPath = path_1.default.join(AVATAR_DIR, filename);
            // Process image: resize to 256x256, crop to center square, convert to JPEG
            await sharp(file.path)
                .resize(256, 256, {
                fit: 'cover',
                position: 'center',
            })
                .jpeg({ quality: 85 })
                .toFile(finalPath);
            // Clean up original upload
            if (fs_1.default.existsSync(file.path)) {
                fs_1.default.unlinkSync(file.path);
            }
        }
        catch (sharpError) {
            // Sharp not available, just copy the file
            console.warn('[Avatar Upload] Sharp not available, using original file');
            // Determine extension
            const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
            filename = `avatar_${req.user.id}_${Date.now()}${ext}`;
            finalPath = path_1.default.join(AVATAR_DIR, filename);
            // Copy file to avatars directory
            fs_1.default.copyFileSync(file.path, finalPath);
            // Clean up original upload
            if (fs_1.default.existsSync(file.path)) {
                fs_1.default.unlinkSync(file.path);
            }
        }
        // Get old avatar URL for cleanup
        const oldUser = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { avatarUrl: true },
        });
        // Delete old avatar if exists
        if (oldUser?.avatarUrl) {
            const oldFilename = path_1.default.basename(oldUser.avatarUrl);
            const oldPath = path_1.default.join(AVATAR_DIR, oldFilename);
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        // Generate public URL
        const avatarUrl = `/avatars/${filename}`;
        // Update user record
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                avatarUrl,
                updatedAt: new Date(),
            },
        });
        res.status(200).json({
            success: true,
            data: {
                avatarUrl,
                message: 'Avatar uploaded successfully',
            },
        });
    }
    catch (error) {
        console.error('[Avatar Upload] Error:', error);
        // Clean up uploaded file if exists
        const file = req.file;
        if (file?.path && fs_1.default.existsSync(file.path)) {
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch (cleanupError) {
                console.error('[Avatar Upload] Cleanup error:', cleanupError);
            }
        }
        next(error);
    }
}
/**
 * Delete avatar
 * DELETE /api/v1/user/avatar
 */
async function deleteAvatar(req, res, next) {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        // Get current avatar
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { avatarUrl: true },
        });
        if (!user?.avatarUrl) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NO_AVATAR',
                    message: 'No avatar to delete',
                },
            });
            return;
        }
        // Delete file
        const filename = path_1.default.basename(user.avatarUrl);
        const filePath = path_1.default.join(AVATAR_DIR, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Update user record
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                avatarUrl: null,
                updatedAt: new Date(),
            },
        });
        res.status(200).json({
            success: true,
            data: {
                message: 'Avatar deleted successfully',
            },
        });
    }
    catch (error) {
        console.error('[Avatar Delete] Error:', error);
        next(error);
    }
}
/**
 * Send email verification for pending email change
 * POST /api/v1/user/verify-email
 */
async function sendEmailVerification(req, res, next) {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'EMAIL_REQUIRED',
                    message: 'Email address is required',
                },
            });
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_EMAIL',
                    message: 'Please provide a valid email address',
                },
            });
            return;
        }
        // Check for duplicate email
        const existingUser = await prisma_1.default.user.findFirst({
            where: {
                email: email.toLowerCase(),
                id: { not: req.user.id },
            },
        });
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: {
                    code: 'EMAIL_EXISTS',
                    message: 'An account with this email already exists',
                },
            });
            return;
        }
        // Generate verification token
        const verificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        // Store pending email and token
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                pendingEmail: email.toLowerCase(),
                pendingEmailToken: verificationToken,
                updatedAt: new Date(),
            },
        });
        // Send verification email
        try {
            const { Resend } = await Promise.resolve().then(() => __importStar(require('resend')));
            const resend = new Resend(process.env.RESEND_API_KEY);
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&userId=${req.user.id}`;
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
                to: email,
                subject: 'Потвърдете новия си имейл адрес / Confirm your new email address',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7C3AED;">AstroLogAI</h1>
            <p>Получихме заявка за промяна на имейл адреса ви.</p>
            <p>За да потвърдите новия си имейл, моля, кликнете върху бутона по-долу:</p>
            <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; margin: 20px 0;">
              Потвърди имейл
            </a>
            <p>Ако не сте направили тази заявка, можете да игнорирате този имейл.</p>
            <hr style="border: none; border-top: 1px solid #252532; margin: 20px 0;">
            <p style="color: #71717A; font-size: 12px;">
              ---
            </p>
            <p style="color: #71717A; font-size: 12px;">
              We received a request to change your email address.<br>
              To confirm your new email, please click the button above.
            </p>
          </div>
        `,
            });
        }
        catch (emailError) {
            console.error('[Email Verification] Failed to send email:', emailError);
            // Don't fail the request if email fails, just log it
        }
        res.status(200).json({
            success: true,
            data: {
                message: 'Verification email sent. Please check your inbox.',
            },
        });
    }
    catch (error) {
        console.error('[Email Verification] Error:', error);
        next(error);
    }
}
/**
 * Verify pending email change
 * POST /api/v1/user/confirm-email
 */
async function confirmEmailChange(req, res, next) {
    try {
        const { token, userId } = req.body;
        if (!token || !userId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'TOKEN_REQUIRED',
                    message: 'Verification token and user ID are required',
                },
            });
            return;
        }
        // Find user with pending email
        const user = await prisma_1.default.user.findFirst({
            where: {
                id: userId,
                pendingEmailToken: token,
            },
        });
        if (!user) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired verification token',
                },
            });
            return;
        }
        if (!user.pendingEmail) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'NO_PENDING_EMAIL',
                    message: 'No pending email change to confirm',
                },
            });
            return;
        }
        // Update email
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                email: user.pendingEmail,
                pendingEmail: null,
                pendingEmailToken: null,
                emailVerified: true,
                updatedAt: new Date(),
            },
        });
        res.status(200).json({
            success: true,
            data: {
                message: 'Email confirmed successfully',
            },
        });
    }
    catch (error) {
        console.error('[Email Confirmation] Error:', error);
        next(error);
    }
}
/**
 * Cancel pending email change
 * POST /api/v1/user/cancel-email-change
 */
async function cancelEmailChange(req, res, next) {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                pendingEmail: null,
                pendingEmailToken: null,
                updatedAt: new Date(),
            },
        });
        res.status(200).json({
            success: true,
            data: {
                message: 'Pending email change cancelled',
            },
        });
    }
    catch (error) {
        console.error('[Cancel Email Change] Error:', error);
        next(error);
    }
}
exports.default = {
    uploadAvatar,
    deleteAvatar,
    sendEmailVerification,
    confirmEmailChange,
    cancelEmailChange,
};
//# sourceMappingURL=avatarController.js.map