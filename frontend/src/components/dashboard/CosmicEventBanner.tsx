'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

interface AstrologicalEvent {
  id: string;
  type: 'retrograde' | 'eclipse';
  planet?: string;
  glyph?: string;
  subtype?: 'solar' | 'lunar';
  sign: string;
  message: { en: string; bg: string };
  oraclePrompt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface CosmicEventBannerProps {
  locale?: string;
}

export function CosmicEventBanner({ locale = 'en' }: CosmicEventBannerProps) {
  const router = useRouter();
  const [events, setEvents] = useState<AstrologicalEvent[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed state from localStorage
    const stored = Object.keys(localStorage)
      .filter(k => k.startsWith('dismissed_event_'))
      .map(k => k.replace('dismissed_event_', ''));
    setDismissed(new Set(stored));

    // Fetch active events
    fetch(`${API_URL}/api/v1/transits/current-events`)
      .then(r => r.json())
      .then(json => { if (json.success) setEvents(json.data); })
      .catch(() => {});
  }, []);

  function dismiss(eventId: string) {
    localStorage.setItem('dismissed_event_' + eventId, '1');
    setDismissed(prev => new Set([...prev, eventId]));
  }

  function openOracle(prompt: string) {
    const encoded = encodeURIComponent(prompt);
    // Use next-intl router to avoid full page reload and respect locale routing
    router.push(`/chat?prompt=${encoded}`);
  }

  const visible = events.filter(e => !dismissed.has(e.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
      {visible.map(event => {
        const isEclipse = event.type === 'eclipse';
        const message = locale === 'bg' ? event.message.bg : event.message.en;
        return (
          <div
            key={event.id}
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: `1px solid ${isEclipse ? '#4a2a00' : '#3a2a00'}`,
              background: isEclipse ? 'rgba(40,20,0,0.6)' : 'rgba(30,22,0,0.6)',
              display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            }}
          >
            <p style={{ color: '#ddaa44', fontSize: '14px', flex: 1, margin: 0, lineHeight: '1.4' }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => openOracle(event.oraclePrompt)}
                style={{
                  padding: '7px 14px', background: '#e41aff', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ask the Oracle →
              </button>
              <button
                onClick={() => dismiss(event.id)}
                style={{
                  padding: '7px 10px', background: 'transparent', color: '#555555',
                  border: '1px solid #333333', borderRadius: '6px', fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
