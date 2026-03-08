"use strict";
/**
 * Birth Chart Routes
 * US-06: Natal Chart Generation
 * US-12: View Natal Chart
 * US-13: Understand Chart Components
 * US-17: Generate Chart PDF
 * US-30: View Birth Time Sensitivity
 *
 * Routes for natal chart calculations, retrieval, sharing, analysis, and PDF export
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const natalChartController_1 = require("../controllers/natalChartController");
const chartAnalysisController_1 = require("../controllers/chartAnalysisController");
const pdfController_1 = require("../controllers/pdfController");
const aspectController_1 = require("../controllers/aspectController");
const timeSensitivityController_1 = require("../controllers/timeSensitivityController");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/birth-chart/shared/:token
 * Get a shared natal chart by token (public, no auth required)
 */
router.get('/shared/:token', natalChartController_1.getSharedNatalChart);
// All other birth chart routes require authentication
router.use(auth_1.authMiddleware);
/**
 * POST /api/v1/birth-chart
 * Generate a natal chart for a birth profile
 */
router.post('/', (0, rateLimiter_1.rateLimiter)(10, 60), natalChartController_1.generateNatalChart);
/**
 * POST /api/v1/birth-chart/share
 * Generate a shareable link for a natal chart
 */
router.post('/share', (0, rateLimiter_1.rateLimiter)(20, 60), natalChartController_1.shareNatalChart);
/**
 * GET /api/v1/birth-chart/:profileId
 * Get existing natal chart for a birth profile
 */
router.get('/:profileId', natalChartController_1.getNatalChart);
/**
 * GET /api/v1/birth-chart/:profileId/analysis
 * US-13: Get detailed analysis and interpretations for a birth chart
 * Query params: lang (en|bg), level (basic|intermediate|advanced)
 */
router.get('/:profileId/analysis', chartAnalysisController_1.getChartAnalysis);
/**
 * GET /api/v1/birth-chart/:profileId/analysis/planet/:planetName
 * US-13: Get detailed interpretation for a specific planet
 */
router.get('/:profileId/analysis/planet/:planetName', chartAnalysisController_1.getPlanetAnalysis);
/**
 * GET /api/v1/birth-chart/:profileId/analysis/house/:houseNumber
 * US-13: Get detailed interpretation for a specific house
 */
router.get('/:profileId/analysis/house/:houseNumber', chartAnalysisController_1.getHouseAnalysis);
/**
 * GET /api/v1/birth-chart/:profileId/aspects
 * US-14: Get all aspects for a birth chart
 * Query params: type, planet, nature, lang
 */
router.get('/:profileId/aspects', aspectController_1.getAspects);
/**
 * GET /api/v1/birth-chart/:profileId/aspects/matrix
 * US-14: Get aspect matrix/grid view data
 */
router.get('/:profileId/aspects/matrix', aspectController_1.getAspectMatrix);
/**
 * GET /api/v1/birth-chart/:profileId/aspects/:planet1/:planet2
 * US-14: Get specific aspect between two planets
 */
router.get('/:profileId/aspects/:planet1/:planet2', aspectController_1.getSpecificAspect);
// ============================================
// US-17: PDF Generation Routes
// ============================================
/**
 * GET /api/v1/birth-chart/:profileId/pdf/status
 * US-17: Check if PDF generation is available
 */
router.get('/:profileId/pdf/status', pdfController_1.getPDFStatus);
/**
 * GET /api/v1/birth-chart/:profileId/pdf
 * US-17: Download PDF via GET
 * Query params: lang (en|bg), preview (true|false)
 */
router.get('/:profileId/pdf', (0, rateLimiter_1.rateLimiter)(10, 60), pdfController_1.generateChartPDF);
/**
 * POST /api/v1/birth-chart/:profileId/pdf
 * US-17: Generate and download a professional PDF of the natal chart
 * Query params: lang (en|bg), preview (true|false)
 */
router.post('/:profileId/pdf', (0, rateLimiter_1.rateLimiter)(10, 60), pdfController_1.generateChartPDF);
/**
 * POST /api/v1/birth-chart/:profileId/pdf/email
 * US-17: Generate PDF and send via email
 * Body: { email?: string, lang?: 'en'|'bg' }
 */
router.post('/:profileId/pdf/email', (0, rateLimiter_1.rateLimiter)(5, 60), pdfController_1.emailChartPDF);
/**
 * DELETE /api/v1/birth-chart/:profileId
 * Delete a natal chart
 */
router.delete('/:profileId', natalChartController_1.deleteNatalChart);
/**
 * POST /api/v1/birth-chart/recalculate/:profileId
 * Force recalculation of a natal chart
 */
router.post('/recalculate/:profileId', (0, rateLimiter_1.rateLimiter)(5, 60), natalChartController_1.recalculateNatalChart);
// ============================================
// US-30: Birth Time Sensitivity Routes
// ============================================
/**
 * GET /api/v1/birth-chart/:profileId/time-sensitivity/summary
 * US-30: Get quick summary of time sensitivity (lightweight)
 * Query params: lang (en|bg)
 */
router.get('/:profileId/time-sensitivity/summary', (0, rateLimiter_1.rateLimiter)(30, 60), timeSensitivityController_1.getTimeSensitivitySummary);
/**
 * GET /api/v1/birth-chart/:profileId/time-sensitivity
 * US-30: Get full time sensitivity analysis
 * Query params: timeRange (minutes, default 30), interval (minutes, default 5), lang (en|bg)
 */
router.get('/:profileId/time-sensitivity', (0, rateLimiter_1.rateLimiter)(10, 60), timeSensitivityController_1.getTimeSensitivity);
exports.default = router;
//# sourceMappingURL=birthChart.js.map