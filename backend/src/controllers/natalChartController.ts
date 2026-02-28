/**
 * Natal Chart Controller
 * US-06: Natal Chart Generation
 * US-12: View Natal Chart
 * 
 * Handles natal chart calculation and sharing requests
 */

import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { calculateNatalChart, NatalChart, BirthDataInput } from '../services/astrology';
import { redisClient } from '../utils/redis';

/**
 * POST /api/v1/natal-chart
 * Generate or retrieve a natal chart for a birth profile
 */
export async function generateNatalChart(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { birthProfileId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    if (!birthProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'birthProfileId is required' },
      });
      return;
    }

    // Get the birth profile
    const birthProfile = await prisma.birthProfile.findFirst({
      where: { id: birthProfileId, userId },
    });

    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }

    // Check if chart already exists
    const existingChart = await prisma.birthChart.findFirst({
      where: { birthProfileId },
    });

    if (existingChart) {
      // Return existing chart
      res.json({
        success: true,
        data: {
          chart: existingChart.chartData,
          chartId: existingChart.id,
          cached: true,
        },
      });
      return;
    }

    // Prepare birth data for calculation
    const birthDate = new Date(birthProfile.birthDate);
    const birthTime = birthProfile.birthTime || '12:00'; // Default to noon if unknown
    
    const [hour, minute] = birthTime.split(':').map(Number);

    const birthDataInput: BirthDataInput = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1, // JavaScript months are 0-indexed
      day: birthDate.getDate(),
      hour: hour || 12,
      minute: minute || 0,
      latitude: birthProfile.latitude,
      longitude: birthProfile.longitude,
      timezone: birthProfile.timezone,
    };

    // Calculate the natal chart
    const chart = await calculateNatalChart(birthDataInput);

    // Save to database
    const savedChart = await prisma.birthChart.create({
      data: {
        userId,
        birthProfileId,
        chartData: chart as any, // Store as JSON
      },
    });

    console.log(`[NatalChart] Created chart ${savedChart.id} for profile ${birthProfileId}`);

    res.status(201).json({
      success: true,
      data: {
        chart,
        chartId: savedChart.id,
        cached: false,
      },
    });
  } catch (error) {
    console.error('[NatalChart] Generate error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate natal chart' },
    });
  }
}

/**
 * GET /api/v1/natal-chart/:profileId
 * Get existing natal chart for a birth profile
 */
export async function getNatalChart(req: Request, res: Response): Promise<void> {
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

    // Verify the birth profile belongs to the user
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

    // Get the chart
    const chart = await prisma.birthChart.findFirst({
      where: { birthProfileId: profileId },
    });

    if (!chart) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Natal chart not found. Generate one first.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        chart: chart.chartData,
        chartId: chart.id,
        birthProfile: {
          id: birthProfile.id,
          name: birthProfile.name,
          birthDate: birthProfile.birthDate,
          birthTime: birthProfile.birthTime,
          locationName: birthProfile.locationName,
        },
      },
    });
  } catch (error) {
    console.error('[NatalChart] Get error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve natal chart' },
    });
  }
}

/**
 * DELETE /api/v1/natal-chart/:profileId
 * Delete a natal chart (to force recalculation)
 */
export async function deleteNatalChart(req: Request, res: Response): Promise<void> {
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

    // Verify the birth profile belongs to the user
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

    // Delete the chart
    const result = await prisma.birthChart.deleteMany({
      where: { birthProfileId: profileId },
    });

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Natal chart not found' },
      });
      return;
    }

    console.log(`[NatalChart] Deleted chart for profile ${profileId}`);

    res.json({
      success: true,
      data: { message: 'Natal chart deleted successfully' },
    });
  } catch (error) {
    console.error('[NatalChart] Delete error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete natal chart' },
    });
  }
}

/**
 * POST /api/v1/natal-chart/recalculate/:profileId
 * Force recalculation of a natal chart
 */
export async function recalculateNatalChart(req: Request, res: Response): Promise<void> {
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

    // Delete existing chart
    await prisma.birthChart.deleteMany({
      where: { birthProfileId: profileId },
    });

    // Prepare birth data for calculation
    const birthDate = new Date(birthProfile.birthDate);
    const birthTime = birthProfile.birthTime || '12:00';
    const [hour, minute] = birthTime.split(':').map(Number);

    const birthDataInput: BirthDataInput = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: hour || 12,
      minute: minute || 0,
      latitude: birthProfile.latitude,
      longitude: birthProfile.longitude,
      timezone: birthProfile.timezone,
    };

    // Calculate new chart
    const chart = await calculateNatalChart(birthDataInput);

    // Save to database
    const savedChart = await prisma.birthChart.create({
      data: {
        userId,
        birthProfileId: profileId,
        chartData: chart as any,
      },
    });

    console.log(`[NatalChart] Recalculated chart ${savedChart.id} for profile ${profileId}`);

    res.json({
      success: true,
      data: {
        chart,
        chartId: savedChart.id,
        cached: false,
      },
    });
  } catch (error) {
    console.error('[NatalChart] Recalculate error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to recalculate natal chart' },
    });
  }
}

/**
 * POST /api/v1/birth-chart/share
 * Generate a shareable link for a natal chart
 * US-12: View Natal Chart - Shareable Link
 */
export async function shareNatalChart(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { chartId, profileId, isPublic = false, expiresIn = 7 * 24 * 60 * 60 } = req.body;

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

    // Verify the birth profile belongs to the user
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

    // Get the chart
    const chart = await prisma.birthChart.findFirst({
      where: { birthProfileId: profileId },
    });

    if (!chart) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Natal chart not found. Generate one first.' },
      });
      return;
    }

    // Generate a unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');
    
    // Store share info in Redis with expiration
    const shareData = {
      chartId: chart.id,
      profileId,
      userId,
      isPublic,
      createdAt: new Date().toISOString(),
    };

    // Store in Redis with TTL (default 7 days)
    await redisClient.setEx(
      `chart_share:${shareToken}`,
      expiresIn,
      JSON.stringify(shareData)
    );

    // Generate share URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared-chart/${shareToken}`;

    console.log(`[NatalChart] Created share link for chart ${chart.id}`);

    res.json({
      success: true,
      data: {
        shareUrl,
        shareToken,
        expiresInSeconds: expiresIn,
        isPublic,
      },
    });
  } catch (error) {
    console.error('[NatalChart] Share error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate share link' },
    });
  }
}

/**
 * GET /api/v1/birth-chart/shared/:token
 * Get a shared natal chart by token
 * US-12: View Natal Chart - Public Share View
 */
export async function getSharedNatalChart(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Share token is required' },
      });
      return;
    }

    // Get share data from Redis
    const shareDataStr = await redisClient.get(`chart_share:${token}`);

    if (!shareDataStr) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Share link expired or not found' },
      });
      return;
    }

    const shareData = JSON.parse(shareDataStr);

    // Get the chart
    const chart = await prisma.birthChart.findFirst({
      where: { id: shareData.chartId },
    });

    if (!chart) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Natal chart not found' },
      });
      return;
    }

    // Get the birth profile for name (only if public or owner)
    const birthProfile = await prisma.birthProfile.findFirst({
      where: { id: shareData.profileId },
      select: { name: true, id: true },
    });

    console.log(`[NatalChart] Accessed shared chart ${chart.id}`);

    res.json({
      success: true,
      data: {
        chart: chart.chartData,
        chartId: chart.id,
        profileName: birthProfile?.name || 'Unknown',
        isPublic: shareData.isPublic,
      },
    });
  } catch (error) {
    console.error('[NatalChart] Get shared error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve shared chart' },
    });
  }
}
