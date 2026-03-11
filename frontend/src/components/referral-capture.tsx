'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function ReferralCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referral_slug', ref);
    }
  }, [searchParams]);
  return null;
}
