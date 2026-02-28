/**
 * Chart Share Component
 * US-12: View Natal Chart
 * 
 * Provides shareable link functionality:
 * - Generate unique share link
 * - Copy to clipboard
 * - Privacy settings
 */

'use client';

import React, { useState, useCallback } from 'react';

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

interface ChartShareProps {
  chartId: string;
  profileId: string;
  profileName?: string;
  language?: 'en' | 'bg';
}

export default function ChartShare({
  chartId,
  profileId,
  profileName = 'Natal Chart',
  language = 'bg',
}: ChartShareProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  
  const isBulgarian = language === 'bg';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  // Generate shareable link
  const generateShareLink = useCallback(async () => {
    if (!chartId) {
      setError(isBulgarian ? 'Липсва ID на картата' : 'Chart ID is missing');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      
      const response = await fetch(
        `${API_URL}/api/v1/birth-chart/share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            chartId,
            profileId,
            isPublic,
            expiresIn: 7 * 24 * 60 * 60, // 7 days
          }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate share link');
      }
      
      setShareLink(data.data.shareUrl);
    } catch (err) {
      console.error('Share link error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  }, [chartId, profileId, isPublic, API_URL, isBulgarian]);
  
  // Copy link to clipboard
  const copyToClipboard = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      setError(isBulgarian ? 'Грешка при копиране' : 'Failed to copy');
    }
  };
  
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <h3
        className="text-lg font-semibold mb-4 flex items-center gap-2"
        style={{ color: colors.textPrimary }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {isBulgarian ? 'Сподели карта' : 'Share Chart'}
      </h3>
      
      {/* Privacy toggle */}
      <div className="mb-4">
        <label
          className="flex items-center gap-3 cursor-pointer"
        >
          <div
            className="relative w-11 h-6 rounded-full transition-all"
            style={{ background: isPublic ? colors.primary : colors.border }}
            onClick={() => setIsPublic(!isPublic)}
          >
            <div
              className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
              style={{ left: isPublic ? '24px' : '4px' }}
            />
          </div>
          <span style={{ color: colors.textSecondary }}>
            {isBulgarian ? 'Публична връзка' : 'Public link'}
          </span>
        </label>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          {isPublic
            ? (isBulgarian ? 'Всеки с връзката ще може да вижда картата' : 'Anyone with the link can view the chart')
            : (isBulgarian ? 'Само вие ще имате достъп' : 'Only you will have access')}
        </p>
      </div>
      
      {/* Generate button */}
      {!shareLink && (
        <button
          onClick={generateShareLink}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            color: 'white',
          }}
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
          <span className="font-medium">
            {isBulgarian ? 'Генерирай връзка' : 'Generate Link'}
          </span>
        </button>
      )}
      
      {/* Share link display */}
      {shareLink && (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: colors.background, border: `1px solid ${colors.border}` }}
          >
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.textPrimary }}
            />
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg transition-all"
              style={{ background: copied ? `${colors.success}20` : `${colors.primary}20` }}
            >
              {copied ? (
                <svg className="w-5 h-5" style={{ color: colors.success }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
          
          {copied && (
            <p className="text-sm text-center" style={{ color: colors.success }}>
              {isBulgarian ? 'Копирано!' : 'Copied!'}
            </p>
          )}
          
          {/* Social share buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`, '_blank')}
              className="flex-1 p-2 rounded-lg text-sm"
              style={{ background: '#1877F220', color: '#1877F2' }}
            >
              Facebook
            </button>
            <button
              onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(`${profileName}'s Natal Chart`)}`, '_blank')}
              className="flex-1 p-2 rounded-lg text-sm"
              style={{ background: '#1DA1F220', color: '#1DA1F2' }}
            >
              Twitter
            </button>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${profileName}'s natal chart: ${shareLink}`)}`, '_blank')}
              className="flex-1 p-2 rounded-lg text-sm"
              style={{ background: '#25D36620', color: '#25D366' }}
            >
              WhatsApp
            </button>
          </div>
          
          {/* Regenerate link */}
          <button
            onClick={() => {
              setShareLink(null);
              setCopied(false);
            }}
            className="w-full text-sm py-2"
            style={{ color: colors.textSecondary }}
          >
            {isBulgarian ? 'Генерирай нова връзка' : 'Generate new link'}
          </button>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div
          className="mt-3 p-3 rounded-xl text-sm"
          style={{ background: `${colors.error}15`, color: colors.error }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
