/**
 * Chart Analysis Controller
 * US-13: Understand Chart Components
 *
 * Handles chart analysis requests with detailed interpretations
 */
import { Request, Response } from 'express';
/**
 * GET /api/v1/birth-chart/:profileId/analysis
 * Get detailed analysis and interpretations for a birth chart
 *
 * Query params:
 * - lang: 'en' | 'bg' (default: 'bg')
 * - level: 'basic' | 'intermediate' | 'advanced' (default: 'basic')
 */
export declare function getChartAnalysis(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-chart/:profileId/analysis/planet/:planetName
 * Get detailed interpretation for a specific planet
 */
export declare function getPlanetAnalysis(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-chart/:profileId/analysis/house/:houseNumber
 * Get detailed interpretation for a specific house
 */
export declare function getHouseAnalysis(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=chartAnalysisController.d.ts.map