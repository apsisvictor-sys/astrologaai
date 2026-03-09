/**
 * PDF Controller
 * US-17: Generate Chart PDF
 * 
 * Handles PDF generation and download for natal charts
 */

import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { calculateNatalChart, NatalChart } from '../services/astrology';
// Use stub to avoid canvas dependency issues during development
import { generateNatalChartPDF, getPDFHeaders } from '../services/pdf-generator.stub';
import { redisClient } from '../utils/redis';

/**
 * POST /api/v1/birth-chart/:profileId/pdf
 * Generate and download a PDF of the natal chart
 * 
 * Query params:
 * - lang: 'en' | 'bg' (default: 'bg')
 * - preview: 'true' to return inline instead of attachment
 */
export async function generateChartPDF(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const lang = (req.query.lang as 'en' | 'bg') || 'bg';
    const preview = req.query.preview === 'true';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    if (!profileId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'profileId is required' },
      });
      return;
    }

    // Get the birth profile
    const birthProfile = await prisma.birthProfile.findFirst({
      where: { id: profileId, userId },
    });

    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }

    // Get or generate the chart
    let chart: NatalChart | null = null;
    const existingChart = await prisma.birthChart.findFirst({
      where: { birthProfileId: profileId },
    });

    if (existingChart) {
      chart = existingChart.chartData as unknown as NatalChart;
    } else {
      // Generate chart if not exists
      const birthDate = new Date(birthProfile.birthDate);
      const birthTime = birthProfile.birthTime || '12:00';
      const [hour, minute] = birthTime.split(':').map(Number);

      chart = await calculateNatalChart({
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour: hour || 12,
        minute: minute || 0,
        latitude: birthProfile.latitude,
        longitude: birthProfile.longitude,
        timezone: birthProfile.timezone,
      });

      // Save the generated chart
      await prisma.birthChart.create({
        data: {
          userId,
          birthProfileId: profileId,
          chartData: chart as any,
        },
      });
    }

    // Generate PDF
    const pdfBuffer = await generateNatalChartPDF({
      chart,
      profileName: birthProfile.name,
      birthDate: birthProfile.birthDate.toISOString(),
      birthTime: birthProfile.birthTime,
      locationName: birthProfile.locationName,
      language: lang,
    });

    // Generate filename
    const sanitizedName = birthProfile.name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_');
    const filename = `${sanitizedName}_natal_chart_${new Date().toISOString().split('T')[0]}`;

    // Set headers
    const headers = getPDFHeaders(filename);
    if (preview) {
      headers['Content-Disposition'] = `inline; filename="${filename}.pdf"`;
    }
    res.set(headers);

    // Send PDF
    res.send(pdfBuffer);

    console.log(`[PDF] Generated PDF for chart ${profileId}, size: ${pdfBuffer.length} bytes`);
  } catch (error) {
    console.error('[PDF] Generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate PDF',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
    });
  }
}

/**
 * POST /api/v1/birth-chart/:profileId/pdf/email
 * Generate PDF and send via email
 * 
 * Body:
 * - email: string (optional, defaults to user's email)
 * - lang: 'en' | 'bg' (default: 'bg')
 */
export async function emailChartPDF(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const { email: targetEmail, lang = 'bg' } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    if (!profileId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'profileId is required' },
      });
      return;
    }

    // Get user and profile
    const [user, birthProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.birthProfile.findFirst({ where: { id: profileId, userId } }),
    ]);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }

    // Get or generate chart
    let chart: NatalChart | null = null;
    const existingChart = await prisma.birthChart.findFirst({
      where: { birthProfileId: profileId },
    });

    if (existingChart) {
      chart = existingChart.chartData as unknown as NatalChart;
    } else {
      const birthDate = new Date(birthProfile.birthDate);
      const birthTime = birthProfile.birthTime || '12:00';
      const [hour, minute] = birthTime.split(':').map(Number);

      chart = await calculateNatalChart({
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour: hour || 12,
        minute: minute || 0,
        latitude: birthProfile.latitude,
        longitude: birthProfile.longitude,
        timezone: birthProfile.timezone,
      });
    }

    // Generate PDF
    const pdfBuffer = await generateNatalChartPDF({
      chart,
      profileName: birthProfile.name,
      birthDate: birthProfile.birthDate.toISOString(),
      birthTime: birthProfile.birthTime,
      locationName: birthProfile.locationName,
      language: lang,
    });

    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // For now, return the PDF as base64 for client-side handling
    const pdfBase64 = pdfBuffer.toString('base64');

    const emailToSend = targetEmail || user.email;
    const sanitizedName = birthProfile.name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_');
    const filename = `${sanitizedName}_natal_chart_${new Date().toISOString().split('T')[0]}.pdf`;

    console.log(`[PDF] Prepared PDF email for ${emailToSend}, chart: ${profileId}`);

    res.json({
      success: true,
      data: {
        message: lang === 'bg' 
          ? 'PDF готов за изпращане' 
          : 'PDF ready for email',
        email: emailToSend,
        filename,
        // Include base64 for client-side email handling
        pdfBase64,
        size: pdfBuffer.length,
      },
    });
  } catch (error) {
    console.error('[PDF] Email error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to prepare PDF email' },
    });
  }
}

/**
 * GET /api/v1/birth-chart/:profileId/pdf/status
 * Check if PDF generation is available for the chart
 */
export async function getPDFStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    const birthProfile = await prisma.birthProfile.findFirst({
      where: { id: profileId, userId },
      include: { birthChart: true },
    });

    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        canGeneratePDF: false,
        hasChart: !!birthProfile.birthChart,
        profileName: birthProfile.name,
        supportedLanguages: ['en', 'bg'],
      },
    });
  } catch (error) {
    console.error('[PDF] Status error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check PDF status' },
    });
  }
}
