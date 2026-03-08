/**
 * Time Sensitivity Controller
 * US-30: View Birth Time Sensitivity
 *
 * Calculates how small changes in birth time affect the chart,
 * showing Rising sign and house placements sensitivity.
 */
import { Request, Response } from 'express';
/**
 * GET /api/v1/birth-chart/:profileId/time-sensitivity
 * Calculate and return time sensitivity data
 */
export declare function getTimeSensitivity(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/v1/birth-chart/:profileId/time-sensitivity/summary
 * Get just the summary without full data points
 */
export declare function getTimeSensitivitySummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
declare const _default: {
    getTimeSensitivity: typeof getTimeSensitivity;
    getTimeSensitivitySummary: typeof getTimeSensitivitySummary;
};
export default _default;
//# sourceMappingURL=timeSensitivityController.d.ts.map