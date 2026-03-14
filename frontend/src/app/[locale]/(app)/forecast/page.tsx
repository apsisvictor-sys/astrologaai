'use client';

import { ForecastPanel } from '@/components/transits/forecast-panel';
import { DailyHoroscopeCard } from '@/components/forecast/daily-horoscope-card';
import { useAuth } from '@/lib/auth-context';

export default function ForecastPage() {
  const { user } = useAuth();
  const tier = (user?.tier as 'FREE' | 'PRO' | 'PREMIUM') || 'FREE';

  return (
    <div className="space-y-8 px-4 sm:px-6 pt-6 pb-16 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white mb-1">Your Daily Reading</h1>
        <p className="text-text-muted text-sm">Personalized forecast based on your natal chart and today's transits</p>
      </div>
      <DailyHoroscopeCard tier={tier} />
      <ForecastPanel />
    </div>
  );
}
