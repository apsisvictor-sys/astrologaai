'use client';

/**
 * useCreditBalance
 * PIX-128 — Fetches and caches the user's credit balance.
 *
 * Returns balance + spentEurLast30Days for the upsell threshold check.
 * Re-fetches every 60 seconds so the sidebar stays reasonably fresh.
 */

import { useEffect, useState, useCallback } from 'react';
import { fetchCreditBalance, type CreditBalance } from './credits-api';
import { useAuth } from './auth-context';

const REFETCH_INTERVAL_MS = 60_000;

export function useCreditBalance() {
  const { user } = useAuth();
  const [data, setData] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await fetchCreditBalance();
      setData(result);
    } catch {
      // Non-critical — swallow silently
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFETCH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return {
    balance: data?.balance ?? null,
    spentEurLast30Days: data?.spentEurLast30Days ?? null,
    loading,
    reload: load,
  };
}
