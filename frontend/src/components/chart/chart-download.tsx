/**
 * Chart Download Component
 * US-12: View Natal Chart
 * 
 * Provides download functionality for natal charts:
 * - Download as PNG
 * - Download as PDF
 */

'use client';

import React, { useState, useRef } from 'react';

// Design system colors (US-12 spec)
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  success: '#10B981',
  error: '#EF4444',
};

interface ChartDownloadProps {
  chartRef: React.RefObject<HTMLDivElement>;
  profileName?: string;
  language?: 'en' | 'bg';
  chartId?: string;
}

export default function ChartDownload({
  chartRef,
  profileName = 'Natal Chart',
  language = 'bg',
  chartId,
}: ChartDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  
  const isBulgarian = language === 'bg';
  
  // Download as PNG
  const downloadAsPNG = async () => {
    if (!chartRef.current) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(null);
    
    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: colors.background,
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
      });
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloadError(isBulgarian ? 'Грешка при създаване на изображение' : 'Failed to create image');
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${profileName.replace(/\s+/g, '_')}_natal_chart.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setDownloadSuccess(isBulgarian ? 'Изтеглено като PNG' : 'Downloaded as PNG');
        setTimeout(() => setDownloadSuccess(null), 3000);
      }, 'image/png');
    } catch (error) {
      console.error('PNG download error:', error);
      setDownloadError(isBulgarian ? 'Грешка при изтегляне' : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Download as PDF
  const downloadAsPDF = async () => {
    if (!chartRef.current) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(null);
    
    try {
      // Dynamic imports
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: colors.background,
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF (A4 landscape)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions to fit page with margins
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      
      // Center image on page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      
      // Download
      pdf.save(`${profileName.replace(/\s+/g, '_')}_natal_chart.pdf`);
      
      setDownloadSuccess(isBulgarian ? 'Изтеглено като PDF' : 'Downloaded as PDF');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (error) {
      console.error('PDF download error:', error);
      setDownloadError(isBulgarian ? 'Грешка при изтегляне' : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-3">
      {/* Download buttons */}
      <div className="flex gap-3">
        <button
          onClick={downloadAsPNG}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: `${colors.primary}20`,
            color: colors.primary,
            border: `1px solid ${colors.primary}40`,
          }}
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <span className="font-medium">PNG</span>
        </button>
        
        <button
          onClick={downloadAsPDF}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: `${colors.secondary}20`,
            color: colors.secondary,
            border: `1px solid ${colors.secondary}40`,
          }}
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
          <span className="font-medium">PDF</span>
        </button>
      </div>
      
      {/* Status messages */}
      {downloadError && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{ background: `${colors.error}15`, color: colors.error }}
        >
          {downloadError}
        </div>
      )}
      
      {downloadSuccess && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{ background: `${colors.success}15`, color: colors.success }}
        >
          {downloadSuccess}
        </div>
      )}
    </div>
  );
}
