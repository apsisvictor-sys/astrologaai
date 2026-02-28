/**
 * Aspect Controller - US-14: Explore Chart Aspects
 * 
 * Handles aspect-related requests for birth charts
 */

import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

/**
 * GET /api/v1/birth-chart/:profileId/aspects
 * Get all aspects for a birth chart
 * 
 * Query params:
 * - type: Filter by aspect type (conjunction, sextile, square, trine, opposition)
 * - planet: Filter by planet name (returns aspects involving this planet)
 * - nature: Filter by nature (harmonious, challenging, neutral)
 * - lang: Language for aspect names (en|bg, default: bg)
 */
export async function getAspects(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const { type, planet, nature, lang = 'bg' } = req.query;

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

    const chartData = chart.chartData as any;
    let aspects = chartData.aspects || [];

    // Apply filters
    if (type && typeof type === 'string') {
      aspects = aspects.filter((a: any) => 
        a.aspect.toLowerCase() === type.toLowerCase()
      );
    }

    if (planet && typeof planet === 'string') {
      aspects = aspects.filter((a: any) => 
        a.planet1.toLowerCase() === planet.toLowerCase() ||
        a.planet2.toLowerCase() === planet.toLowerCase()
      );
    }

    if (nature && typeof nature === 'string') {
      aspects = aspects.filter((a: any) => 
        a.nature.toLowerCase() === nature.toLowerCase()
      );
    }

    // Group aspects by type for statistics
    const aspectsByType = {
      conjunction: aspects.filter((a: any) => a.aspect.toLowerCase() === 'conjunction').length,
      sextile: aspects.filter((a: any) => a.aspect.toLowerCase() === 'sextile').length,
      square: aspects.filter((a: any) => a.aspect.toLowerCase() === 'square').length,
      trine: aspects.filter((a: any) => a.aspect.toLowerCase() === 'trine').length,
      opposition: aspects.filter((a: any) => a.aspect.toLowerCase() === 'opposition').length,
    };

    // Group aspects by nature for statistics
    const aspectsByNature = {
      harmonious: aspects.filter((a: any) => a.nature === 'harmonious').length,
      challenging: aspects.filter((a: any) => a.nature === 'challenging').length,
      neutral: aspects.filter((a: any) => a.nature === 'neutral').length,
    };

    res.json({
      success: true,
      data: {
        aspects,
        total: aspects.length,
        filters: {
          type: type || null,
          planet: planet || null,
          nature: nature || null,
        },
        statistics: {
          byType: aspectsByType,
          byNature: aspectsByNature,
        },
        language: lang,
      },
    });
  } catch (error) {
    console.error('[Aspects] Get error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve aspects' },
    });
  }
}

/**
 * GET /api/v1/birth-chart/:profileId/aspects/:planet1/:planet2
 * Get specific aspect between two planets
 */
export async function getSpecificAspect(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { profileId, planet1, planet2 } = req.params;
    const { lang = 'bg' } = req.query;

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

    const chartData = chart.chartData as any;
    const aspects = chartData.aspects || [];

    // Find the specific aspect
    const aspect = aspects.find((a: any) => 
      (a.planet1.toLowerCase() === planet1.toLowerCase() && 
       a.planet2.toLowerCase() === planet2.toLowerCase()) ||
      (a.planet1.toLowerCase() === planet2.toLowerCase() && 
       a.planet2.toLowerCase() === planet1.toLowerCase())
    );

    if (!aspect) {
      res.status(404).json({
        success: false,
        error: { 
          code: 'NOT_FOUND', 
          message: `No aspect found between ${planet1} and ${planet2}` 
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        aspect,
        language: lang,
      },
    });
  } catch (error) {
    console.error('[Aspects] Get specific error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve aspect' },
    });
  }
}

/**
 * GET /api/v1/birth-chart/:profileId/aspects/matrix
 * Get aspect matrix/grid view data
 * Returns a 2D array showing all planet combinations and their aspects
 */
export async function getAspectMatrix(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const { lang = 'bg' } = req.query;

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

    const chartData = chart.chartData as any;
    const aspects = chartData.aspects || [];

    // List of major planets
    const planets = [
      'sun', 'moon', 'mercury', 'venus', 'mars', 
      'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
      'northNode', 'southNode', 'chiron'
    ];

    // Create a map for quick aspect lookup
    const aspectMap = new Map<string, any>();
    aspects.forEach((aspect: any) => {
      const key1 = `${aspect.planet1}-${aspect.planet2}`;
      const key2 = `${aspect.planet2}-${aspect.planet1}`;
      aspectMap.set(key1, aspect);
      aspectMap.set(key2, aspect);
    });

    // Build matrix
    const matrix: any[][] = [];
    
    // Header row
    matrix.push(['', ...planets]);

    // Data rows
    planets.forEach(planet1 => {
      const row: any[] = [planet1];
      
      planets.forEach(planet2 => {
        if (planet1 === planet2) {
          row.push(null); // No aspect with itself
        } else {
          const key = `${planet1}-${planet2}`;
          const aspect = aspectMap.get(key);
          row.push(aspect || null);
        }
      });
      
      matrix.push(row);
    });

    res.json({
      success: true,
      data: {
        planets,
        matrix,
        totalAspects: aspects.length,
        language: lang,
      },
    });
  } catch (error) {
    console.error('[Aspects] Get matrix error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve aspect matrix' },
    });
  }
}
