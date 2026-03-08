/**
 * Birth Data Controller
 * US-05: Birth Data Collection
 * US-30: Edit Birth Data
 *
 * Handles CRUD operations for birth profiles
 * Supports chart archiving and background regeneration
 */
import { Request, Response } from 'express';
/**
 * GET /api/v1/birth-data
 * List all birth profiles for the current user
 */
export declare function listBirthProfiles(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-data/:id
 * Get a specific birth profile
 */
export declare function getBirthProfile(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/birth-data
 * Create a new birth profile
 */
export declare function createBirthProfile(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/v1/birth-data/:id
 * Update a birth profile
 * US-30: Archives old chart, triggers background regeneration
 */
export declare function updateBirthProfile(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/v1/birth-data/:id
 * Delete a birth profile
 */
export declare function deleteBirthProfile(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/locations/search
 * Search for locations (autocomplete)
 */
export declare function searchLocationsHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-data/:id/regeneration-status
 * US-30: Check chart regeneration status
 */
export declare function getRegenerationStatus(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-data/:id/history
 * US-30: Get chart history for a birth profile
 */
export declare function getChartHistory(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-data/:id/history/:historyId
 * US-30: Get a specific historical chart
 */
export declare function getHistoricalChart(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=birthDataController.d.ts.map