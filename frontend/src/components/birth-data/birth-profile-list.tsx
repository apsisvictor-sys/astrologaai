'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BirthProfileCard, { BirthProfile } from './birth-profile-card';
import { useAuth } from '@/lib/auth-context';

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

export default function BirthProfileList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [maxAllowed, setMaxAllowed] = useState(10);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success message from creation
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      // Remove the query param
      router.replace('/birth-data');
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchProfiles = useCallback(async () => {
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/birth-data`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }

      const data = await response.json();
      setProfiles(data.data.profiles || []);
      setMaxAllowed(data.data.maxAllowed || 10);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfiles();
    }
  }, [isAuthenticated, fetchProfiles]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this birth profile? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/birth-data/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      // Remove from local state
      setProfiles(profiles.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete profile');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
          <p className="mt-4" style={{ color: colors.textSecondary }}>Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: colors.background }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
              Birth Profiles
            </h1>
            <p className="mt-1" style={{ color: colors.textSecondary }}>
              {profiles.length} of {maxAllowed} profiles created
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link
              href="/forecast"
              className="px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
            >
              <span>🌟</span>
              Daily Forecast
            </Link>
            {profiles.length < maxAllowed && (
              <Link
                href="/birth-data/new"
                className="px-6 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  color: 'white',
                }}
              >
                + New Profile
              </Link>
            )}
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: `${colors.success}15`, borderLeft: `3px solid ${colors.success}` }}
          >
            <p style={{ color: colors.success }}>✓ Birth profile created successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: `${colors.error}15`, borderLeft: `3px solid ${colors.error}` }}
          >
            <p style={{ color: colors.error }}>{error}</p>
          </div>
        )}

        {/* Profiles Grid */}
        {profiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profiles.map((profile) => (
              <BirthProfileCard
                key={profile.id}
                profile={profile}
                onDelete={handleDelete}
                isDeleting={deletingId === profile.id}
              />
            ))}
          </div>
        ) : (
          <div
            className="text-center py-16 rounded-2xl"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                style={{ color: colors.border }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textPrimary }}>
              No Birth Profiles Yet
            </h3>
            <p className="mb-6" style={{ color: colors.textSecondary }}>
              Create your first birth profile to get personalized astrological insights
            </p>
            <Link
              href="/birth-data/new"
              className="inline-block px-8 py-3 rounded-xl font-medium transition-all"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                color: 'white',
              }}
            >
              Create First Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
