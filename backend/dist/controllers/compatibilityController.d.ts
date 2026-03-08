/**
 * Compatibility Controller
 * US-20: Compatibility Analysis
 *
 * Handles compatibility analysis requests
 */
import { Request, Response } from 'express';
/**
 * GET /api/v1/compatibility/:partnerId
 * Get compatibility analysis for a partner
 */
export declare const getCompatibilityAnalysis: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * DELETE /api/v1/compatibility/:partnerId/cache
 * Invalidate cached compatibility analysis
 */
export declare const invalidateCompatibilityCache: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=compatibilityController.d.ts.map