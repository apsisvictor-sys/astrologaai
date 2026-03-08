/**
 * Partner Controller
 * US-18: Add Partner - CRUD operations for partner management
 * US-19: Synastry Chart Generation
 * US-20: Compatibility Report
 */
import { Request, Response } from 'express';
/**
 * GET /api/partners
 * List all partners for the authenticated user
 */
export declare const listPartners: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/partners/:id
 * Get a specific partner's details
 */
export declare const getPartner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/partners
 * Add a new partner
 */
export declare const createPartner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * PUT /api/partners/:id
 * Update a partner's information
 */
export declare const updatePartner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * DELETE /api/partners/:id
 * Remove a partner
 */
export declare const deletePartner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/partners/:id/synastry
 * US-19: Get synastry chart between user and partner
 */
export declare const getSynastry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/partners/:id/report
 * US-20: Get detailed compatibility report
 */
export declare const getCompatibilityReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=partnerController.d.ts.map