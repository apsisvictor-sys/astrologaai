/**
 * Notification Preferences Page
 * US-17: Transit Alerts (notification preferences for major transits)
 * US-29: Notification Preferences
 *
 * Route: /settings/notifications (Bulgarian) or /en/settings/notifications (English)
 *
 * Allows users to configure notification preferences for:
 * - Types: dailyHoroscope, weeklyForecast, transitAlerts, newReading, partnerUpdates, marketing
 * - Channels: email, push, sms
 *
 * Design Specifications from 06-ux-ui-design.md:
 * - Background: #0A0A0F
 * - Surface: #0A0A1F
 * - Primary: #7C3AED
 * - Secondary: #EC4899
 * - Text Primary: #FAFAFA
 * - Text Secondary: #CBD5E1
 * - Gradient: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

// Design System Colors (from 06-ux-ui-design.md)
const COLORS = {
  backgroundPrimary: '#0D0010',
  backgroundSecondary: 'rgba(255,255,255,0.03)',
  primary: '#e41aff',
  secondary: '#ff0080',
  textPrimary: '#FAFAFA',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.3)',
  gradient: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
  success: '#10B981',
  error: '#EF4444',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(228,26,255,0.2)',
};

// Types
interface NotificationTypes {
  dailyHoroscope: boolean;
  weeklyForecast: boolean;
  newReading: boolean;
  partnerUpdates: boolean;
  marketing: boolean;
}

interface NotificationChannels {
  email: boolean;
}

interface NotificationPreferences {
  types: NotificationTypes;
  channels: NotificationChannels;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

// Toggle Switch Component
function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${enabled ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899]' : 'bg-gray-600'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// Notification Type Card
function NotificationTypeCard({
  id,
  title,
  description,
  icon,
  enabled,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl transition-all hover:bg-opacity-80"
      style={{
        background: COLORS.backgroundSecondary,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ background: `${COLORS.primary}20` }}
        >
          {icon}
        </div>
        <div>
          <h4 className="font-medium" style={{ color: COLORS.textPrimary }}>
            {title}
          </h4>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            {description}
          </p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

// Channel Card
function ChannelCard({
  id,
  title,
  description,
  icon,
  enabled,
  onChange,
  extra,
}: {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: COLORS.backgroundSecondary,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <h4 className="font-medium" style={{ color: COLORS.textPrimary }}>
              {title}
            </h4>
            <p className="text-xs" style={{ color: COLORS.textSecondary }}>
              {description}
            </p>
          </div>
        </div>
        <Toggle enabled={enabled} onChange={onChange} />
      </div>
      {extra}
    </div>
  );
}

export default function NotificationPreferencesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    types: {
      dailyHoroscope: true,
      weeklyForecast: true,
      newReading: true,
      partnerUpdates: false,
      marketing: false,
    },
    channels: {
      email: true,
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/notifications');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch preferences
  useEffect(() => {
    if (isAuthenticated) {
      fetchPreferences();
    }
  }, [isAuthenticated]);

  const fetchPreferences = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/user/notifications`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPreferences({
          types: data.data.preferences.types,
          channels: { email: data.data.preferences.channels.email ?? true },
        });
      }
    } catch (error) {
      console.error('[Notifications] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle type toggle
  const handleTypeToggle = (type: keyof NotificationTypes) => {
    setPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type],
      },
    }));
  };

  // Handle channel toggle
  const handleChannelToggle = (channel: keyof NotificationChannels) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  // Save preferences
  const handleSave = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch(`${API_URL}/api/v1/user/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          types: preferences.types,
          channels: preferences.channels,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('[Notifications] Save error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
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

  // Notification types config with i18n
  const notificationTypes = [
    {
      id: 'dailyHoroscope',
      title: locale === 'bg' ? 'Дневен хороскоп' : 'Daily Horoscope',
      description: locale === 'bg' ? 'Персонализиран дневен хороскоп' : 'Personalized daily horoscope',
      icon: '☀️',
    },
    {
      id: 'weeklyForecast',
      title: t('forecast.weekly'),
      description: locale === 'bg' ? 'Седмична астрологична прогноза' : 'Weekly astrological forecast',
      icon: '🌙',
    },
    {
      id: 'newReading',
      title: locale === 'bg' ? 'Нови четения' : 'New Readings',
      description: locale === 'bg' ? 'Известия за нови тълкувания на карти' : 'Notifications about new chart interpretations',
      icon: '🔮',
    },
    {
      id: 'partnerUpdates',
      title: locale === 'bg' ? 'Партньорски актуализации' : 'Partner Updates',
      description: locale === 'bg' ? 'Известия за съвместимост и партньорски анализи' : 'Compatibility alerts and partner insights',
      icon: '💕',
    },
    {
      id: 'marketing',
      title: locale === 'bg' ? 'Маркетинг и промоции' : 'Marketing & Promotions',
      description: locale === 'bg' ? 'Специални оферти и съобщения' : 'Special offers and announcements',
      icon: '🎁',
    },
  ] as const;

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{
        background: COLORS.backgroundPrimary,
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
            }}
          >
            {locale === 'bg' ? 'Настройки за известия' : 'Notification Preferences'}
          </h1>
          <p style={{ color: COLORS.textSecondary }}>
            {locale === 'bg' ? 'Управлявайте как и кога получавате известия' : 'Control how and when you receive notifications'}
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
            ✓ {locale === 'bg' ? 'Настройките са запазени успешно!' : 'Preferences saved successfully!'}
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
            ✗ {t('errors.generic')}
          </div>
        )}

        {/* Notification Types Section */}
        <div className="mb-8">
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: COLORS.textPrimary }}
          >
            {locale === 'bg' ? 'Видове известия' : 'Notification Types'}
          </h2>
          <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>
            {locale === 'bg' ? 'Изберете кои известия искате да получавате' : 'Choose which notifications you want to receive'}
          </p>

          <div className="space-y-3">
            {notificationTypes.map((type) => (
              <NotificationTypeCard
                key={type.id}
                id={type.id}
                title={type.title}
                description={type.description}
                icon={type.icon}
                enabled={preferences.types[type.id]}
                onChange={() => handleTypeToggle(type.id)}
              />
            ))}
          </div>
        </div>

        {/* Delivery Channels Section */}
        <div className="mb-8">
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: COLORS.textPrimary }}
          >
            {locale === 'bg' ? 'Канали за доставка' : 'Delivery Channels'}
          </h2>
          <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>
            {locale === 'bg' ? 'Изберете как искате да получавате известията' : 'Choose how you want to receive notifications'}
          </p>

          <div className="space-y-3">
            {/* Email Channel */}
            <ChannelCard
              id="email"
              title={locale === 'bg' ? 'Имейл' : 'Email'}
              description={locale === 'bg' ? 'Получавайте известия по имейл' : 'Receive notifications via email'}
              icon="📧"
              enabled={preferences.channels.email}
              onChange={() => handleChannelToggle('email')}
            />

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
            : (locale === 'bg' ? 'Запази настройките' : 'Save Preferences')}
        </button>
      </div>
    </div>
  );
}
