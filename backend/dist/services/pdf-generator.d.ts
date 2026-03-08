/**
 * PDF Generator Service
 * US-17: Generate Chart PDF
 *
 * Generates professional PDF natal charts using PDFKit
 * Includes: chart wheel, planet positions, houses, aspects
 */
import { NatalChart } from './astrology';
interface ChartPDFData {
    chart: NatalChart;
    profileName: string;
    birthDate: string;
    birthTime: string | null;
    locationName: string;
    language: 'en' | 'bg';
}
/**
 * Generate a professional PDF document for natal chart
 */
export declare function generateNatalChartPDF(data: ChartPDFData): Promise<Buffer>;
/**
 * Get content type and headers for PDF response
 */
export declare function getPDFHeaders(filename: string): Record<string, string>;
export {};
//# sourceMappingURL=pdf-generator.d.ts.map