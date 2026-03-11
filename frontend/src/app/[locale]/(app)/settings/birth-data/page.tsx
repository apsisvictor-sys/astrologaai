'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';
import { apiGet, apiRequest } from '@/lib/api-client';

const COLORS = {
  backgroundPrimary: '#0D0010',
  backgroundSecondary: 'rgba(255,255,255,0.03)',
  primary: '#e41aff',
  textPrimary: '#FAFAFA',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.3)',
  gradient: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(228,26,255,0.2)',
  borderInput: 'rgba(255,255,255,0.10)',
  success: '#10B981',
  error: '#EF4444',
};

interface BirthProfile {
  id: string;
  birthDate: string;
  birthTime: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  isUnknownTime: boolean;
  birthChart?: { id: string } | null;
}

interface LocationResult {
  city: string;
  country: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export default function BirthDataSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Form state
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [location, setLocation] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [locationSearching, setLocationSearching] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/birth-data');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load existing birth data
  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const result = await apiGet<{ profiles?: BirthProfile[] }>('/api/v1/birth-data');
        const existing = result.data?.profiles?.[0] || null;
        setProfile(existing);
        if (!existing) setEditing(true); // No data yet — go straight to form
      } catch {
        setProfile(null);
        setEditing(true);
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  // Pre-fill form when entering edit mode
  useEffect(() => {
    if (editing && profile) {
      setBirthDate(profile.birthDate ? profile.birthDate.split('T')[0] : '');
      setBirthTime(profile.birthTime || '');
      setUnknownTime(profile.isUnknownTime);
      setLocation(profile.locationName);
      setSelectedLocation({
        city: profile.locationName,
        country: '',
        displayName: profile.locationName,
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
    } else if (editing && !profile) {
      setBirthDate(''); setBirthTime(''); setUnknownTime(false);
      setLocation(''); setSelectedLocation(null);
    }
  }, [editing, profile]);

  // Location autocomplete
  useEffect(() => {
    if (location.length < 2 || selectedLocation) {
      setLocationResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setLocationSearching(true);
      try {
        const result = await apiGet<{ locations?: LocationResult[] }>(
          `/api/v1/locations/search?q=${encodeURIComponent(location)}`,
          { skipAuth: true }
        );
        setLocationResults(result.data?.locations || []);
      } catch { /* ignore */ }
      finally { setLocationSearching(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [location, selectedLocation]);

  const canSave = birthDate && (unknownTime || birthTime) && selectedLocation;

  const handleSave = async () => {
    if (!canSave || !selectedLocation) return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const payload = {
        name: user?.fullName || user?.email || 'My Chart',
        birthDate,
        birthTime: unknownTime ? null : birthTime || null,
        isUnknownTime: unknownTime,
        locationName: selectedLocation.city
          ? `${selectedLocation.city}${selectedLocation.country ? ', ' + selectedLocation.country : ''}`
          : selectedLocation.displayName,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      };

      const endpoint = profile ? `/api/v1/birth-data/${profile.id}` : '/api/v1/birth-data';
      const method = profile ? 'PUT' : 'POST';
      const result = await apiRequest<{ profile?: BirthProfile; birthProfile?: BirthProfile }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setProfile(result.data?.profile || result.data?.birthProfile || null);
      setSaveStatus('success');
      setEditing(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  // Loading / auth guard
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.backgroundPrimary }}>
        <div className="w-10 h-10 rounded-full animate-spin" style={{ background: COLORS.gradient }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: COLORS.backgroundPrimary }}>
      <div className="max-w-xl mx-auto">

        {/* Back */}
        <Link href="/settings" className="flex items-center gap-2 mb-8 text-sm" style={{ color: COLORS.textSecondary }}>
          ← Back to settings
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: COLORS.textPrimary }}>My Birth Data</h1>
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              {profile ? 'Your cosmic coordinates' : 'Add your birth details to generate your chart'}
            </p>
          </div>
          {profile && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
            >
              Edit
            </button>
          )}
        </div>

        {/* Success banner */}
        {saveStatus === 'success' && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: `${COLORS.success}20`, border: `1px solid ${COLORS.success}`, color: COLORS.success }}>
            ✓ Birth data saved successfully
          </div>
        )}

        {/* VIEW MODE — existing data */}
        {profile && !editing && (
          <div className="p-5 rounded-2xl space-y-3" style={{ background: COLORS.backgroundSecondary, border: `1px solid ${COLORS.border}` }}>
            <div className="flex flex-col gap-3">
              <Row label="Date of birth" value={formatDate(profile.birthDate, 'long')} />
              <Row label="Time of birth" value={profile.isUnknownTime ? 'Unknown' : profile.birthTime || 'Not set'} />
              <Row label="Birth city" value={profile.locationName} />
            </div>
            {profile.birthChart && (
              <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <Link
                  href={`/birth-data/${profile.id}/chart`}
                  className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80"
                  style={{ color: COLORS.primary }}
                >
                  ✦ View my natal chart →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* FORM MODE — add or edit */}
        {editing && (
          <div className="p-5 rounded-2xl space-y-4" style={{ background: COLORS.backgroundSecondary, border: `1px solid ${COLORS.border}` }}>

            {/* Date */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: COLORS.textMuted }}>Date of birth</label>
              <input
                type="date"
                value={birthDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.borderInput}`, color: COLORS.textPrimary }}
              />
            </div>

            {/* Time */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs" style={{ color: COLORS.textMuted }}>Time of birth</label>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: COLORS.textMuted }}>
                  <input
                    type="checkbox"
                    checked={unknownTime}
                    onChange={(e) => { setUnknownTime(e.target.checked); if (e.target.checked) setBirthTime(''); }}
                    className="accent-primary"
                  />
                  Unknown
                </label>
              </div>
              <input
                type="time"
                value={birthTime}
                disabled={unknownTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.borderInput}`, color: COLORS.textPrimary }}
              />
            </div>

            {/* Location */}
            <div className="relative">
              <label className="block text-xs mb-1.5" style={{ color: COLORS.textMuted }}>Birth city</label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  placeholder="e.g. Sofia, Bulgaria"
                  onChange={(e) => { setLocation(e.target.value); setSelectedLocation(null); }}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.borderInput}`, color: COLORS.textPrimary }}
                />
                {locationSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.primary, borderTopColor: 'transparent' }} />
                )}
              </div>
              {locationResults.length > 0 && !selectedLocation && (
                <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden" style={{ background: '#1a0b1c', border: `1px solid ${COLORS.border}` }}>
                  {locationResults.slice(0, 5).map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{ color: COLORS.textPrimary }}
                      onClick={() => { setLocation(r.city ? `${r.city}${r.country ? ', ' + r.country : ''}` : r.displayName); setSelectedLocation(r); setLocationResults([]); }}
                    >
                      <div>{r.city || r.displayName}</div>
                      {r.country && <div className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{r.displayName}</div>}
                    </button>
                  ))}
                </div>
              )}
              {selectedLocation && (
                <p className="mt-1 text-xs" style={{ color: COLORS.success }}>✓ Location confirmed</p>
              )}
            </div>

            {/* Error */}
            {saveStatus === 'error' && (
              <p className="text-sm" style={{ color: COLORS.error }}>{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              {profile && (
                <button
                  onClick={() => { setEditing(false); setSaveStatus('idle'); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!canSave || saveStatus === 'saving'}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: COLORS.gradient, color: COLORS.textPrimary }}
              >
                {saveStatus === 'saving' ? 'Saving...' : profile ? 'Save changes' : 'Save birth data'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: '#FAFAFA' }}>{value}</span>
    </div>
  );
}
