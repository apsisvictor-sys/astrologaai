/**
 * FEAT-08: Analytics — PostHog event wrapper
 * All product events go through here so call sites are typed and consistent.
 */

import posthog from 'posthog-js';

// Only fire in browser and when PostHog is loaded
function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.capture(event, props);
}

// ── Acquisition ──────────────────────────────────────────────────────────────

export function trackUserRegistered(props: { method: 'email' | 'google' | 'apple'; language: string }) {
  capture('user_registered', props);
}

export function trackUserSignedUp(props: { method: 'magic_link' }) {
  capture('user_signed_up', props);
}

export function trackEmailVerified() {
  capture('email_verified');
}

export function trackOnboardingCompleted() {
  capture('onboarding_completed');
}

export function trackBirthDataCompleted(props: { birth_time_known: boolean }) {
  capture('birth_data_completed', props);
}

// ── Engagement ───────────────────────────────────────────────────────────────

export function trackChartViewed(props: { isUnknownTime: boolean }) {
  capture('chart_viewed', props);
}

export function trackOracleQuerySent(props: { tier: string; sessionId: string }) {
  capture('oracle_query_sent', props);
}

export function trackOracleQuery(props: { query_index: number; is_free: boolean }) {
  capture('oracle_query', props);
}

export function trackForecastViewed(props: { tier: string }) {
  capture('forecast_viewed', props);
}

export function trackPartnerAdded(props: { tier: string }) {
  capture('partner_added', props);
}

// ── Monetisation ─────────────────────────────────────────────────────────────

export function trackUpgradeModalShown(props: { feature: string }) {
  capture('upgrade_modal_shown', props);
}

export function trackUpgradeCtaClicked(props: { targetTier: string; feature: string }) {
  capture('upgrade_cta_clicked', props);
}

export function trackSubscriptionStarted(props: { tier: string }) {
  capture('subscription_started', props);
}

export function trackSubscriptionUpgraded(props: { plan: string; amount: number; currency: string }) {
  capture('subscription_upgraded', props);
}

export function trackSubscriptionCancelled(props: { tier: string }) {
  capture('subscription_cancelled', props);
}

// ── Credits ───────────────────────────────────────────────────────────────────

export function trackCreditsPurchased(props: { packId: string; credits: number; eurAmount: number }) {
  capture('credits_purchased', props);
}

export function trackCreditsSpent(props: { action: string; cost: number; balanceAfter?: number }) {
  capture('credits_spent', props);
}

export function trackCreditsUpsellShown(props: { spentEurLast30Days: number }) {
  capture('credits_upsell_shown', props);
}

export function trackCreditsUpsellConverted(props: { spentEurLast30Days: number }) {
  capture('credits_upsell_converted', props);
}

// ── Retention ────────────────────────────────────────────────────────────────

export function trackQueryLimitHit(props: { tier: string }) {
  capture('query_limit_hit', props);
}

// ── Identity ─────────────────────────────────────────────────────────────────

export function identifyUser(userId: string, props: { email: string; tier: string; language: string }) {
  if (typeof window === 'undefined') return;
  posthog.identify(userId, props);
}

export function resetIdentity() {
  if (typeof window === 'undefined') return;
  posthog.reset();
}
