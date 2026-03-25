/**
 * Credits API — FEAT-10: Credits system + one-time purchases
 * PIX-128: Design integration point for the frontend.
 *
 * NOTE: Backend routes are not yet implemented. This file defines the
 * client-side API surface and types. Wire up each function once the
 * corresponding backend routes are ready:
 *   GET  /api/v1/credits/balance
 *   GET  /api/v1/credits/transactions
 *   POST /api/v1/credits/checkout  (initiates Stripe Checkout, returns redirect URL)
 */

import { apiGet, apiPost } from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditBalance {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  /** Total EUR spent in the last 30 days (for upsell threshold check) */
  spentEurLast30Days: number;
}

export interface CreditTransaction {
  id: string;
  type: 'purchase' | 'spend' | 'refund' | 'bonus';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface CreditCheckoutResponse {
  checkoutUrl: string;
}

// ─── Credit Pack Definitions (matches PIX-94 RFC) ─────────────────────────────

export type CreditPackId = 'starter' | 'popular' | 'best_value';

export interface CreditPack {
  id: CreditPackId;
  label: string;
  credits: number;
  priceEur: number;
  priceBgn: number; // BGN = priceEur * 1.96
  pricePerCredit: number;
  savingsPercent: number | null;
  isPopular: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    label: 'Starter',
    credits: 3,
    priceEur: 2.99,
    priceBgn: 5.85,
    pricePerCredit: 1.0,
    savingsPercent: null,
    isPopular: false,
  },
  {
    id: 'popular',
    label: 'Popular',
    credits: 10,
    priceEur: 7.99,
    priceBgn: 15.64,
    pricePerCredit: 0.8,
    savingsPercent: 20,
    isPopular: true,
  },
  {
    id: 'best_value',
    label: 'Best Value',
    credits: 25,
    priceEur: 14.99,
    priceBgn: 29.34,
    pricePerCredit: 0.6,
    savingsPercent: 40,
    isPopular: false,
  },
];

/** Credit costs per action (matches PIX-94 RFC) */
export const CREDIT_COSTS = {
  oracle_sonnet: 2,
  oracle_opus: 4,
  solar_return: 1,
  lunar_return: 1,
  synastry: 3,
  natal_pdf: 1,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Upsell threshold: show "switch to PRO" banner when user has spent ≥ this amount */
export const CREDITS_UPSELL_EUR_THRESHOLD = 15;

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function fetchCreditBalance(): Promise<CreditBalance> {
  const res = await apiGet<CreditBalance>('/api/v1/credits/balance');
  return res.data;
}

export async function fetchCreditTransactions(): Promise<CreditTransaction[]> {
  const res = await apiGet<CreditTransaction[]>('/api/v1/credits/transactions');
  return res.data;
}

export async function initiateCreditCheckout(
  packId: CreditPackId,
  currency: 'EUR' | 'BGN' = 'EUR'
): Promise<CreditCheckoutResponse> {
  const res = await apiPost<CreditCheckoutResponse>('/api/v1/credits/checkout', { packId, currency });
  return res.data;
}
