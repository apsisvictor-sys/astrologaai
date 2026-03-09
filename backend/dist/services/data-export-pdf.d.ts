/**
 * Data Export PDF Generator Service
 * US-32: Export User Data (GDPR Data Portability)
 *
 * Stub: pdfkit/canvas removed — not available in Railway Nixpacks (no Python, no pre-built binary for Node 22).
 * PDF export returns an error; JSON export continues to work normally.
 */
/**
 * Generate a human-readable PDF document of user data.
 * Currently stubbed — pdfkit is not available in the Railway deployment environment.
 * Use JSON export instead.
 */
export declare function generateDataExportPDF(_data: unknown): Promise<Buffer>;
export default generateDataExportPDF;
//# sourceMappingURL=data-export-pdf.d.ts.map