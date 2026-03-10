/**
 * Birth Data Controller
 * US-05: Birth Data Collection
 * US-30: Edit Birth Data
 * 
 * Handles CRUD operations for birth profiles
 * Supports chart archiving and background regeneration
 */

import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { searchLocations, getTimezoneFromCoordinates, validateCoordinates } from '../services/geocoding';
import { redisClient } from '../utils/redis';
import { calculateNatalChart, BirthDataInput } from '../services/astrology';

const MAX_PROFILES_PER_USER = 10;

interface CreateBirthProfileInput {
  name: string;
  birthDate: string; // ISO date string
  birthTime?: string | null; // "HH:MM" format
  locationName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  isUnknownTime?: boolean;
}

interface UpdateBirthProfileInput {
  name?: string;
  birthDate?: string;
  birthTime?: string | null;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isUnknownTime?: boolean;
}

/**
 * GET /api/v1/birth-data
 * List all birth profiles for the current user
 */
export async function listBirthProfiles(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    const profiles = await prisma.birthProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        birthChart: {
          select: { id: true, createdAt: true },
        },
      },
    });
    
    res.json({
      success: true,
      data: {
        profiles,
        total: profiles.length,
        maxAllowed: MAX_PROFILES_PER_USER,
      },
    });
  } catch (error) {
    console.error('[BirthData] List error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch birth profiles' },
    });
  }
}

/**
 * GET /api/v1/birth-data/:id
 * Get a specific birth profile
 */
export async function getBirthProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    const profile = await prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: true,
      },
    });
    
    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }
    
    res.json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    console.error('[BirthData] Get error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch birth profile' },
    });
  }
}

/**
 * POST /api/v1/birth-data
 * Create a new birth profile
 */
export async function createBirthProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const input: CreateBirthProfileInput = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    // Validate required fields
    if (!input.name || !input.birthDate || !input.locationName) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: [
            !input.name && { field: 'name', message: 'Profile name is required' },
            !input.birthDate && { field: 'birthDate', message: 'Birth date is required' },
            !input.locationName && { field: 'locationName', message: 'Location is required' },
          ].filter(Boolean),
        },
      });
      return;
    }
    
    // Validate coordinates
    if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid coordinates',
        },
      });
      return;
    }
    
    if (!validateCoordinates(input.latitude, input.longitude)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Coordinates out of valid range',
        },
      });
      return;
    }
    
    // Validate birth date is in the past
    const birthDate = new Date(input.birthDate);
    if (isNaN(birthDate.getTime())) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid birth date format' },
      });
      return;
    }
    
    if (birthDate > new Date()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Birth date must be in the past' },
      });
      return;
    }
    
    // Validate birth time format if provided
    if (input.birthTime && !input.isUnknownTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(input.birthTime)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid time format. Use HH:MM (24-hour)' },
        });
        return;
      }
    }
    
    // Check profile limit
    const existingCount = await prisma.birthProfile.count({
      where: { userId },
    });
    
    if (existingCount >= MAX_PROFILES_PER_USER) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `Maximum of ${MAX_PROFILES_PER_USER} birth profiles allowed`,
        },
      });
      return;
    }
    
    // Get timezone from coordinates if not provided
    const timezone = input.timezone || 
                     getTimezoneFromCoordinates(input.latitude, input.longitude);
    
    // Create the profile
    const profile = await prisma.birthProfile.create({
      data: {
        userId,
        name: input.name.trim(),
        birthDate,
        birthTime: input.isUnknownTime ? null : (input.birthTime || null),
        locationName: input.locationName,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone,
        isUnknownTime: input.isUnknownTime ?? !input.birthTime,
      },
    });
    
    console.log(`[BirthData] Created profile ${profile.id} for user ${userId}`);

    // Auto-compute natal chart immediately after profile creation
    try {
      const birthDate = new Date(input.birthDate);
      const birthTime = input.isUnknownTime ? null : (input.birthTime || null);
      const [hour, minute] = birthTime ? birthTime.split(':').map(Number) : [12, 0];

      const birthDataInput: BirthDataInput = {
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour: hour || 12,
        minute: minute || 0,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone,
      };

      const chart = await calculateNatalChart(birthDataInput);

      await prisma.birthChart.create({
        data: {
          userId,
          birthProfileId: profile.id,
          chartData: chart as any,
        },
      });

      console.log(`[BirthData] Chart computed for profile ${profile.id}`);
    } catch (chartError) {
      // Non-blocking: profile is saved, chart will be missing but won't block the user
      console.error('[BirthData] Chart computation failed (non-blocking):', chartError);
    }

    res.status(201).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    console.error('[BirthData] Create error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create birth profile' },
    });
  }
}

