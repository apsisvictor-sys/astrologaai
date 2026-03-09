"use strict";
/**
 * Data Export PDF Generator Service
 * US-32: Export User Data (GDPR Data Portability)
 *
 * Stub: pdfkit/canvas removed — not available in Railway Nixpacks (no Python, no pre-built binary for Node 22).
 * PDF export returns an error; JSON export continues to work normally.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDataExportPDF = generateDataExportPDF;
/**
 * Generate a human-readable PDF document of user data.
 * Currently stubbed — pdfkit is not available in the Railway deployment environment.
 * Use JSON export instead.
 */
async function generateDataExportPDF(_data) {
    throw new Error('PDF export is not available in this environment. Please use JSON format instead.');
}
exports.default = generateDataExportPDF;
//# sourceMappingURL=data-export-pdf.js.map