'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { BestDaysCalendar } from '@/components/best-days/calendar-grid';

export default function BestDaysPage() {
  const { user } = useAuth();
  const tier = (user?.tier as 'FREE' | 'PRO' | 'PREMIUM') || 'FREE';
  const [hasBirthData, setHasBirthData] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`${getApiBaseUrl()}/api/v1/birth-data`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('astrologaai_access_token')}`,
      },
    })
      .then(r => r.json())
      .then(data => setHasBirthData((data.data?.profiles?.length || 0) > 0))
      .catch(() => setHasBirthData(true)); // fail open
  }, [user]);

  return (
    <div className="space-y-5 px-4 sm:px-6 pt-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white mb-1">Best Days</h1>
        <p className="text-text-muted text-sm">
          Your personal astrological calendar — plan ahead with cosmic insight
        </p>
      </div>
      {hasBirthData !== null && (
        <BestDaysCalendar tier={tier} hasBirthData={hasBirthData} />
      )}
    </div>
  );
}
