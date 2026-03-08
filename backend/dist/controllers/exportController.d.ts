/**
 * Export Data Controller
 * US-32: Export User Data (GDPR Data Portability)
 *
 * Handles asynchronous data export in JSON or PDF format
 *
 * Acceptance Criteria:
 * - User can request export of all their data
 * - Export includes: profile, birth chart, chat history, forecasts, partners
 * - Export generated asynchronously (large datasets)
 * - User receives email with download link when ready
 * - Download link expires after 7 days
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Request a data export
 * POST /api/v1/user/export
 *
 * @body { format: 'json' | 'pdf' }
 * @returns { exportId: string, estimatedTime: string }
 */
export declare function requestExport(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Get export status
 * GET /api/v1/user/export/:id
 */
export declare function getExportStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Download exported data
 * GET /api/v1/user/export/:id/download
 */
export declare function downloadExport(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * List user's export history
 * GET /api/v1/user/export
 */
export declare function listExports(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Synchronous data export (immediate download)
 * GET /api/v1/user/export/download
 *
 * US-32: Export User Data - Simple synchronous endpoint
 * Returns all user data immediately in JSON format
 */
export declare function exportDataSync(req: Request, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    requestExport: typeof requestExport;
    getExportStatus: typeof getExportStatus;
    downloadExport: typeof downloadExport;
    listExports: typeof listExports;
    exportDataSync: typeof exportDataSync;
};
export default _default;
//# sourceMappingURL=exportController.d.ts.map