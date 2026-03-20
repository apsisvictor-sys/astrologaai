'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useAuth } from '@/lib/auth-context';
import { identifyUser } from '@/lib/analytics';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = 'https://eu.i.posthog.com'; // EU data residency

export function PostHogProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Init PostHog once
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // We fire manually on route change below
      capture_pageleave: true,
      persistence: 'localStorage',
    });
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [pathname, searchParams]);

  // Identify user when logged in
  useEffect(() => {
    if (!POSTHOG_KEY || !user) return;
    identifyUser(user.id, { email: user.email, tier: user.tier, language: user.language });
  }, [user]);

  return null;
}
