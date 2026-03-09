/**
 * Export Data Controller
 * US-32: Export User Data (GDPR Data Portability)
 * 
 * Handles asynchronous data export in JSON or PDF format
 * 
 * Acceptance Criteria:
 * - User can request export of all their data
 * - Export includes: profile, birth chart, chat history, forecasts, partners
 * - Export generated asynchronously (large datasets)
 * - User receives email with download link when ready
 * - Download link expires after 7 days
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { redisClient } from '../utils/redis';
import { generateDataExportPDF } from '../services/data-export-pdf';

// Export types
type ExportFormat = 'json' | 'pdf';
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ExportRecord {
  id: string;
  userId: string;
  format: ExportFormat;
  status: ExportStatus;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
}

// Redis key prefix for export records
const EXPORT_KEY_PREFIX = 'export:';
const EXPORT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Request a data export
 * POST /api/v1/user/export
 * 
 * @body { format: 'json' | 'pdf' }
 * @returns { exportId: string, estimatedTime: string }
 */
export async function requestExport(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { format = 'json' } = req.body;

    // Validate format
    if (format !== 'json' && format !== 'pdf') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Format must be "json" or "pdf"',
        },
      });
      return;
    }

    if (format === 'pdf') {
      res.status(501).json({
        success: false,
        error: {
          code: 'FEATURE_UNAVAILABLE',
          message: 'PDF export is temporarily unavailable. Please use JSON format.',
        },
      });
      return;
    }

    const userId = req.user.id;
    const exportId = generateExportId();
    
    // Create export record
    const exportRecord: ExportRecord = {
      id: exportId,
      userId,
      format,
      status: 'pending',
      createdAt: new Date(),
    };

    // Store in Redis with TTL
    await redisClient.setEx(
      `${EXPORT_KEY_PREFIX}${exportId}`,
      EXPORT_TTL,
      JSON.stringify(exportRecord)
    );

    // Also store user's export request in a list (for rate limiting)
    const userExportsKey = `${EXPORT_KEY_PREFIX}user:${userId}`;
    await redisClient.lPush(userExportsKey, exportId);
    await redisClient.lTrim(userExportsKey, 0, 4); // Keep only last 5 exports
    await redisClient.expire(userExportsKey, EXPORT_TTL);

    // Process export asynchronously
    processExportAsync(exportId, userId, format).catch(err => {
      console.error(`[Export] Error processing export ${exportId}:`, err);
    });

    // Get user for language preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true, email: true },
    });

    const lang = user?.language === 'en' ? 'en' : 'bg';
    const estimatedTime = lang === 'bg' 
      ? 'Няколко минути (ще получите имейл)' 
      : 'A few minutes (you will receive an email)';

    console.log(`[Export] Created export request ${exportId} for user ${userId}, format: ${format}`);

    res.status(202).json({
      success: true,
      data: {
        exportId,
        status: 'pending',
        format,
        estimatedTime,
        createdAt: exportRecord.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Export] Error creating export request:', error);
    next(error);
  }
}

/**
 * Get export status
 * GET /api/v1/user/export/:id
 */
export async function getExportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { id: exportId } = req.params;
    const userId = req.user.id;

    // Get export record from Redis
    const recordJson = await redisClient.get(`${EXPORT_KEY_PREFIX}${exportId}`);

    if (!recordJson) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Export not found or expired',
        },
      });
      return;
    }

    const record: ExportRecord = JSON.parse(recordJson);

    // Verify ownership
    if (record.userId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this export',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        exportId: record.id,
        format: record.format,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        completedAt: record.completedAt?.toISOString(),
        downloadUrl: record.downloadUrl,
        expiresAt: new Date(record.createdAt.getTime() + EXPORT_TTL * 1000).toISOString(),
        error: record.error,
      },
    });
  } catch (error) {
    console.error('[Export] Error getting export status:', error);
    next(error);
  }
}

/**
 * Download exported data
 * GET /api/v1/user/export/:id/download
 */
