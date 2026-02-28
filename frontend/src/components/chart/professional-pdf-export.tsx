/**
 * Professional PDF Export Component
 * US-17: Generate Chart PDF
 * 
 * Provides professional PDF export functionality for natal charts:
 * - Server-side PDF generation with professional formatting
 * - Chart wheel graphic
 * - Planet positions table
 * - House positions
 * - Aspect summary
 * - Download or preview options
 * - Email option
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

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
  warning: '#F59E0B',
};

interface ProfessionalPDFExportProps {
  profileId: string;
  profileName?: string;
  language?: 'en' | 'bg';
  hasChart?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

type ExportMode = 'download' | 'preview' | 'email';

export default function ProfessionalPDFExport({
  profileId,
  profileName = 'Natal Chart',
  language = 'bg',
  hasChart = true,
  onExportStart,
  onExportComplete,
  onExportError,
}: ProfessionalPDFExportProps) {
  const { isAuthenticated } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('download');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  
  const isBulgarian = language === 'bg';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const translations = {
    downloadPDF: isBulgarian ? 'Изтегли PDF' : 'Download PDF',
    previewPDF: isBulgarian ? 'Преглед PDF' : 'Preview PDF',
    emailPDF: isBulgarian ? 'Изпрати по имейл' : 'Email PDF',
    professionalExport: isBulgarian ? 'Професионален експорт' : 'Professional Export',
    downloading: isBulgarian ? 'Генериране...' : 'Generating...',
    emailSent: isBulgarian ? 'PDF изпратен успешно!' : 'PDF sent successfully!',
    downloadSuccess: isBulgarian ? 'PDF изтеглен успешно!' : 'PDF downloaded successfully!',
    exportError: isBulgarian ? 'Грешка при генериране на PDF' : 'Failed to generate PDF',
    enterEmail: isBulgarian ? 'Въведете имейл адрес' : 'Enter email address',
    send: isBulgarian ? 'Изпрати' : 'Send',
    cancel: isBulgarian ? 'Отказ' : 'Cancel',
    includesChart: isBulgarian ? 'Включва: колело на картата, таблици с планети, къщи, аспекти' : 'Includes: chart wheel, planet tables, houses, aspects',
    noChart: isBulgarian ? 'Първо генерирайте картата' : 'Generate chart first',
  };

  const handleExport = async (mode: ExportMode) => {
    if (!isAuthenticated || !profileId) return;
    
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);
    setExportMode(mode);
    
    onExportStart?.();

    try {
      const token = localStorage.getItem('astrologaai_access_token');
      
      if (mode === 'email') {
        // Email mode - send PDF via email
        const response = await fetch(
          `${API_URL}/api/v1/birth-chart/${profileId}/pdf/email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: emailAddress || undefined,
              lang: language,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || translations.exportError);
        }

        setExportSuccess(translations.emailSent);
        setShowEmailInput(false);
        setTimeout(() => setExportSuccess(null), 5000);
      } else {
        // Download or preview mode
        const preview = mode === 'preview';
        const url = `${API_URL}/api/v1/birth-chart/${profileId}/pdf?lang=${language}&preview=${preview}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || translations.exportError);
        }

        // Get PDF blob
        const blob = await response.blob();
        
        // Create download/preview link
        const blobUrl = URL.createObjectURL(blob);
        const sanitized = profileName.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_');
        const filename = `${sanitized}_natal_chart_${new Date().toISOString().split('T')[0]}.pdf`;

        if (preview) {
          // Open in new tab for preview
          window.open(blobUrl, '_blank');
        } else {
          // Download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        URL.revokeObjectURL(blobUrl);
        setExportSuccess(translations.downloadSuccess);
        setTimeout(() => setExportSuccess(null), 3000);
      }

      onExportComplete?.();
    } catch (error) {
      console.error('PDF export error:', error);
      const errorMsg = error instanceof Error ? error.message : translations.exportError;
      setExportError(errorMsg);
      onExportError?.(errorMsg);
    } finally {
      setIsExporting(false);
      setExportMode('download');
    }
  };

  const handleEmailClick = () => {
    if (showEmailInput) {
      handleExport('email');
    } else {
      setShowEmailInput(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="font-semibold" style={{ color: colors.textPrimary }}>
          {translations.professionalExport}
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm" style={{ color: colors.textSecondary }}>
        {translations.includesChart}
      </p>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Download button */}
        <button
          onClick={() => handleExport('download')}
          disabled={isExporting || !hasChart}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            color: 'white',
          }}
          title={!hasChart ? translations.noChart : undefined}
        >
          {isExporting && exportMode === 'download' ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          <span className="font-medium">{translations.downloadPDF}</span>
        </button>

        {/* Preview button */}
        <button
          onClick={() => handleExport('preview')}
          disabled={isExporting || !hasChart}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: `${colors.primary}20`,
            color: colors.primary,
            border: `1px solid ${colors.primary}40`,
          }}
          title={!hasChart ? translations.noChart : undefined}
        >
          {isExporting && exportMode === 'preview' ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
          <span className="font-medium">{translations.previewPDF}</span>
        </button>

        {/* Email button */}
        <button
          onClick={handleEmailClick}
          disabled={isExporting || !hasChart}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: `${colors.secondary}20`,
            color: colors.secondary,
            border: `1px solid ${colors.secondary}40`,
          }}
          title={!hasChart ? translations.noChart : undefined}
        >
          {isExporting && exportMode === 'email' ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          <span className="font-medium">{translations.emailPDF}</span>
        </button>
      </div>

      {/* Email input */}
      {showEmailInput && (
        <div className="flex gap-2 mt-2">
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder={translations.enterEmail}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              background: colors.surface,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
            }}
          />
          <button
            onClick={() => handleExport('email')}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              background: colors.secondary,
              color: 'white',
            }}
          >
            {translations.send}
          </button>
          <button
            onClick={() => setShowEmailInput(false)}
            className="px-4 py-2 rounded-lg"
            style={{
              background: colors.surface,
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
            }}
          >
            {translations.cancel}
          </button>
        </div>
      )}

      {/* Status messages */}
      {exportError && (
        <div
          className="p-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: `${colors.error}15`, color: colors.error }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {exportError}
        </div>
      )}

      {exportSuccess && (
        <div
          className="p-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: `${colors.success}15`, color: colors.success }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {exportSuccess}
        </div>
      )}
    </div>
  );
}
