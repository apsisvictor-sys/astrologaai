/**
 * Settings Index Page
 * Routes to various settings categories
 * 
 * Route: /settings (Bulgarian) or /en/settings (English)
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

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

// Design System Colors
const COLORS = {
  backgroundPrimary: '#0A0A0F',
  backgroundSecondary: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
  surface: '#252532',
  border: 'rgba(124, 58, 237, 0.3)',
};

// Settings Category Card
function SettingsCard({
  href,
  icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="block p-5 rounded-xl transition-all hover:-translate-y-1"
      style={{
        background: COLORS.backgroundSecondary,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: `${COLORS.primary}20` }}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg" style={{ color: COLORS.textPrimary }}>
              {title}
            </h3>
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              {description}
            </p>
          </div>
        </div>
        {badge && (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              background: `${COLORS.primary}30`,
              color: COLORS.primary,
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const { user } = useAuth();
  
  const settingsCategories = [
    {
      href: '/settings/subscription',
      icon: '💳',
      title: t('categories.subscription.title'),
      description: t('categories.subscription.description'),
      badge: user?.tier && user.tier !== 'FREE' ? user.tier : undefined,
    },
    {
      href: '/settings/profile',
      icon: '👤',
      title: t('categories.profile.title'),
      description: t('categories.profile.description'),
    },
    {
      href: '/settings/birth-data',
      icon: '🎂',
      title: t('categories.birthData.title'),
      description: t('categories.birthData.description'),
    },
    {
      href: '/settings/notifications',
      icon: '🔔',
      title: t('categories.notifications.title'),
      description: t('categories.notifications.description'),
    },
    {
      href: '/settings/language',
      icon: '🌐',
      title: t('categories.language.title'),
      description: t('categories.language.description'),
    },
    {
      href: '/settings/privacy',
      icon: '🔒',
      title: t('categories.privacy.title'),
      description: t('categories.privacy.description'),
    },
  ];
  
  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{
        background: COLORS.backgroundPrimary,
        backgroundImage: `radial-gradient(ellipse at top, #1A1A2E 0%, ${COLORS.backgroundPrimary} 50%, #000000 100%)`,
      }}
    >
      <div className="max-w-3xl mx-auto">
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
            {t('subtitle')}
          </p>
        </div>
        
        {/* User Info */}
        {user && (
          <div
            className="p-4 rounded-xl mb-6"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                style={{ background: COLORS.gradient }}
              >
                {user.fullName?.[0] || user.email?.[0] || '?'}
              </div>
              <div>
                <p className="font-medium" style={{ color: COLORS.textPrimary }}>
                  {user.fullName || user.email}
                </p>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Settings Categories */}
        <div className="space-y-4">
          {settingsCategories.map((category) => (
            <SettingsCard
              key={category.href}
              href={category.href}
              icon={category.icon}
              title={category.title}
              description={category.description}
              badge={category.badge}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