/**
 * PUT /api/v1/birth-data/:id
 * Update a birth profile
 * US-30: Archives old chart, triggers background regeneration
 */
export async function updateBirthProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const input: UpdateBirthProfileInput = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    // Check if profile exists and belongs to user
    const existing = await prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: true,
      },
    });
    
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }
    
    // Validate birth date if provided
    let birthDate: Date | undefined;
    if (input.birthDate) {
      birthDate = new Date(input.birthDate);
      if (isNaN(birthDate.getTime())) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid birth date format' },
        });
        return;
      }
      if (birthDate > new Date()) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Birth date must be in the past' },
        });
        return;
      }
    }
    
    // Validate coordinates if provided
    if (input.latitude !== undefined && input.longitude !== undefined) {
      if (!validateCoordinates(input.latitude, input.longitude)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Coordinates out of valid range' },
        });
        return;
      }
    }
    
    // Validate birth time format if provided
    if (input.birthTime && !input.isUnknownTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(input.birthTime)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid time format. Use HH:MM (24-hour)' },
        });
        return;
      }
    }
    
    // Get timezone from coordinates if coordinates changed
    let timezone = input.timezone;
    if ((input.latitude !== undefined || input.longitude !== undefined) && !input.timezone) {
      const lat = input.latitude ?? existing.latitude;
      const lon = input.longitude ?? existing.longitude;
      timezone = getTimezoneFromCoordinates(lat, lon);
    }
    
    // Check if birth data actually changed (to determine if we need to regenerate chart)
    const birthDataChanged = 
      birthDate !== undefined ||
      input.birthTime !== undefined ||
      input.latitude !== undefined ||
      input.longitude !== undefined;
    
    // US-30: Archive old chart if it exists and birth data changed
    let chartArchived = false;
    if (birthDataChanged && existing.birthChart) {
      await prisma.chartHistory.create({
        data: {
          chartId: existing.birthChart.id,
          chartData: existing.birthChart.chartData as any,
          birthDate: existing.birthDate,
          birthTime: existing.birthTime,
          locationName: existing.locationName,
          latitude: existing.latitude,
          longitude: existing.longitude,
          timezone: existing.timezone,
          reason: 'birth_data_update',
        },
      });
      chartArchived = true;
      console.log(`[BirthData] Archived chart for profile ${id}`);
    }
    
    // Update the profile
    const profile = await prisma.birthProfile.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(birthDate && { birthDate }),
        ...(input.birthTime !== undefined && { birthTime: input.isUnknownTime ? null : (input.birthTime || null) }),
        ...(input.locationName !== undefined && { locationName: input.locationName }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(timezone && { timezone }),
        ...(input.isUnknownTime !== undefined && { isUnknownTime: input.isUnknownTime }),
      },
    });
    
    // US-30: If birth data changed, trigger background chart regeneration
    let regenerationJobId: string | null = null;
    if (birthDataChanged) {
      // Delete existing chart (we already archived it)
      if (existing.birthChart) {
        await prisma.birthChart.delete({
          where: { id: existing.birthChart.id },
        });
      }
      
      // Queue background regeneration job
      regenerationJobId = `chart_regen:${id}:${Date.now()}`;
      const jobData = {
        jobId: regenerationJobId,
        profileId: id,
        userId,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      
      // Store job in Redis for tracking (expires in 1 hour)
      await redisClient.setEx(
        `job:${regenerationJobId}`,
        3600,
        JSON.stringify(jobData)
      );
      
      // Add to regeneration queue
      await redisClient.rPush('chart_regeneration_queue', JSON.stringify(jobData));
      
      console.log(`[BirthData] Queued chart regeneration job ${regenerationJobId}`);
    }
    
    console.log(`[BirthData] Updated profile ${id} for user ${userId}`);
    
    res.json({
      success: true,
      data: {
        profile,
        chartArchived,
        regenerationQueued: !!regenerationJobId,
        regenerationJobId,
        message: birthDataChanged 
          ? 'Birth data updated. Chart regeneration in progress.' 
          : 'Profile updated successfully.',
      },
    });
  } catch (error) {
    console.error('[BirthData] Update error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update birth profile' },
    });
  }
}

/**
 * DELETE /api/v1/birth-data/:id
 * Delete a birth profile
 */
export async function deleteBirthProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    // Check if profile exists and belongs to user
    const existing = await prisma.birthProfile.findFirst({
      where: { id, userId },
    });
    
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }
    
    // Delete the profile (cascade will delete associated chart)
    await prisma.birthProfile.delete({
      where: { id },
    });
    
    console.log(`[BirthData] Deleted profile ${id} for user ${userId}`);
    
    res.json({
      success: true,
      data: { message: 'Birth profile deleted successfully' },
    });
  } catch (error) {
    console.error('[BirthData] Delete error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete birth profile' },
    });
  }
}

