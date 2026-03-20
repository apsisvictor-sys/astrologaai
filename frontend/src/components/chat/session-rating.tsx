'use client';

import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/runtime-config';

interface SessionRatingProps {
  sessionId: string;
  onRated: () => void;
}

export function SessionRating({ sessionId, onRated }: SessionRatingProps) {
  const [hovered, setHovered] = useState(0);
  const [rated, setRated] = useState(false);
  const [visible, setVisible] = useState(true);

  // Auto-hide after 8 seconds if not rated
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!rated) setVisible(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [rated]);

  const handleRate = async (stars: number) => {
    const token = localStorage.getItem('astrologaai_access_token');
    try {
      await fetch(`${getApiBaseUrl()}/api/v1/chat/sessions/${sessionId}/rate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars }),
      });
    } catch {
      // fire-and-forget
    }
    setRated(true);
    setTimeout(() => { setVisible(false); onRated(); }, 1500);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 mt-2 px-1">
      {rated ? (
        <span className="text-xs font-medium" style={{ color: '#e41aff' }}>✦ Noted</span>
      ) : (
        <>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Rate this session</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => handleRate(star)}
                className="text-base leading-none transition-transform hover:scale-110"
                style={{ color: star <= (hovered || 0) ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
