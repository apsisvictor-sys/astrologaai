'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

export default function NewBirthDataPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/settings/birth-data'); }, [router]);
  return null;
}
