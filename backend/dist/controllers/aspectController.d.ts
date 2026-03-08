/**
 * Aspect Controller - US-14: Explore Chart Aspects
 *
 * Handles aspect-related requests for birth charts
 */
import { Request, Response } from 'express';
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
export declare function getAspects(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-chart/:profileId/aspects/:planet1/:planet2
 * Get specific aspect between two planets
 */
export declare function getSpecificAspect(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-chart/:profileId/aspects/matrix
 * Get aspect matrix/grid view data
 * Returns a 2D array showing all planet combinations and their aspects
 */
export declare function getAspectMatrix(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=aspectController.d.ts.map