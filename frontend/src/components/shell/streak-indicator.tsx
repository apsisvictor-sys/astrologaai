'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api-client';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
}

export function StreakIndicator() {
  const { user, isAuthenticated } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    apiGet<StreakData>('/api/v1/user/streak')
      .then(res => {
        if (res.data) {
          const prev = streak?.currentStreak ?? 0;
          setStreak(res.data);
          // If streak just hit a milestone (7, 14, 30...) show toast-style banner briefly
          const isMilestone = [7, 14, 21, 30, 60, 100].includes(res.data.currentStreak);
          if (isMilestone && res.data.currentStreak > prev) {
            setMilestone(res.data.currentStreak);
            setTimeout(() => setMilestone(null), 6000);
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!streak || streak.currentStreak < 1) return null;

  return (
    <>
      {/* Milestone toast */}
      {milestone && (
        <div
          className="mb-2 mx-1 px-3 py-2 rounded-xl text-xs text-center animate-pulse"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#F59E0B',
          }}
        >
          ✦ {milestone}-day streak earned you 48h of Pro access!
        </div>
      )}

      {/* Streak badge */}
      <div
        className="mx-1 mb-2 px-3 py-1.5 rounded-xl flex items-center gap-2"
        style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
        }}
      >
        <span style={{ color: '#F59E0B', fontSize: 12 }}>✦</span>
        <span className="text-xs" style={{ color: 'rgba(245,158,11,0.8)' }}>
          {streak.currentStreak}-day streak
        </span>
      </div>
    </>
  );
}
