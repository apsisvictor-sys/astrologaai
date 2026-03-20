/**
 * Delete Account Controller
 * US-31: Delete Account (GDPR Right to be Forgotten)
 * 
 * Handles permanent account deletion with all associated data
 */

import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import Stripe from 'stripe';

// Initialize Stripe (optional - for subscription cancellation)
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
} catch (error) {
  console.warn('[Delete Account] Stripe initialization failed:', error);
}

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
export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { password } = req.body;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: true,
        profile: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // OAuth-only users have no passwordHash — JWT auth is sufficient proof of identity
    const isOAuthOnly = !user.passwordHash;

    if (!isOAuthOnly) {
      // Validate password is provided
      if (!password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password confirmation is required',
            details: [
              {
                field: 'password',
                message: 'Please enter your password to confirm account deletion',
              },
            ],
          },
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash as string);

      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Incorrect password. Please try again.',
          },
        });
        return;
      }
    }

    // Store user email for confirmation message before deletion
    const userEmail = user.email;
    const userLanguage = user.language || 'bg';

    // Cancel active Stripe subscription if exists
    if (user.subscription?.stripeSubscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId, {
          prorate: false, // Don't prorate - immediate cancellation
        });
        console.log(`[Delete Account] Cancelled Stripe subscription for user: ${user.id}`);
      } catch (stripeError) {
        // Log but don't fail - subscription might already be cancelled
        console.warn('[Delete Account] Failed to cancel Stripe subscription:', stripeError);
      }
    }

    // Delete all related data (in order due to foreign key constraints)
    // Note: Some tables have onDelete: Cascade, but we delete explicitly for safety

    try {
      // 1. Delete notification preferences
      await prisma.notificationPreference.deleteMany({
        where: { userId: user.id },
      });

      // 2. Delete usage records
      await prisma.usageRecord.deleteMany({
        where: { userId: user.id },
      });

      // 3. Delete chat messages (via sessions - cascade)
      // Get all session IDs first
      const sessions = await prisma.chatSession.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        
        // Delete all messages in these sessions
        await prisma.chatMessage.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        
        // Delete the sessions
        await prisma.chatSession.deleteMany({
          where: { userId: user.id },
        });
      }

      // 4. Delete legacy messages
      await prisma.message.deleteMany({
        where: { userId: user.id },
      });

      // 5. Delete partners
      await prisma.partner.deleteMany({
        where: { userId: user.id },
      });

      // 6. Delete chart history (via birth charts)
      const birthCharts = await prisma.birthChart.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      if (birthCharts.length > 0) {
        const chartIds = birthCharts.map(c => c.id);
        
        await prisma.chartHistory.deleteMany({
          where: { chartId: { in: chartIds } },
        });
      }

      // 7. Delete birth charts
      await prisma.birthChart.deleteMany({
        where: { userId: user.id },
      });

      // 8. Delete birth profiles
      await prisma.birthProfile.deleteMany({
        where: { userId: user.id },
      });

      // 9. Delete profile
      await prisma.profile.deleteMany({
        where: { userId: user.id },
      });

      // 11. Delete subscription
      await prisma.subscription.deleteMany({
        where: { userId: user.id },
      });

      // 12. Finally, delete the user record
      await prisma.user.delete({
        where: { id: user.id },
      });

      console.log(`[Delete Account] Successfully deleted user: ${user.id} (${userEmail})`);

      // Send confirmation email
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const emailSubject = userLanguage === 'bg'
          ? 'Акаунтът е изтрит - AstroLogAI'
          : 'Account Deleted - AstroLogAI';

        const emailHtml = userLanguage === 'bg'
          ? `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">✨ AstroLogAI</h1>
              </div>
              <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">Вашият акаунт е изтрит</h2>
              <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Потвърждаваме, че вашият акаунт и всички свързани данни бяха окончателно изтрити съгласно вашето искане.
              </p>
              <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Изтрити данни</h3>
                <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Информация за акаунта</li>
                  <li style="margin-bottom: 8px;">Рождени данни и карти</li>
                  <li style="margin-bottom: 8px;">История на чатовете</li>
                  <li style="margin-bottom: 8px;">Партньори и връзки</li>
                  <li style="margin-bottom: 8px;">Абонамент и плащания</li>
                  <li>Настройки и предпочитания</li>
                </ul>
              </div>
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #EF4444; font-size: 14px; margin: 0;">
                  ⚠️ Това действие е необратимо. Всички данни са окончателно изтрити.
                </p>
              </div>
              <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
                Благодарим ви, че използвахте AstroLogAI. Надяваме се да се видим отново!
              </p>
              <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
                © 2026 AstroLogAI. Всички права запазени.<br>
                За въпроси: support@astrologaai.com
              </p>
            </div>
          `
          : `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">✨ AstroLogAI</h1>
              </div>
              <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">Your Account Has Been Deleted</h2>
              <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                We confirm that your account and all associated data have been permanently deleted as requested.
              </p>
              <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Deleted Data</h3>
                <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Account information</li>
                  <li style="margin-bottom: 8px;">Birth data and charts</li>
                  <li style="margin-bottom: 8px;">Chat history</li>
                  <li style="margin-bottom: 8px;">Partners and relationships</li>
                  <li style="margin-bottom: 8px;">Subscription and payments</li>
                  <li>Settings and preferences</li>
                </ul>
              </div>
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #EF4444; font-size: 14px; margin: 0;">
                  ⚠️ This action is irreversible. All data has been permanently deleted.
                </p>
              </div>
              <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
                Thank you for using AstroLogAI. We hope to see you again!
              </p>
              <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
                © 2026 AstroLogAI. All rights reserved.<br>
                Questions? support@astrologaai.com
              </p>
            </div>
          `;

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
          to: userEmail,
          subject: emailSubject,
          html: emailHtml,
        });

        console.log(`[Delete Account] Confirmation email sent to: ${userEmail}`);
      } catch (emailError) {
        console.error('[Delete Account] Failed to send confirmation email:', emailError);
        // Don't fail - account was still deleted
      }

      // Return success
      res.status(200).json({
        success: true,
        data: {
          message: userLanguage === 'bg'
            ? 'Вашият акаунт е успешно изтрит. Всички данни са премахнати.'
            : 'Your account has been successfully deleted. All data has been removed.',
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (deleteError) {
      console.error('[Delete Account] Error during data deletion:', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('[Delete Account] Error:', error);
    next(error);
  }
}

export default {
  deleteAccount,
};
