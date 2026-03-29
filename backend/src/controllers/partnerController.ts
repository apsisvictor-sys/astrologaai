/**
 * Partner Controller
 * US-18: Add Partner - CRUD operations for partner management
 * US-19: Synastry Chart Generation
 * US-20: Compatibility Report
 */

import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { RelationshipType } from '@prisma/client';
import { calculateSynastryChart, getCachedSynastry, SynastryChart } from '../services/synastry.service';
import { generateCompatibilityReport, getCachedReport } from '../services/compatibility-report.service';
import { calculateCompositeChart } from '../services/composite.service';

// Validation helpers
const validateBirthData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.birthDate) {
    errors.push('Birth date is required');
  } else if (new Date(data.birthDate) > new Date()) {
    errors.push('Birth date cannot be in the future');
  }
  
  if (!data.locationName) {
    errors.push('Birth location is required');
  }
  
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    errors.push('Valid coordinates are required');
  }
  
  if (!data.timezone) {
    errors.push('Timezone is required');
  }
  
  // Validate birth time format if provided
  if (data.birthTime && !data.isUnknownTime) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(data.birthTime)) {
      errors.push('Birth time must be in HH:MM format');
    }
  }
  
  return errors;
};

const isValidRelationshipType = (type: string): type is RelationshipType => {
  return Object.values(RelationshipType).includes(type as RelationshipType);
};

/**
 * GET /api/partners
 * List all partners for the authenticated user
 */
export const listPartners = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }
    
    const partners = await prisma.partner.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        label: true,
        relationshipType: true,
        birthDate: true,
        birthTime: true,
        locationName: true,
        chartSummary: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    // Format response
    const formattedPartners = partners.map(partner => ({
      id: partner.id,
      name: partner.name,
      label: partner.label,
      relationshipType: partner.relationshipType.toLowerCase(),
      birthData: {
        date: partner.birthDate.toISOString().split('T')[0],
        time: partner.birthTime,
        location: partner.locationName,
        isUnknownTime: !partner.birthTime,
      },
      chartSummary: partner.chartSummary,
      notes: partner.notes,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    }));
    
    res.json({
      success: true,
      data: {
        partners: formattedPartners,
      },
    });
  } catch (error) {
    console.error('List partners error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve partners',
      },
    });
  }
};

/**
 * GET /api/partners/:id
 * Get a specific partner's details
 */
export const getPartner = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }
    
    const partner = await prisma.partner.findFirst({
      where: {
        id,
        userId, // Ensure user owns this partner record
      },
    });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found',
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase(),
          birthData: {
            date: partner.birthDate.toISOString().split('T')[0],
            time: partner.birthTime,
            location: partner.locationName,
            latitude: partner.latitude,
            longitude: partner.longitude,
            timezone: partner.timezone,
            isUnknownTime: partner.isUnknownTime,
          },
          chartSummary: partner.chartSummary,
          notes: partner.notes,
          createdAt: partner.createdAt,
          updatedAt: partner.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve partner',
      },
    });
  }
};

/**
 * POST /api/partners
 * Add a new partner
 */
export const createPartner = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }
    
    const {
      name,
      label,
      relationshipType = 'romantic',
      birthDate,
      birthTime,
      locationName,
      latitude,
      longitude,
      timezone,
      isUnknownTime = false,
      notes,
    } = req.body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Partner name is required',
          details: [{ field: 'name', message: 'Name cannot be empty' }],
        },
      });
    }
    
    // Validate relationship type
    const normalizedType = relationshipType.toUpperCase();
    if (!isValidRelationshipType(normalizedType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid relationship type',
          details: [{
            field: 'relationshipType',
            message: `Must be one of: ${Object.values(RelationshipType).join(', ').toLowerCase()}`,
          }],
        },
      });
    }
    
    // Validate birth data
    const birthDataValidation = validateBirthData({
      birthDate,
      birthTime,
      locationName,
      latitude,
      longitude,
      timezone,
      isUnknownTime,
    });
    
    if (birthDataValidation.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid birth data',
          details: birthDataValidation.map(msg => ({ message: msg })),
        },
      });
    }
    
    // Check partner limit (Free: 0, Pro: 10, Premium: unlimited)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { partners: true } },
      },
    });
    
    const partnerLimits: Record<string, number> = {
      FREE: 0,      // Partners is a PRO/PREMIUM feature
      PRO: 10,      // PRO gets up to 10 partner profiles
      PREMIUM: 100, // PREMIUM gets effectively unlimited (100)
    };

    const limit = partnerLimits[user?.tier || 'FREE'];
    const currentCount = user?._count.partners || 0;

    if (currentCount >= limit) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `Partner limit reached for your tier (${limit} partners)`,
          upgradeRequired: user?.tier !== 'PREMIUM',
        },
      });
    }
    
    // Create partner
    const partner = await prisma.partner.create({
      data: {
        userId,
        name: name.trim(),
        label: label?.trim() || null,
        relationshipType: normalizedType as RelationshipType,
        birthDate: new Date(birthDate),
        birthTime: isUnknownTime ? null : birthTime,
        locationName,
        latitude,
        longitude,
        timezone,
        isUnknownTime,
        notes: notes?.trim() || null,
      },
    });
    
    res.status(201).json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase(),
          birthData: {
            date: partner.birthDate.toISOString().split('T')[0],
            time: partner.birthTime,
            location: partner.locationName,
            isUnknownTime: partner.isUnknownTime,
          },
          notes: partner.notes,
          createdAt: partner.createdAt,
        },
        message: 'Partner added successfully',
      },
    });
  } catch (error) {
    console.error('Create partner error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create partner',
      },
    });
  }
};

