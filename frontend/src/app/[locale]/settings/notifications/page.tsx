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
import { useRouter, Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

// Design System Colors (from 06-ux-ui-design.md)
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

// Types
interface NotificationTypes {
  dailyHoroscope: boolean;
  weeklyForecast: boolean;
  transitAlerts: boolean;  // US-17: Transit Alerts
  newReading: boolean;
  partnerUpdates: boolean;
  marketing: boolean;
}

interface NotificationChannels {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface NotificationPreferences {
  types: NotificationTypes;
  channels: NotificationChannels;
  phoneNumber: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
      transitAlerts: true,  // US-17: enabled by default
      newReading: true,
      partnerUpdates: false,
      marketing: false,
    },
    channels: {
      email: true,
      push: false,
      sms: false,
    },
    phoneNumber: null,
  });
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [pushSupported, setPushSupported] = useState(false);

  // Check push notification support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPushSupported('Notification' in window);
    }
  }, []);

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
          channels: data.data.preferences.channels,
          phoneNumber: data.data.preferences.phoneNumber,
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
          phoneNumber: phoneNumberInput || null,
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
      id: 'transitAlerts',
      title: t('alerts.transit.title'),
      description: t('alerts.transit.description'),
      icon: '🌌',
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

            {/* Push Channel */}
            <ChannelCard
              id="push"
              title={locale === 'bg' ? 'Push известия' : 'Push Notifications'}
              description={locale === 'bg' ? 'Известия на вашето устройство' : 'Notifications on your device'}
              icon="🔔"
              enabled={preferences.channels.push}
              onChange={() => pushSupported && handleChannelToggle('push')}
              extra={
                !pushSupported ? (
                  <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>
                    {locale === 'bg' ? 'Вашето устройство не поддържа push известия' : 'Your device does not support push notifications'}
                  </p>
                ) : null
              }
            />

            {/* SMS Channel */}
            <ChannelCard
              id="sms"
              title="SMS"
              description={locale === 'bg' ? 'Текстови съобщения на телефона' : 'Text messages to your phone'}
              icon="📱"
              enabled={preferences.channels.sms}
              onChange={() => handleChannelToggle('sms')}
              extra={
                <div className="mt-3">
                  <label
                    className="block text-sm mb-1"
                    style={{ color: COLORS.textSecondary }}
                  >
                    {locale === 'bg' ? 'Телефонен номер' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    placeholder="+359 888 123 456"
                    value={phoneNumberInput}
                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: COLORS.backgroundPrimary,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textPrimary,
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                    {locale === 'bg' ? 'Нужен е за SMS известия (по желание)' : 'Required for SMS notifications (optional)'}
                  </p>
                </div>
              }
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