/**
 * GET /api/v1/locations/search
 * Search for locations (autocomplete)
 */
export async function searchLocationsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { q, limit = '10' } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Query must be at least 2 characters' },
      });
      return;
    }
    
    const limitNum = Math.min(parseInt(limit as string, 10) || 10, 20);
    
    const locations = await searchLocations(q, limitNum);
    
    res.json({
      success: true,
      data: { locations },
    });
  } catch (error) {
    console.error('[BirthData] Location search error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to search locations' },
    });
  }
}

/**
 * GET /api/v1/birth-data/:id/regeneration-status
 * US-30: Check chart regeneration status
 */
export async function getRegenerationStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { jobId } = req.query;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    // Verify profile belongs to user
    const profile = await prisma.birthProfile.findFirst({
      where: { id, userId },
    });
    
    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }
    
    // Check if chart exists (regeneration complete)
    const chart = await prisma.birthChart.findFirst({
      where: { birthProfileId: id },
    });
    
    if (chart) {
      res.json({
        success: true,
        data: {
          status: 'complete',
          chartId: chart.id,
          message: 'Chart regeneration complete',
        },
      });
      return;
    }
    
    // Check job status in Redis
    if (jobId && typeof jobId === 'string') {
      const jobDataStr = await redisClient.get(`job:${jobId}`);
      
      if (jobDataStr) {
        const jobData = JSON.parse(jobDataStr);
        res.json({
          success: true,
          data: {
            status: jobData.status || 'pending',
            message: jobData.status === 'processing' 
              ? 'Chart regeneration in progress...' 
              : 'Chart regeneration pending...',
          },
        });
        return;
      }
    }
    
    // No chart and no job found
    res.json({
      success: true,
      data: {
        status: 'no_chart',
        message: 'No chart found. Generate one from the profile page.',
      },
    });
  } catch (error) {
    console.error('[BirthData] Regeneration status error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check regeneration status' },
    });
  }
}

/**
 * GET /api/v1/birth-data/:id/history
 * US-30: Get chart history for a birth profile
 */
export async function getChartHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { limit = '10', offset = '0' } = req.query;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    // Verify profile belongs to user
    const profile = await prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: {
          include: {
            historyEntries: {
              orderBy: { archivedAt: 'desc' },
              take: parseInt(limit as string, 10) || 10,
              skip: parseInt(offset as string, 10) || 0,
            },
          },
        },
      },
    });
    
    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile not found' },
      });
      return;
    }
    
    const historyEntries = profile.birthChart?.historyEntries || [];
    
    // Get total count
    const totalCount = profile.birthChart 
      ? await prisma.chartHistory.count({
          where: { chartId: profile.birthChart.id },
        })
      : 0;
    
    res.json({
      success: true,
      data: {
        history: historyEntries.map((entry) => ({
          id: entry.id,
          birthDate: entry.birthDate,
          birthTime: entry.birthTime,
          locationName: entry.locationName,
          latitude: entry.latitude,
          longitude: entry.longitude,
          timezone: entry.timezone,
          reason: entry.reason,
          archivedAt: entry.archivedAt,
          notes: entry.notes,
        })),
        total: totalCount,
        hasMore: totalCount > (parseInt(offset as string, 10) || 0) + historyEntries.length,
      },
    });
  } catch (error) {
    console.error('[BirthData] Chart history error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chart history' },
    });
  }
}

/**
 * GET /api/v1/birth-data/:id/history/:historyId
 * US-30: Get a specific historical chart
 */
export async function getHistoricalChart(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id, historyId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }
    
    // Verify profile belongs to user
    const profile = await prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: {
          include: {
            historyEntries: {
              where: { id: historyId },
            },
          },
        },
      },
    });
    
    if (!profile || !profile.birthChart) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Birth profile or chart not found' },
      });
      return;
    }
    
    const historyEntry = profile.birthChart.historyEntries[0];
    
    if (!historyEntry) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Historical chart not found' },
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        history: {
          id: historyEntry.id,
          chartData: historyEntry.chartData,
          birthDate: historyEntry.birthDate,
          birthTime: historyEntry.birthTime,
          locationName: historyEntry.locationName,
          latitude: historyEntry.latitude,
          longitude: historyEntry.longitude,
          timezone: historyEntry.timezone,
          reason: historyEntry.reason,
          archivedAt: historyEntry.archivedAt,
          notes: historyEntry.notes,
        },
      },
    });
  } catch (error) {
    console.error('[BirthData] Historical chart error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch historical chart' },
    });
  }
}