/**
 * PUT /api/partners/:id
 * Update a partner's information
 */
export const updatePartner = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }
    
    // Check partner exists and belongs to user
    const existingPartner = await prisma.partner.findFirst({
      where: { id, userId },
    });
    
    if (!existingPartner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found',
        },
      });
    }
    
    const {
      name,
      label,
      relationshipType,
      birthDate,
      birthTime,
      locationName,
      latitude,
      longitude,
      timezone,
      isUnknownTime,
      notes,
    } = req.body;
    
    // Build update data
    const updateData: any = {};
    
    // Update name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Partner name cannot be empty',
          },
        });
      }
      updateData.name = name.trim();
    }
    
    // Update label if provided
    if (label !== undefined) {
      updateData.label = label?.trim() || null;
    }
    
    // Update relationship type if provided
    if (relationshipType !== undefined) {
      const normalizedType = relationshipType.toUpperCase();
      if (!isValidRelationshipType(normalizedType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid relationship type',
          },
        });
      }
      updateData.relationshipType = normalizedType;
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }
    
    // Update birth data if any birth field is provided
    if (birthDate !== undefined || birthTime !== undefined || locationName !== undefined) {
      const newBirthData = {
        birthDate: birthDate !== undefined ? new Date(birthDate) : existingPartner.birthDate,
        birthTime: birthTime !== undefined ? (isUnknownTime ? null : birthTime) : existingPartner.birthTime,
        locationName: locationName !== undefined ? locationName : existingPartner.locationName,
        latitude: latitude !== undefined ? latitude : existingPartner.latitude,
        longitude: longitude !== undefined ? longitude : existingPartner.longitude,
        timezone: timezone !== undefined ? timezone : existingPartner.timezone,
        isUnknownTime: isUnknownTime !== undefined ? isUnknownTime : existingPartner.isUnknownTime,
      };
      
      const birthDataValidation = validateBirthData(newBirthData);
      if (birthDataValidation.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid birth data',
            details: birthDataValidation.map(msg => ({ message: msg })),
          },
        });
      }
      
      updateData.birthDate = newBirthData.birthDate;
      updateData.birthTime = newBirthData.birthTime;
      updateData.locationName = newBirthData.locationName;
      updateData.latitude = newBirthData.latitude;
      updateData.longitude = newBirthData.longitude;
      updateData.timezone = newBirthData.timezone;
      updateData.isUnknownTime = newBirthData.isUnknownTime;
      
      // Clear cached chart summary if birth data changed
      updateData.chartSummary = null;
    }
    
    // Perform update
    const updatedPartner = await prisma.partner.update({
      where: { id },
      data: updateData,
    });
    
    res.json({
      success: true,
      data: {
        partner: {
          id: updatedPartner.id,
          name: updatedPartner.name,
          label: updatedPartner.label,
          relationshipType: updatedPartner.relationshipType.toLowerCase(),
          birthData: {
            date: updatedPartner.birthDate.toISOString().split('T')[0],
            time: updatedPartner.birthTime,
            location: updatedPartner.locationName,
            isUnknownTime: updatedPartner.isUnknownTime,
          },
          notes: updatedPartner.notes,
          updatedAt: updatedPartner.updatedAt,
        },
        message: 'Partner updated successfully',
      },
    });
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update partner',
      },
    });
  }
};