export async function downloadExport(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { id: exportId } = req.params;
    const userId = req.user.id;

    // Get export record from Redis
    const recordJson = await redisClient.get(`${EXPORT_KEY_PREFIX}${exportId}`);

    if (!recordJson) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Export not found or expired',
        },
      });
      return;
    }

    const record: ExportRecord = JSON.parse(recordJson);

    // Verify ownership
    if (record.userId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this export',
        },
      });
      return;
    }

    // Check status
    if (record.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: {
          code: 'NOT_READY',
          message: record.status === 'failed' 
            ? 'Export failed. Please try again.'
            : 'Export is still processing. Please wait.',
        },
      });
      return;
    }

    // Get the export data
    const dataKey = `${EXPORT_KEY_PREFIX}data:${exportId}`;
    const exportData = await redisClient.get(dataKey);

    if (!exportData) {
      res.status(404).json({
        success: false,
        error: {
          code: 'EXPIRED',
          message: 'Export data has expired. Please request a new export.',
        },
      });
      return;
    }

    // Set response headers based on format
    const filename = `astrologaai-export-${new Date().toISOString().split('T')[0]}`;

    if (record.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.send(exportData);
    } else {
      // PDF format - data is base64 encoded
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.send(Buffer.from(exportData, 'base64'));
    }
  } catch (error) {
    console.error('[Export] Error downloading export:', error);
    next(error);
  }
}

/**
 * List user's export history
 * GET /api/v1/user/export
 */
export async function listExports(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const userId = req.user.id;

    // Get user's recent export IDs
    const userExportsKey = `${EXPORT_KEY_PREFIX}user:${userId}`;
    const exportIds = await redisClient.lRange(userExportsKey, 0, 4);

    // Fetch each export record
    const exports = await Promise.all(
      exportIds.map(async (id: string) => {
        const recordJson = await redisClient.get(`${EXPORT_KEY_PREFIX}${id}`);
        if (!recordJson) return null;
        
        const record: ExportRecord = JSON.parse(recordJson);
        return {
          exportId: record.id,
          format: record.format,
          status: record.status,
          createdAt: record.createdAt.toISOString(),
          completedAt: record.completedAt?.toISOString(),
          expiresAt: new Date(record.createdAt.getTime() + EXPORT_TTL * 1000).toISOString(),
        };
      })
    );

    // Filter out null values (expired exports)
    const validExports = exports.filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        exports: validExports,
        maxExports: 5,
      },
    });
  } catch (error) {
    console.error('[Export] Error listing exports:', error);
    next(error);
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique export ID
 */
function generateExportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `exp_${timestamp}_${random}`;
}

/**
 * Process export asynchronously
 */
