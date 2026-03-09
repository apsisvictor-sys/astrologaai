'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const COLORS = {
  backgroundPrimary: '#0D0010',
  backgroundSecondary: 'rgba(255,255,255,0.03)',
  primary: '#e41aff',
  secondary: '#ff0080',
  textPrimary: '#FAFAFA',
  textSecondary: 'rgba(255,255,255,0.55)',
  gradient: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(228,26,255,0.2)',
  success: '#10B981',
  error: '#EF4444',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface BirthProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string | null;
  locationName: string;
  isUnknownTime: boolean;
  birthChart?: { id: string } | null;
}

// Suspense boundary required for useSearchParams in Next.js 14
function SuccessBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get('success') !== 'true') return null;
  return (
    <div
      className="mb-6 p-4 rounded-xl"
      style={{ background: `${COLORS.success}20`, border: `1px solid ${COLORS.success}`, color: COLORS.success }}
    >
      ✓ Birth profile saved successfully!
    </div>
  );
}

export default function BirthDataSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/birth-data');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch birth profiles
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchProfiles = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('astrologaai_access_token');
        const response = await fetch(`${API_URL}/api/v1/birth-data`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch profiles');

        const data = await response.json();
        setProfiles(data.data?.profiles || []);
      } catch (err) {
        console.error('[BirthData] Fetch error:', err);
        setError('Could not load birth profiles.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [isAuthenticated]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.backgroundPrimary }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin" style={{ background: COLORS.gradient }} />
          <p style={{ color: COLORS.textSecondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: COLORS.backgroundPrimary }}>
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <Link href="/settings" className="flex items-center gap-2 mb-8" style={{ color: COLORS.textSecondary }}>
          &larr; Back to settings
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.textPrimary }}>
              My Birth Data
            </h1>
            <p style={{ color: COLORS.textSecondary }}>
              Manage your birth profiles for astrological charts
            </p>
          </div>
          <Link
            href="/birth-data/new"
            className="px-5 py-2.5 rounded-xl font-medium transition-all hover:opacity-90"
            style={{ background: COLORS.gradient, color: COLORS.textPrimary }}
          >
            + Add new
          </Link>
        </div>

        {/* Success message */}
        <Suspense fallback={null}>
          <SuccessBanner />
        </Suspense>

        {/* Error message */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: `${COLORS.error}20`, border: `1px solid ${COLORS.error}`, color: COLORS.error }}
          >
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full mx-auto mb-3 animate-spin" style={{ background: COLORS.gradient }} />
            <p style={{ color: COLORS.textSecondary }}>Loading profiles...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && profiles.length === 0 && !error && (
          <div
            className="p-8 rounded-xl text-center"
            style={{ background: COLORS.backgroundSecondary, border: `1px solid ${COLORS.border}` }}
          >
            <div className="text-4xl mb-4">🎂</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
              No birth profiles yet
            </h3>
            <p className="mb-6" style={{ color: COLORS.textSecondary }}>
              Add your first birth profile to generate an astrological chart.
            </p>
            <Link
              href="/birth-data/new"
              className="inline-block px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
              style={{ background: COLORS.gradient, color: COLORS.textPrimary }}
            >
              Add birth profile
            </Link>
          </div>
        )}

        {/* Profile list */}
        {!isLoading && profiles.length > 0 && (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="p-5 rounded-xl"
                style={{ background: COLORS.backgroundSecondary, border: `1px solid ${COLORS.border}` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg" style={{ color: COLORS.textPrimary }}>
                        {profile.name}
                      </h3>
                      {profile.birthChart && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${COLORS.primary}25`, color: COLORS.primary }}
                        >
                          &#10003; Chart ready
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                      {new Date(profile.birthDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {!profile.isUnknownTime && profile.birthTime ? ` at ${profile.birthTime}` : ' (time unknown)'}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: COLORS.textSecondary }}>
                      {profile.locationName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {profile.birthChart && (
                      <Link
                        href={`/birth-data/${profile.id}/chart`}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                        style={{ background: `${COLORS.primary}20`, color: COLORS.primary, border: `1px solid ${COLORS.primary}40` }}
                      >
                        View Chart
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
