/**
 * Avatar Upload Controller
 * US-28: Edit Profile
 * 
 * Handles profile picture upload with image processing (resize/crop to square)
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma';
import { randomBytes } from 'crypto';
import { render } from '@react-email/render';
import { VerificationEmail } from '../emails/VerificationEmail';

// Avatar upload directory
const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// Ensure avatar directory exists
function ensureAvatarDir() {
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }
}

// Multer file type (simplified)
interface MulterFile {
  path: string;
  mimetype: string;
  size: number;
  originalname: string;
}

/**
 * Upload avatar
 * POST /api/v1/user/avatar
 * 
 * Accepts multipart form data with 'avatar' field
 * Validates: JPG, PNG, max 2MB
 * Resizes to square avatar (256x256) if sharp is available
 */
export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const file = (req as Request & { file?: MulterFile }).file;
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
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
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
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
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
    let finalPath: string;
    let filename: string;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require('sharp');
      
      // Generate unique filename
      filename = `avatar_${req.user.id}_${Date.now()}.jpg`;
      finalPath = path.join(AVATAR_DIR, filename);

      // Process image: resize to 256x256, crop to center square, convert to JPEG
      await sharp(file.path)
        .resize(256, 256, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toFile(finalPath);

      // Clean up original upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (sharpError) {
      // Sharp not available, just copy the file
      console.warn('[Avatar Upload] Sharp not available, using original file');
      
      // Determine extension
      const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
      filename = `avatar_${req.user.id}_${Date.now()}${ext}`;
      finalPath = path.join(AVATAR_DIR, filename);

      // Copy file to avatars directory
      fs.copyFileSync(file.path, finalPath);
      
      // Clean up original upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    // Get old avatar URL for cleanup
    const oldUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });

    // Delete old avatar if exists
    if (oldUser?.avatarUrl) {
      const oldFilename = path.basename(oldUser.avatarUrl);
      const oldPath = path.join(AVATAR_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Generate public URL
    const avatarUrl = `/avatars/${filename}`;

    // Update user record
    await prisma.user.update({
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
  } catch (error) {
    console.error('[Avatar Upload] Error:', error);
    
    // Clean up uploaded file if exists
    const file = (req as Request & { file?: MulterFile }).file;
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
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
export async function deleteAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const user = await prisma.user.findUnique({
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
    const filename = path.basename(user.avatarUrl);
    const filePath = path.join(AVATAR_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update user record
    await prisma.user.update({
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
  } catch (error) {
    console.error('[Avatar Delete] Error:', error);
    next(error);
  }
}

/**
 * Send email verification for pending email change
 * POST /api/v1/user/verify-email
 */
export async function sendEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { email, language = 'bg' } = req.body;

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
    const existingUser = await prisma.user.findFirst({
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
    const verificationToken = randomBytes(32).toString('hex');

    // Store pending email and token
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        pendingEmail: email.toLowerCase(),
        pendingEmailToken: verificationToken,
        updatedAt: new Date(),
      },
    });

    // Send verification email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&userId=${req.user.id}`;

      // Function-call form — no JSX needed in a .ts file
      const html = await render(VerificationEmail({ verifyUrl: verificationUrl, language }));

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
        to: email,
        subject: language === 'bg'
          ? 'Потвърдете имейл адреса си - AstroLogAI'
          : 'Verify your email address - AstroLogAI',
        html,
      });
    } catch (emailError) {
      console.error('[Email Verification] Failed to send email:', emailError);
      // Don't fail the request if email fails, just log it
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Verification email sent. Please check your inbox.',
      },
    });
  } catch (error) {
    console.error('[Email Verification] Error:', error);
    next(error);
  }
}

/**
 * Verify pending email change
 * POST /api/v1/user/confirm-email
 */
export async function confirmEmailChange(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const user = await prisma.user.findFirst({
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
    await prisma.user.update({
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
  } catch (error) {
    console.error('[Email Confirmation] Error:', error);
    next(error);
  }
}

/**
 * Cancel pending email change
 * POST /api/v1/user/cancel-email-change
 */
export async function cancelEmailChange(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    await prisma.user.update({
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
  } catch (error) {
    console.error('[Cancel Email Change] Error:', error);
    next(error);
  }
}

export default {
  uploadAvatar,
  deleteAvatar,
  sendEmailVerification,
  confirmEmailChange,
  cancelEmailChange,
};
