"use strict";
/**
 * PDF Generator Service Stub
 * Temporary stub when pdfkit/canvas are not available
 *
 * US-17: Generate Chart PDF
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNatalChartPDF = generateNatalChartPDF;
exports.getPDFHeaders = getPDFHeaders;
// Stub for PDF generation when dependencies are not available
async function generateNatalChartPDF(data) {
    throw new Error('PDF generation requires pdfkit and canvas dependencies. Please install them to enable this feature.');
}
function getPDFHeaders(filename, preview = false) {
    return {
        'Content-Type': 'application/pdf',
        'Content-Disposition': preview
            ? 'inline'
            : `attachment; filename="${filename}"`,
    };
}
exports.default = {
    generateNatalChartPDF,
    getPDFHeaders,
};
//# sourceMappingURL=pdf-generator.stub.js.map