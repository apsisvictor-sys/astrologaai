/**
 * Edit Profile Page
 * US-28: Edit Profile
 *
 * Route: /settings/profile (Bulgarian) or /en/settings/profile (English)
 *
 * Acceptance Criteria:
 * - User can edit full name
 * - User can change profile picture (Gravatar or upload)
 * - Changes save immediately
 * - Profile updates across all devices
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
import { useRouter, Link } from '@/i18n/routing';
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

export default function EditProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, refreshUser } = useAuth();

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/profile');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load user data
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setAvatarUrl(user.avatarUrl || '');
      setIsLoading(false);
    }
  }, [user]);

  // Handle form submission
  const handleSave = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/v1/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        // Refresh user context to update across all devices
        if (refreshUser) {
          await refreshUser();
        }
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setErrorMessage(data.error?.message || (locale === 'bg' ? 'Грешка при запазване' : 'Error saving'));
      }
    } catch (error) {
      console.error('[Profile] Save error:', error);
      setSaveStatus('error');
      setErrorMessage(locale === 'bg' ? 'Мрежова грешка' : 'Network error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload (using Gravatar for now)
  const handleAvatarChange = () => {
    // Gravatar is automatic based on email
    // For custom upload, would need file input and upload endpoint
    const gravatarUrl = `https://www.gravatar.com/avatar/${encodeURIComponent(email.trim().toLowerCase())}?d=identicon&s=200`;
    setAvatarUrl(gravatarUrl);
  };

  // Loading state
  if (authLoading || isLoading) {
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
            {locale === 'bg' ? 'Редактиране на профил' : 'Edit Profile'}
          </h1>
          <p style={{ color: COLORS.textSecondary }}>
            {locale === 'bg' ? 'Управлявайте вашата лична информация' : 'Manage your personal information'}
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
            ✓ {locale === 'bg' ? 'Профилът е обновен успешно!' : 'Profile updated successfully!'}
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
            ✗ {errorMessage || t('errors.generic')}
          </div>
        )}

        {/* Avatar Section */}
        <div
          className="p-6 rounded-xl mb-6"
          style={{
            background: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: COLORS.textPrimary }}
          >
            {locale === 'bg' ? 'Профилна снимка' : 'Profile Picture'}
          </h2>
          
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-3xl"
              style={{ background: COLORS.gradient }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                fullName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || '?'
              )}
            </div>
            
            <div>
              <p className="text-sm mb-2" style={{ color: COLORS.textSecondary }}>
                {locale === 'bg' 
                  ? 'Използваме Gravatar за профилната снимка' 
                  : 'We use Gravatar for profile pictures'}
              </p>
              <button
                onClick={handleAvatarChange}
                className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
                style={{
                  background: `${COLORS.primary}20`,
                  color: COLORS.primary,
                  border: `1px solid ${COLORS.primary}`,
                }}
              >
                {locale === 'bg' ? 'Обнови от Gravatar' : 'Refresh from Gravatar'}
              </button>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div
          className="p-6 rounded-xl mb-6"
          style={{
            background: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: COLORS.textPrimary }}
          >
            {locale === 'bg' ? 'Лична информация' : 'Personal Information'}
          </h2>

          {/* Full Name */}
          <div className="mb-4">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: COLORS.textSecondary }}
            >
              {locale === 'bg' ? 'Пълно име' : 'Full Name'}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={locale === 'bg' ? 'Иван Иванов' : 'John Doe'}
              className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2"
              style={{
                background: COLORS.backgroundPrimary,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textPrimary,
              }}
            />
          </div>

          {/* Email (Read-only) */}
          <div className="mb-4">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: COLORS.textSecondary }}
            >
              {locale === 'bg' ? 'Имейл' : 'Email'}
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-3 rounded-lg opacity-60 cursor-not-allowed"
              style={{
                background: COLORS.backgroundPrimary,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textSecondary,
              }}
            />
            <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
              {locale === 'bg' 
                ? 'Имейлът не може да бъде променен' 
                : 'Email cannot be changed'}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: COLORS.gradient,
            color: COLORS.textPrimary,
          }}
        >
          {isSaving
            ? (locale === 'bg' ? 'Запазване...' : 'Saving...')
            : (locale === 'bg' ? 'Запази промените' : 'Save Changes')}
        </button>
      </div>
    </div>
  );
}
