/**
 * Natal Chart Controller
 * US-06: Natal Chart Generation
 * US-12: View Natal Chart
 *
 * Handles natal chart calculation and sharing requests
 */
import { Request, Response } from 'express';
/**
 * POST /api/v1/natal-chart
 * Generate or retrieve a natal chart for a birth profile
 */
export declare function generateNatalChart(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/natal-chart/:profileId
 * Get existing natal chart for a birth profile
 */
export declare function getNatalChart(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/v1/natal-chart/:profileId
 * Delete a natal chart (to force recalculation)
 */
export declare function deleteNatalChart(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/natal-chart/recalculate/:profileId
 * Force recalculation of a natal chart
 */
export declare function recalculateNatalChart(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/birth-chart/share
 * Generate a shareable link for a natal chart
 * US-12: View Natal Chart - Shareable Link
 */
export declare function shareNatalChart(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-chart/shared/:token
 * Get a shared natal chart by token
 * US-12: View Natal Chart - Public Share View
 */
export declare function getSharedNatalChart(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=natalChartController.d.ts.map