/**
 * DELETE /api/partners/:id
 * Remove a partner
 */
export const deletePartner = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }
    
    // Check partner exists and belongs to user
    const partner = await prisma.partner.findFirst({
      where: { id, userId },
    });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found',
        },
      });
    }
    
    // Delete partner
    await prisma.partner.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      data: {
        message: 'Partner removed successfully',
      },
    });
  } catch (error) {
    console.error('Delete partner error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete partner',
      },
    });
  }
};

/**
 * GET /api/partners/:id/synastry
 * US-19: Get synastry chart between user and partner
 */
export const getSynastry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: partnerId } = req.params;
    const language = (req.query.language as string) || 'bg';
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }
    
    // Get user's birth data
    const userBirthData = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!userBirthData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BIRTH_DATA_REQUIRED',
          message: 'You need to enter your birth data first to calculate synastry',
        },
      });
    }
    
    // Get partner
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId, userId },
    });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found',
        },
      });
    }
    
    // Try to get cached synastry first
    const cachedSynastry = await getCachedSynastry(userId, partnerId);
    
    if (cachedSynastry) {
      return res.json({
        success: true,
        data: {
          synastry: cachedSynastry,
          partner: {
            id: partner.id,
            name: partner.name,
            label: partner.label,
            relationshipType: partner.relationshipType.toLowerCase(),
          },
          language,
          cached: true,
        },
      });
    }
    
    // Parse user birth data
    const userBirthDate = new Date(userBirthData.birthDate);
    const [userHour = 12, userMinute = 0] = (userBirthData.birthTime || '12:00').split(':').map(Number);

    // Parse partner birth data
    const partnerBirthDate = new Date(partner.birthDate);
    const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || '12:00').split(':').map(Number);

    // Calculate synastry chart
    const synastryChart = await calculateSynastryChart(
      {
        year: userBirthDate.getFullYear(),
        month: userBirthDate.getMonth() + 1,
        day: userBirthDate.getDate(),
        hour: userHour,
        minute: userMinute,
        latitude: userBirthData.latitude,
        longitude: userBirthData.longitude,
        timezone: userBirthData.timezone,
      },
      {
        year: partnerBirthDate.getFullYear(),
        month: partnerBirthDate.getMonth() + 1,
        day: partnerBirthDate.getDate(),
        hour: partnerHour,
        minute: partnerMinute,
        latitude: partner.latitude,
        longitude: partner.longitude,
        timezone: partner.timezone,
      },
      userId,
      partnerId
    );
    
    // Update partner with chart summary if not present
    if (!partner.chartSummary) {
      await prisma.partner.update({
        where: { id: partnerId },
        data: {
          chartSummary: {
            sunSign: synastryChart.partnerChart.sun.sign,
            moonSign: synastryChart.partnerChart.moon.sign,
            risingSign: synastryChart.partnerChart.rising?.sign,
          },
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        synastry: synastryChart,
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase(),
        },
        language,
        cached: false,
      },
    });
  } catch (error) {
    console.error('Get synastry error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to calculate synastry chart',
      },
    });
  }
};

/**
 * GET /api/partners/:id/report
 * US-20: Get detailed compatibility report
 */
