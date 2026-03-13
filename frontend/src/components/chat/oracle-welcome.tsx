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

  const handleComplete = async (data: {
    date: string;
    time: string;
    location: string;
    lat: number;
    lng: number;
  }) => {
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

  const firstName = user?.fullName?.split(' ')[0] ?? null;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-6 py-10 gap-7">

      {/* Oracle glyph — pulsing ring */}
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
        {/* ambient glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(228,26,255,0.18) 0%, transparent 70%)',
            filter: 'blur(18px)',
            transform: 'scale(2.2)',
          }}
        />
        {/* pulsing ring */}
        <div
          className="absolute inset-0 rounded-full motion-safe:animate-ping pointer-events-none"
          style={{ border: '1px solid rgba(228,26,255,0.28)' }}
        />
        {/* inner circle */}
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(228,26,255,0.08)',
            border: '1px solid rgba(228,26,255,0.30)',
          }}
        >
          <span
            className="text-2xl"
            style={{ filter: 'drop-shadow(0 0 12px rgba(228,26,255,0.8))' }}
          >
            ✦
          </span>
        </div>
      </div>

      {/* Oracle voice header */}
      <div className="text-center max-w-xs">
        <h2 className="text-base font-semibold text-white mb-1.5">
          {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
        </h2>
        <p className="text-sm font-medium mb-4" style={{ color: 'rgba(228,26,255,0.85)' }}>
          I am The Oracle — your personal astrologer.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
          The positions of every star and planet at the exact moment of your birth
          form a pattern that has never existed before and never will again.
        </p>
      </div>

      {/* Value propositions */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {[
          { icon: '✦', text: 'Your unique natal chart — mapped to the minute' },
          { icon: '◈', text: 'Daily cosmic guidance tailored to your chart' },
          { icon: '◉', text: 'Real-time planetary transits in your sky' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <span className="text-xs shrink-0 mt-0.5" style={{ color: 'rgba(228,26,255,0.55)' }}>
              {icon}
            </span>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      {/* Birth data form */}
      <div className="w-full max-w-sm">
        <BirthDataWidget onComplete={handleComplete} />
        {saving && (
          <p className="text-xs text-text-muted text-center mt-3">
            Calculating your chart…
          </p>
        )}
        {error && (
          <p className="text-xs text-red-400 text-center mt-3">{error}</p>
        )}
      </div>

    </div>
  );
}
