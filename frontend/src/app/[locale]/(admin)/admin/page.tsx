'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.startsWith('/bg') ? 'bg' : 'en';

  useEffect(() => {
    router.replace(`/${locale}/admin/overview`);
  }, [locale, router]);

  return null;
}