export const getCompatibilityReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: partnerId } = req.params;
    const language = (req.query.language as 'bg' | 'en') || 'bg';
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }
    
    // Get user's birth data
    const userBirthData = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!userBirthData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BIRTH_DATA_REQUIRED',
          message: 'You need to enter your birth data first to generate a compatibility report',
        },
      });
    }
    
    // Get partner
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId, userId },
    });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found',
        },
      });
    }
    
    // Try to get cached report first
    const cachedReport = await getCachedReport(userId, partnerId, language);
    
    if (cachedReport) {
      return res.json({
        success: true,
        data: {
          report: cachedReport,
          partner: {
            id: partner.id,
            name: partner.name,
            label: partner.label,
            relationshipType: partner.relationshipType.toLowerCase(),
          },
          cached: true,
        },
      });
    }
    
    // Parse user birth data
    const userBirthDate = new Date(userBirthData.birthDate);
    const [userHour = 12, userMinute = 0] = (userBirthData.birthTime || '12:00').split(':').map(Number);

    // Parse partner birth data
    const partnerBirthDate = new Date(partner.birthDate);
    const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || '12:00').split(':').map(Number);

    // Generate compatibility report
    const report = await generateCompatibilityReport(
      {
        year: userBirthDate.getFullYear(),
        month: userBirthDate.getMonth() + 1,
        day: userBirthDate.getDate(),
        hour: userHour,
        minute: userMinute,
        latitude: userBirthData.latitude,
        longitude: userBirthData.longitude,
        timezone: userBirthData.timezone,
      },
      {
        year: partnerBirthDate.getFullYear(),
        month: partnerBirthDate.getMonth() + 1,
        day: partnerBirthDate.getDate(),
        hour: partnerHour,
        minute: partnerMinute,
        latitude: partner.latitude,
        longitude: partner.longitude,
        timezone: partner.timezone,
      },
      partnerId,
      partner.name,
      userId,
      language
    );

    // Update partner with chart summary if not present (using synastry data for signs)
    if (!partner.chartSummary) {
      try {
        // Get synastry chart to extract sign info
        const synastryResult = await import('../services/synastry.service').then(m => 
          m.calculateSynastryChart(
            {
              year: userBirthDate.getFullYear(),
              month: userBirthDate.getMonth() + 1,
              day: userBirthDate.getDate(),
              hour: userHour,
              minute: userMinute,
              latitude: userBirthData.latitude,
              longitude: userBirthData.longitude,
              timezone: userBirthData.timezone,
            },
            {
              year: partnerBirthDate.getFullYear(),
              month: partnerBirthDate.getMonth() + 1,
              day: partnerBirthDate.getDate(),
              hour: partnerHour,
              minute: partnerMinute,
              latitude: partner.latitude,
              longitude: partner.longitude,
              timezone: partner.timezone,
            },
            userId,
            partnerId
          )
        );

        const chartSummary: Record<string, string> = {
          sunSign: synastryResult.partnerChart?.sun?.sign || '',
          moonSign: synastryResult.partnerChart?.moon?.sign || '',
          risingSign: synastryResult.partnerChart?.rising?.sign || '',
        };

        // Only update if we have valid data
        if (chartSummary.sunSign || chartSummary.moonSign || chartSummary.risingSign) {
          await prisma.partner.update({
            where: { id: partnerId },
            data: { chartSummary },
          });
        }
      } catch (summaryError) {
        // Non-critical error - don't fail the request
        console.warn('Failed to update partner chart summary:', summaryError);
      }
    }
    
    res.json({
      success: true,
      data: {
        report,
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase(),
        },
        cached: false,
      },
    });
  } catch (error) {
    console.error('Get compatibility report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate compatibility report',
      },
    });
  }
};

/**
 * GET /api/partners/:id/composite
 * FEAT-11: Get composite chart (PREMIUM only)
 */
export const getCompositeChart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: partnerId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // PREMIUM tier check
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.tier !== 'PREMIUM') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PREMIUM_REQUIRED',
          message: 'Composite chart requires a PREMIUM subscription',
          upgradeRequired: true,
        },
      });
    }

    // Get user birth data
    const userBirthData = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!userBirthData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BIRTH_DATA_REQUIRED',
          message: 'You need to enter your birth data first to calculate a composite chart',
        },
      });
    }

    // Get partner
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId, userId },
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Partner not found' },
      });
    }

    const userBirthDate = new Date(userBirthData.birthDate);
    const [userHour = 12, userMinute = 0] = (userBirthData.birthTime || '12:00').split(':').map(Number);

    const partnerBirthDate = new Date(partner.birthDate);
    const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || '12:00').split(':').map(Number);

    const composite = await calculateCompositeChart(
      {
        year: userBirthDate.getFullYear(),
        month: userBirthDate.getMonth() + 1,
        day: userBirthDate.getDate(),
        hour: userHour,
        minute: userMinute,
        latitude: userBirthData.latitude,
        longitude: userBirthData.longitude,
        timezone: userBirthData.timezone,
      },
      {
        year: partnerBirthDate.getFullYear(),
        month: partnerBirthDate.getMonth() + 1,
        day: partnerBirthDate.getDate(),
        hour: partnerHour,
        minute: partnerMinute,
        latitude: partner.latitude,
        longitude: partner.longitude,
        timezone: partner.timezone,
      }
    );

    res.json({
      success: true,
      data: {
        composite,
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase(),
        },
        cached: false,
      },
    });
  } catch (error) {
    console.error('Get composite chart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to calculate composite chart',
      },
    });
  }
};
