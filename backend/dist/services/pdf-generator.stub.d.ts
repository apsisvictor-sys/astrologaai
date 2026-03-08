/**
 * PDF Generator Service Stub
 * Temporary stub when pdfkit/canvas are not available
 *
 * US-17: Generate Chart PDF
 */
import { NatalChart } from './astrology';
export declare function generateNatalChartPDF(data: {
    chart: NatalChart;
    profileName: string;
    birthDate: string;
    birthTime: string | null;
    locationName: string;
    language: 'en' | 'bg';
}): Promise<Buffer>;
export declare function getPDFHeaders(filename: string, preview?: boolean): {
    'Content-Type': string;
    'Content-Disposition': string;
};
declare const _default: {
    generateNatalChartPDF: typeof generateNatalChartPDF;
    getPDFHeaders: typeof getPDFHeaders;
};
export default _default;
//# sourceMappingURL=pdf-generator.stub.d.ts.map