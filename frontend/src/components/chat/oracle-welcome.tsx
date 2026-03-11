'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BirthDataWidget } from '@/components/home/birth-data-widget';
import { getApiBaseUrl } from '@/lib/runtime-config';

interface OracleWelcomeProps {
  onBirthDataSaved: () => void;
}

export function OracleWelcome({ onBirthDataSaved }: OracleWelcomeProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async (data: { date: string; time: string; location: string; lat: number; lng: number }) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const res = await fetch(`${getApiBaseUrl()}/api/v1/birth-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user?.fullName || user?.email || 'My Chart',
          birthDate: data.date,
          birthTime: data.time || null,
          isUnknownTime: !data.time,
          locationName: data.location,
          latitude: data.lat,
          longitude: data.lng,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to save');
      }
      onBirthDataSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save birth data');
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Oracle glyph */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.18) 0%, transparent 70%)', filter: 'blur(24px)', transform: 'scale(2)' }}
        />
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.25)' }}
        >
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 10px rgba(228,26,255,0.7))' }}>✦</span>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-1.5">Welcome{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}.</h2>
      <p className="text-sm text-text-muted mb-8 max-w-[280px] text-center leading-relaxed">
        To begin your reading, I need to know when and where you were born.
      </p>

      <div className="w-full max-w-sm">
        <BirthDataWidget onComplete={handleComplete} />
        {saving && (
          <p className="text-xs text-text-muted text-center mt-3">Saving your birth data…</p>
        )}
        {error && (
          <p className="text-xs text-red-400 text-center mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}
