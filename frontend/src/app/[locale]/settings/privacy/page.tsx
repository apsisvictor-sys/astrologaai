/**
 * Privacy Settings Page
 * US-31: Delete Account
 * US-32: Export User Data
 *
 * Route: /settings/privacy (Bulgarian) or /en/settings/privacy (English)
 *
 * Acceptance Criteria US-31:
 * - User can delete their account from settings
 * - Deletion requires confirmation (modal)
 * - All user data is permanently deleted
 * - Deletion is logged for compliance
 *
 * Acceptance Criteria US-32:
 * - User can request data export
 * - Export includes: profile, birth profiles, chat history, preferences
 * - Export delivered as JSON file download
 * - Export available within 48 hours
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
  warning: '#F59E0B',
  surface: '#252532',
  border: 'rgba(124, 58, 237, 0.3)',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

export default function PrivacySettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, signOut } = useAuth();

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Export history
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/privacy');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch export history
  useEffect(() => {
    if (isAuthenticated) {
      fetchExportHistory();
    }
  }, [isAuthenticated]);

  const fetchExportHistory = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/user/export`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setExportHistory(data.data.exports || []);
      }
    } catch (error) {
      console.error('[Privacy] Fetch export history error:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle data export
  const handleExport = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    setIsExporting(true);
    setExportStatus('idle');
    setExportMessage('');

    try {
      const response = await fetch(`${API_URL}/api/v1/user/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ format: 'json' }),
      });

      const data = await response.json();

      if (data.success) {
        setExportStatus('success');
        setExportMessage(
          locale === 'bg'
            ? 'Експортът е заявен. Ще получите имейл когато е готов.'
            : 'Export requested. You will receive an email when ready.'
        );
        fetchExportHistory();
      } else {
        setExportStatus('error');
        setExportMessage(data.error?.message || t('errors.generic'));
      }
    } catch (error) {
      console.error('[Privacy] Export error:', error);
      setExportStatus('error');
      setExportMessage(t('errors.networkError'));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle immediate export download
  const handleImmediateExport = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    setIsExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/user/export/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `astrologaai-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setExportStatus('success');
        setExportMessage(locale === 'bg' ? 'Данните са изтеглени!' : 'Data downloaded!');
      } else {
        setExportStatus('error');
        setExportMessage(t('errors.generic'));
      }
    } catch (error) {
      console.error('[Privacy] Immediate export error:', error);
      setExportStatus('error');
      setExportMessage(t('errors.networkError'));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    // Validate inputs
    if (!deletePassword) {
      setDeleteError(locale === 'bg' ? 'Моля въведете паролата си' : 'Please enter your password');
      return;
    }

    const confirmWord = locale === 'bg' ? 'ИЗТРИЙ' : 'DELETE';
    if (deleteConfirmText.toUpperCase() !== confirmWord) {
      setDeleteError(
        locale === 'bg'
          ? 'Моля напишете ИЗТРИЙ за да потвърдите'
          : 'Please type DELETE to confirm'
      );
      return;
    }

    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch(`${API_URL}/api/v1/user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear local storage
        localStorage.removeItem('astrologaai_access_token');
        localStorage.removeItem('astrologaai_refresh_token');

        // Logout user
        if (signOut) {
          await signOut();
        }

        // Redirect to home with message
        router.push('/?deleted=true');
      } else {
        setDeleteError(data.error?.message || t('errors.generic'));
      }
    } catch (error) {
      console.error('[Privacy] Delete account error:', error);
      setDeleteError(t('errors.networkError'));
    } finally {
      setIsDeleting(false);
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
            {locale === 'bg' ? 'Поверителност и данни' : 'Privacy & Data'}
          </h1>
          <p style={{ color: COLORS.textSecondary }}>
            {locale === 'bg'
              ? 'Управлявайте вашите данни и поверителност'
              : 'Manage your data and privacy settings'}
          </p>
        </div>

        {/* Export Section - US-32 */}
        <div
          className="p-6 rounded-xl mb-6"
          style={{
            background: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${COLORS.primary}20` }}
            >
              📦
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: COLORS.textPrimary }}
              >
                {locale === 'bg' ? 'Експорт на данни' : 'Export Your Data'}
              </h2>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                {locale === 'bg'
                  ? 'Изтеглете всичките си данни в JSON формат'
                  : 'Download all your data in JSON format'}
              </p>
            </div>
          </div>

          {/* Export status */}
          {exportStatus === 'success' && (
            <div
              className="mb-4 p-4 rounded-lg"
              style={{
                background: `${COLORS.success}20`,
                border: `1px solid ${COLORS.success}`,
                color: COLORS.success,
              }}
            >
              ✓ {exportMessage}
            </div>
          )}

          {exportStatus === 'error' && (
            <div
              className="mb-4 p-4 rounded-lg"
              style={{
                background: `${COLORS.error}20`,
                border: `1px solid ${COLORS.error}`,
                color: COLORS.error,
              }}
            >
              ✗ {exportMessage}
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleImmediateExport}
              disabled={isExporting}
              className="flex-1 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: COLORS.gradient,
                color: COLORS.textPrimary,
              }}
            >
              {isExporting
                ? (locale === 'bg' ? 'Изтегляне...' : 'Downloading...')
                : (locale === 'bg' ? 'Изтегли сега' : 'Download Now')}
            </button>
          </div>

          {/* What's included */}
          <div
            className="mt-4 p-4 rounded-lg"
            style={{ background: COLORS.surface }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: COLORS.textPrimary }}>
              {locale === 'bg' ? 'Включени данни:' : 'Included data:'}
            </p>
            <ul className="text-sm space-y-1" style={{ color: COLORS.textSecondary }}>
              <li>• {locale === 'bg' ? 'Информация за акаунта' : 'Account information'}</li>
              <li>• {locale === 'bg' ? 'Рождени данни и карти' : 'Birth data and charts'}</li>
              <li>• {locale === 'bg' ? 'История на чатовете' : 'Chat history'}</li>
              <li>• {locale === 'bg' ? 'Партньори и връзки' : 'Partners and relationships'}</li>
              <li>• {locale === 'bg' ? 'Настройки и предпочитания' : 'Settings and preferences'}</li>
            </ul>
          </div>
        </div>

        {/* Delete Account Section - US-31 */}
        <div
          className="p-6 rounded-xl"
          style={{
            background: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.error}40`,
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${COLORS.error}20` }}
            >
              ⚠️
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: COLORS.error }}
              >
                {locale === 'bg' ? 'Изтриване на акаунт' : 'Delete Account'}
              </h2>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                {locale === 'bg'
                  ? 'Перманентно изтрийте вашия акаунт и всички данни'
                  : 'Permanently delete your account and all data'}
              </p>
            </div>
          </div>

          <div
            className="p-4 rounded-lg mb-4"
            style={{
              background: `${COLORS.error}10`,
              border: `1px solid ${COLORS.error}30`,
            }}
          >
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              ⚠️ {locale === 'bg'
                ? 'Това действие е необратимо! Всички данни ще бъдат изтрити завинаги.'
                : 'This action is irreversible! All data will be permanently deleted.'}
            </p>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 rounded-lg font-medium transition-all hover:opacity-90"
            style={{
              background: `${COLORS.error}20`,
              border: `1px solid ${COLORS.error}`,
              color: COLORS.error,
            }}
          >
            {locale === 'bg' ? 'Изтрий акаунта' : 'Delete Account'}
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          >
            <div
              className="w-full max-w-md p-6 rounded-xl"
              style={{ background: COLORS.backgroundSecondary }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-xl font-bold mb-4"
                style={{ color: COLORS.error }}
              >
                {locale === 'bg' ? 'Потвърждение за изтриване' : 'Confirm Deletion'}
              </h3>

              <p className="mb-4" style={{ color: COLORS.textSecondary }}>
                {locale === 'bg'
                  ? 'Това ще изтрие перманентно вашия акаунт, включително:'
                  : 'This will permanently delete your account, including:'}
              </p>

              <ul className="mb-4 text-sm space-y-1" style={{ color: COLORS.textSecondary }}>
                <li>• {locale === 'bg' ? 'Всички рождени карти' : 'All birth charts'}</li>
                <li>• {locale === 'bg' ? 'История на чатовете' : 'Chat history'}</li>
                <li>• {locale === 'bg' ? 'Партньори и връзки' : 'Partners and relationships'}</li>
                <li>• {locale === 'bg' ? 'Абонамент и плащания' : 'Subscription and payments'}</li>
              </ul>

              {deleteError && (
                <div
                  className="mb-4 p-3 rounded-lg text-sm"
                  style={{
                    background: `${COLORS.error}20`,
                    color: COLORS.error,
                  }}
                >
                  {deleteError}
                </div>
              )}

              {/* Password input */}
              <div className="mb-4">
                <label
                  className="block text-sm mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  {locale === 'bg' ? 'Вашата парола' : 'Your password'}
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: COLORS.backgroundPrimary,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                  placeholder="••••••••"
                />
              </div>

              {/* Confirmation text input */}
              <div className="mb-6">
                <label
                  className="block text-sm mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  {locale === 'bg'
                    ? 'Напишете ИЗТРИЙ за да потвърдите'
                    : 'Type DELETE to confirm'}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: COLORS.backgroundPrimary,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                  placeholder={locale === 'bg' ? 'ИЗТРИЙ' : 'DELETE'}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
                  style={{
                    background: COLORS.surface,
                    color: COLORS.textPrimary,
                  }}
                >
                  {locale === 'bg' ? 'Отказ' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: COLORS.error,
                    color: COLORS.textPrimary,
                  }}
                >
                  {isDeleting
                    ? (locale === 'bg' ? 'Изтриване...' : 'Deleting...')
                    : (locale === 'bg' ? 'Изтрий акаунта' : 'Delete Account')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
