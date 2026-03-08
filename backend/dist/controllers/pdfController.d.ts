/**
 * PDF Controller
 * US-17: Generate Chart PDF
 *
 * Handles PDF generation and download for natal charts
 */
import { Request, Response } from 'express';
/**
 * POST /api/v1/birth-chart/:profileId/pdf
 * Generate and download a PDF of the natal chart
 *
 * Query params:
 * - lang: 'en' | 'bg' (default: 'bg')
 * - preview: 'true' to return inline instead of attachment
 */
export declare function generateChartPDF(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/birth-chart/:profileId/pdf/email
 * Generate PDF and send via email
 *
 * Body:
 * - email: string (optional, defaults to user's email)
 * - lang: 'en' | 'bg' (default: 'bg')
 */
export declare function emailChartPDF(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/birth-chart/:profileId/pdf/status
 * Check if PDF generation is available for the chart
 */
export declare function getPDFStatus(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=pdfController.d.ts.map