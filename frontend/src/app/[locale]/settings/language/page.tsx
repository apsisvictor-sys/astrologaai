/**
 * Language Settings Page
 * US-25: Set Language Preference
 *
 * Route: /settings/language (Bulgarian) or /en/settings/language (English)
 *
 * Acceptance Criteria:
 * - User can select Bulgarian or English as preferred language
 * - Language preference is saved to user profile
 * - Changing language immediately updates UI
 * - Preference persists across sessions
 *
 * Design Specifications from 06-ux-ui-design.md:
 * - Background: #0A0A0F
 * - Surface: #0A0A1F
 * - Primary: #7C3AED
 * - Secondary: #EC4899
 * - Text Primary: #FAFAFA
 * - Text Secondary: #CBD5E1
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, Link, usePathname } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

// Design System Colors
const COLORS = {
  backgroundPrimary: '#0A0A0F',
  backgroundSecondary: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  textMuted: '#71717A',
  gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
  success: '#10B981',
  error: '#EF4444',
  surface: '#252532',
  border: 'rgba(124, 58, 237, 0.3)',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Language option config
const LANGUAGES = [
  {
    code: 'bg',
    name: 'Български',
    nativeName: 'Български',
    flag: '🇧🇬',
    description: 'Използвай български за интерфейса и AI отговорите',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    description: 'Use English for interface and AI responses',
  },
];

export default function LanguageSettingsPage() {
  const t = useTranslations('settings.language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading, user, refreshUser } = useAuth();

  // State
  const [selectedLanguage, setSelectedLanguage] = useState(locale);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/language');
    }
  }, [authLoading, isAuthenticated, router]);

  // Sync with user preference
  useEffect(() => {
    if (user?.language) {
      setSelectedLanguage(user.language);
    }
  }, [user]);

  // Handle language selection
  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLanguage(langCode);
    
    // Save to user profile
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch(`${API_URL}/api/v1/user/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ language: langCode }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        
        // Refresh user context
        if (refreshUser) {
          await refreshUser();
        }

        // Redirect to new locale
        router.replace(pathname, { locale: langCode });
        
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        // Revert selection on error
        setSelectedLanguage(locale);
      }
    } catch (error) {
      console.error('[Language] Save error:', error);
      setSaveStatus('error');
      setSelectedLanguage(locale);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.backgroundPrimary }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
            style={{ background: COLORS.gradient }}
          />
          <p style={{ color: COLORS.textSecondary }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{
        background: COLORS.backgroundPrimary,
        backgroundImage: `radial-gradient(ellipse at top, #1A1A2E 0%, ${COLORS.backgroundPrimary} 50%, #000000 100%)`,
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <Link
          href="/settings"
          className="flex items-center gap-2 mb-8"
          style={{ color: COLORS.textSecondary }}
        >
          ← {locale === 'bg' ? 'Обратно към настройки' : 'Back to settings'}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              color: COLORS.textPrimary,
              fontFamily: 'Playfair Display, serif',
            }}
          >
            {t('title')}
          </h1>
          <p style={{ color: COLORS.textSecondary }}>
            {t('description')}
          </p>
        </div>

        {/* Success message */}
        {saveStatus === 'success' && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              background: `${COLORS.success}20`,
              border: `1px solid ${COLORS.success}`,
              color: COLORS.success,
            }}
          >
            ✓ {t('saved')}
          </div>
        )}

        {/* Error message */}
        {saveStatus === 'error' && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              background: `${COLORS.error}20`,
              border: `1px solid ${COLORS.error}`,
              color: COLORS.error,
            }}
          >
            ✗ {t('error')}
          </div>
        )}

        {/* Language Options */}
        <div className="space-y-4">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              disabled={isSaving}
              className={`w-full p-5 rounded-xl text-left transition-all hover:-translate-y-1 ${
                isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{
                background: COLORS.backgroundSecondary,
                border: `2px solid ${
                  selectedLanguage === lang.code ? COLORS.primary : COLORS.border
                }`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{lang.flag}</span>
                  <div>
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: COLORS.textPrimary }}
                    >
                      {lang.nativeName}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: COLORS.textSecondary }}
                    >
                      {lang.description}
                    </p>
                  </div>
                </div>
                
                {selectedLanguage === lang.code && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: COLORS.gradient }}
                  >
                    ✓
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Note */}
        <div
          className="mt-8 p-4 rounded-xl"
          style={{
            background: `${COLORS.primary}10`,
            border: `1px solid ${COLORS.primary}30`,
          }}
        >
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            💡 {t('note')}
          </p>
        </div>

        {/* Saving indicator */}
        {isSaving && (
          <div
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <span style={{ color: COLORS.textSecondary }}>
              {t('saving')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
