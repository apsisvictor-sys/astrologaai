'use client';

import React from 'react';
import Link from 'next/link';
import { formatDate, formatTime as fmtTime } from '@/lib/format';

// Design system colors
const colors = {
  background: '#050510',
  surface: '#0A0A1F',
  primary: '#8B5CF6',
  secondary: '#EC4899',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  border: '#252532',
  error: '#EF4444',
  success: '#10B981',
};

interface BirthProfile {
  id: string;
  name: string;
  birthDate: Date | string;
  birthTime: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isUnknownTime: boolean;
  createdAt: Date | string;
  birthChart?: {
    id: string;
    createdAt: Date | string;
  } | null;
}

interface BirthProfileCardProps {
  profile: BirthProfile;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export default function BirthProfileCard({ profile, onDelete, isDeleting }: BirthProfileCardProps) {
  const formatDateLong = (date: Date | string) => formatDate(date, 'long');
  const formatTimeDisplay = (time: string | null, isUnknown: boolean) => {
    if (isUnknown || !time) return 'Unknown';
    return fmtTime(time);
  };

  return (
    <div
      className="rounded-2xl p-6 transition-all hover:scale-[1.02]"
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
            {profile.name}
          </h3>
          {profile.birthChart && (
            <span
              className="inline-block px-2 py-1 text-xs rounded-full mt-1"
              style={{
                background: `${colors.success}20`,
                color: colors.success,
              }}
            >
              Chart Calculated
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/birth-data/${profile.id}/chart`}
            className="p-2 rounded-lg transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}30 100%)`,
              color: colors.primary,
            }}
            title="View Chart"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </Link>
          <Link
            href={`/birth-data/${profile.id}`}
            className="p-2 rounded-lg transition-all"
            style={{
              background: `${colors.primary}20`,
              color: colors.primary,
            }}
            title="Edit Profile"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(profile.id)}
              disabled={isDeleting}
              className="p-2 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: `${colors.error}20`,
                color: colors.error,
              }}
              title="Delete Profile"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span style={{ color: colors.textSecondary }}>{formatDateLong(profile.birthDate)}</span>
        </div>

        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ color: colors.textSecondary }}>
            {formatTimeDisplay(profile.birthTime, profile.isUnknownTime)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span style={{ color: colors.textSecondary }}>{profile.locationName}</span>
        </div>
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.textSecondary }}>Timezone</span>
          <span style={{ color: colors.textPrimary }}>{profile.timezone}</span>
        </div>
      </div>
    </div>
  );
}

export type { BirthProfile };