async function processExportAsync(exportId: string, userId: string, format: ExportFormat): Promise<void> {
  const key = `${EXPORT_KEY_PREFIX}${exportId}`;
  
  try {
    // Update status to processing
    await updateExportStatus(key, 'processing');

    // Fetch all user data
    const userData = await fetchUserData(userId);

    let exportData: string;
    let downloadUrl: string;

    if (format === 'json') {
      exportData = JSON.stringify(userData, null, 2);
      downloadUrl = `/api/v1/user/export/${exportId}/download`;
    } else {
      // Generate PDF
      const pdfBuffer = await generateDataExportPDF(userData);
      exportData = pdfBuffer.toString('base64');
      downloadUrl = `/api/v1/user/export/${exportId}/download`;
    }

    // Store export data
    const dataKey = `${EXPORT_KEY_PREFIX}data:${exportId}`;
    await redisClient.setEx(dataKey, EXPORT_TTL, exportData);

    // Update status to completed
    await updateExportStatus(key, 'completed', downloadUrl);

    // Send email notification
    await sendExportReadyEmail(userId, exportId, format);

    console.log(`[Export] Completed export ${exportId} for user ${userId}`);
  } catch (error) {
    console.error(`[Export] Failed to process export ${exportId}:`, error);
    
    // Update status to failed
    await updateExportStatus(
      key, 
      'failed', 
      undefined, 
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Update export status in Redis
 */
async function updateExportStatus(
  key: string, 
  status: ExportStatus, 
  downloadUrl?: string,
  error?: string
): Promise<void> {
  const recordJson = await redisClient.get(key);
  if (!recordJson) return;

  const record: ExportRecord = JSON.parse(recordJson);
  record.status = status;
  if (downloadUrl) record.downloadUrl = downloadUrl;
  if (error) record.error = error;
  if (status === 'completed' || status === 'failed') {
    record.completedAt = new Date();
  }

  // Get remaining TTL
  const ttl = await redisClient.ttl(key);
  if (ttl > 0) {
    await redisClient.setEx(key, ttl, JSON.stringify(record));
  }
}

/**
 * Fetch all user data from database
 */
async function fetchUserData(userId: string): Promise<UserExportData> {
  // Fetch user with all related data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      birthData: true,
      birthProfiles: {
        include: {
          birthChart: {
            include: {
              historyEntries: true,
            },
          },
        },
      },
      birthChart: {
        include: {
          historyEntries: true,
        },
      },
      chatSessions: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      partners: true,
      subscription: true,
      notificationPreference: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch forecasts (from Redis cache if available, otherwise generate summary)
  const forecasts = await fetchUserForecasts(userId);

  // Structure the export data
  const exportData: UserExportData = {
    exportInfo: {
      exportedAt: new Date().toISOString(),
      format: 'AstroLogAI Data Export',
      version: '1.0.0',
    },
    profile: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      language: user.language,
      tier: user.tier,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    },
    birthData: user.birthData ? {
      date: user.birthData.date.toISOString(),
      time: user.birthData.time,
      place: user.birthData.place,
      latitude: user.birthData.latitude,
      longitude: user.birthData.longitude,
      timezone: user.birthData.timezone,
      isUnknownTime: user.birthData.isUnknownTime,
    } : null,
    birthProfiles: user.birthProfiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      birthDate: profile.birthDate.toISOString(),
      birthTime: profile.birthTime,
      locationName: profile.locationName,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
      isUnknownTime: profile.isUnknownTime,
      chart: profile.birthChart ? {
        chartData: profile.birthChart.chartData,
        createdAt: profile.birthChart.createdAt.toISOString(),
        history: profile.birthChart.historyEntries.map(h => ({
          archivedAt: h.archivedAt.toISOString(),
          reason: h.reason,
          birthDate: h.birthDate.toISOString(),
          locationName: h.locationName,
        })),
      } : null,
    })),
    birthChart: user.birthChart ? {
      chartData: user.birthChart.chartData,
      createdAt: user.birthChart.createdAt.toISOString(),
      history: user.birthChart.historyEntries.map(h => ({
        archivedAt: h.archivedAt.toISOString(),
        reason: h.reason,
        birthDate: h.birthDate.toISOString(),
        locationName: h.locationName,
      })),
    } : null,
    chatHistory: user.chatSessions.map(session => ({
      id: session.id,
      title: session.title,
      summary: session.summary,
      createdAt: session.createdAt.toISOString(),
      messages: session.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
    })),
    forecasts,
    partners: user.partners.map(partner => ({
      id: partner.id,
      name: partner.name,
      label: partner.label,
      relationshipType: partner.relationshipType,
      birthDate: partner.birthDate.toISOString(),
      birthTime: partner.birthTime,
      locationName: partner.locationName,
      chartSummary: partner.chartSummary,
      notes: partner.notes,
      createdAt: partner.createdAt.toISOString(),
    })),
    subscription: user.subscription ? {
      tier: String(user.subscription.tier),
      status: String(user.subscription.status),
      currentPeriodStart: user.subscription.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() ?? null,
    } : null,
    notificationPreferences: user.notificationPreference ? {
      dailyHoroscope: user.notificationPreference.dailyHoroscope,
      weeklyForecast: user.notificationPreference.weeklyForecast,
      newReading: user.notificationPreference.newReading,
      partnerUpdates: user.notificationPreference.partnerUpdates,
      marketing: user.notificationPreference.marketing,
      emailEnabled: user.notificationPreference.emailEnabled,
      pushEnabled: user.notificationPreference.pushEnabled,
    } : null,
  };

  return exportData;
}

/**
 * Fetch user's forecast data
 */
async function fetchUserForecasts(userId: string): Promise<UserExportData['forecasts']> {
  const forecasts: UserExportData['forecasts'] = {};

  try {
    // Try to get cached forecasts from Redis
    const dailyKey = `forecast:daily:${userId}`;
    const weeklyKey = `forecast:weekly:${userId}`;

    const dailyForecast = await redisClient.get(dailyKey);
    const weeklyForecast = await redisClient.get(weeklyKey);

    if (dailyForecast) {
      forecasts.daily = JSON.parse(dailyForecast);
    }

    if (weeklyForecast) {
      forecasts.weekly = JSON.parse(weeklyForecast);
    }
  } catch (error) {
    console.warn('[Export] Could not fetch forecasts:', error);
  }

  return forecasts;
}

/**
 * Send email notification when export is ready
 */
