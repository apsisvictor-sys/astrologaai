/**
 * PDF Generator Service Stub
 * Temporary stub when pdfkit/canvas are not available
 * 
 * US-17: Generate Chart PDF
 */

import { NatalChart } from './astrology';

// Stub for PDF generation when dependencies are not available
export async function generateNatalChartPDF(data: {
  chart: NatalChart;
  profileName: string;
  birthDate: string;
  birthTime: string | null;
  locationName: string;
  language: 'en' | 'bg';
}): Promise<Buffer> {
  throw new Error('PDF generation requires pdfkit and canvas dependencies. Please install them to enable this feature.');
}

export function getPDFHeaders(filename: string, preview: boolean = false) {
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': preview 
      ? 'inline' 
      : `attachment; filename="${filename}"`,
  };
}

export default {
  generateNatalChartPDF,
  getPDFHeaders,
};