async function sendExportReadyEmail(userId: string, exportId: string, format: ExportFormat): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, language: true, fullName: true },
    });

    if (!user) return;

    const lang = user.language === 'en' ? 'en' : 'bg';
    const downloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/export?download=${exportId}`;

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailSubject = lang === 'bg'
      ? 'Данните са готови за изтегляне - AstroLogAI'
      : 'Your Data Export is Ready - AstroLogAI';

    const emailHtml = lang === 'bg'
      ? `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">✨ AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">📦 Данните са готови за изтегляне</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Здравейте${user.fullName ? `, ${user.fullName}` : ''},
          </p>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Вашите данни в ${format.toUpperCase()} формат са готови за изтегляне.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
              Изтегли данните
            </a>
          </div>
          <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Включени данни</h3>
            <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Информация за акаунта</li>
              <li style="margin-bottom: 8px;">Рождени данни и карти</li>
              <li style="margin-bottom: 8px;">История на чатовете</li>
              <li style="margin-bottom: 8px;">Прогнози и хороскопи</li>
              <li style="margin-bottom: 8px;">Партньори и връзки</li>
              <li>Настройки и предпочитания</li>
            </ul>
          </div>
          <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8B5CF6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #CBD5E1; font-size: 14px; margin: 0;">
              ⏰ Връзката за изтегляне е валидна 7 дни.
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            Благодарим ви, че използвате AstroLogAI!
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
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">📦 Your Data Export is Ready</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hello${user.fullName ? `, ${user.fullName}` : ''},
          </p>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Your data export in ${format.toUpperCase()} format is ready for download.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
              Download Data
            </a>
          </div>
          <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Included Data</h3>
            <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Account information</li>
              <li style="margin-bottom: 8px;">Birth data and charts</li>
              <li style="margin-bottom: 8px;">Chat history</li>
              <li style="margin-bottom: 8px;">Forecasts and horoscopes</li>
              <li style="margin-bottom: 8px;">Partners and relationships</li>
              <li>Settings and preferences</li>
            </ul>
          </div>
          <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8B5CF6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #CBD5E1; font-size: 14px; margin: 0;">
              ⏰ Download link expires in 7 days.
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            Thank you for using AstroLogAI!
          </p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            © 2026 AstroLogAI. All rights reserved.<br>
            Questions? support@astrologaai.com
          </p>
        </div>
      `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log(`[Export] Sent ready email to ${user.email} for export ${exportId}`);
  } catch (error) {
    console.error('[Export] Failed to send export ready email:', error);
    // Don't throw - export was still successful
  }
}

// Export data types
interface UserExportData {
  exportInfo: {
    exportedAt: string;
    format: string;
    version: string;
  };
  profile: {
    id: string;
    email: string;
    fullName: string | null;
    language: string;
    tier: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    createdAt: string;
  };
  birthData: {
    date: string;
    time: string;
    place: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isUnknownTime: boolean;
  } | null;
  birthProfiles: Array<{
    id: string;
    name: string;
    birthDate: string;
    birthTime: string | null;
    locationName: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isUnknownTime: boolean;
    chart: {
      chartData: any;
      createdAt: string;
      history: Array<{
        archivedAt: string;
        reason: string;
        birthDate: string;
        locationName: string;
      }>;
    } | null;
  }>;
  birthChart: {
    chartData: any;
    createdAt: string;
    history: Array<{
      archivedAt: string;
      reason: string;
      birthDate: string;
      locationName: string;
    }>;
  } | null;
  chatHistory: Array<{
    id: string;
    title: string | null;
    summary: string | null;
    createdAt: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: string;
    }>;
  }>;
  forecasts: {
    daily?: any;
    weekly?: any;
  };
  partners: Array<{
    id: string;
    name: string;
    label: string | null;
    relationshipType: string;
    birthDate: string;
    birthTime: string | null;
    locationName: string;
    chartSummary: any;
    notes: string | null;
    createdAt: string;
  }>;
  subscription: {
    tier: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  } | null;
  notificationPreferences: {
    dailyHoroscope: boolean;
    weeklyForecast: boolean;
    newReading: boolean;
    partnerUpdates: boolean;
    marketing: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  } | null;
}

/**
 * Synchronous data export (immediate download)
 * GET /api/v1/user/export/download
 * 
 * US-32: Export User Data - Simple synchronous endpoint
 * Returns all user data immediately in JSON format
 */
export async function exportDataSync(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const userId = req.user.id;

    // Fetch all user data
    const userData = await fetchUserData(userId);

    // Set response headers for file download
    const fileName = `astrologaai-data-export-${new Date().toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Log the export for audit purposes
    console.log(`[Export Sync] User ${userId} exported their data at ${new Date().toISOString()}`);

    // Return the export data
    res.status(200).json(userData);
  } catch (error) {
    console.error('[Export Sync] Error:', error);
    next(error);
  }
}

export default {
  requestExport,
  getExportStatus,
  downloadExport,
  listExports,
  exportDataSync,
};
