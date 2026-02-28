/**
 * Subscription Management Page
 * US-23: Manage Billing/Subscription
 * 
 * Route: /settings/subscription (Bulgarian) or /en/settings/subscription (English)
 * 
 * Features:
 * - View current subscription status
 * - View billing history/invoices
 * - Update payment method (via Stripe portal)
 * - Cancel/reactivate subscription
 * 
 * Design Specifications from 06-ux-ui-design.md:
 * - Background: #0A0A0F
 * - Surface: #0A0A1F
 * - Primary: #7C3AED
 * - Secondary: #EC4899
 * - Text Primary: #FAFAFA
 * - Text Secondary: #CBD5E1
 * - Gradient: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';

// Design System Colors
const COLORS = {
  backgroundPrimary: '#0A0A0F',
  backgroundSecondary: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  textMuted: '#71717A',
  gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  surface: '#252532',
  border: 'rgba(124, 58, 237, 0.3)',
};

// Types
interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  description: string;
}

interface SubscriptionStatus {
  tier: string;
  status: string;
  usage: {
    queriesThisMonth: number;
    queriesLimit: number | 'unlimited';
    queriesRemaining: number | 'unlimited';
    percentage: number | null;
    resetDate: string;
  };
  limits: {
    monthly: number | 'unlimited';
    burst: number;
    canMakeQuery: boolean;
    limitReached: boolean;
    nearLimit: boolean;
  };
  billing?: {
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    scheduledDowngrade: string | null;
    stripeCustomerId: string | null;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('subscription.status');
  
  const getStatusStyles = () => {
    switch (status) {
      case 'ACTIVE':
        return { bg: `${COLORS.success}20`, color: COLORS.success };
      case 'CANCELED':
        return { bg: `${COLORS.error}20`, color: COLORS.error };
      case 'PAST_DUE':
        return { bg: `${COLORS.warning}20`, color: COLORS.warning };
      case 'TRIALING':
        return { bg: `${COLORS.primary}20`, color: COLORS.primary };
      default:
        return { bg: COLORS.surface, color: COLORS.textSecondary };
    }
  };
  
  const styles = getStatusStyles();
  
  return (
    <span
      className="px-3 py-1 rounded-full text-sm font-medium"
      style={{ background: styles.bg, color: styles.color }}
    >
      {t(status.toLowerCase())}
    </span>
  );
}

// Invoice Status Badge
function InvoiceStatusBadge({ status }: { status: string }) {
  const t = useTranslations('subscription.management');
  
  const getStatusStyles = () => {
    switch (status) {
      case 'paid':
        return { bg: `${COLORS.success}20`, color: COLORS.success, label: t('invoicePaid') };
      case 'open':
      case 'draft':
        return { bg: `${COLORS.warning}20`, color: COLORS.warning, label: t('invoicePending') };
      default:
        return { bg: `${COLORS.error}20`, color: COLORS.error, label: t('invoiceFailed') };
    }
  };
  
  const styles = getStatusStyles();
  
  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ background: styles.bg, color: styles.color }}
    >
      {styles.label}
    </span>
  );
}

export default function SubscriptionManagementPage() {
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<'cancel' | 'reactivate' | 'portal' | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/subscription');
    }
  }, [authLoading, isAuthenticated, router]);
  
  // Fetch data
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);
  
  const fetchData = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;
    
    try {
      // Fetch subscription status
      const statusResponse = await fetch(`${API_URL}/api/v1/subscription/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const statusData = await statusResponse.json();
      
      if (statusData.success) {
        setSubscription(statusData.data);
      }
      
      // Fetch invoices
      const invoicesResponse = await fetch(`${API_URL}/api/v1/subscription/invoices`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const invoicesData = await invoicesResponse.json();
      
      if (invoicesData.success) {
        setInvoices(invoicesData.data.invoices);
      }
    } catch (error) {
      console.error('[Subscription] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Open Stripe portal
  const handleOpenPortal = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;
    
    setActionLoading('portal');
    
    try {
      const response = await fetch(`${API_URL}/api/v1/subscription/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success && data.data.portalUrl) {
        window.location.href = data.data.portalUrl;
      } else {
        setNotification({ type: 'error', message: data.error?.message || 'Failed to open portal' });
      }
    } catch (error) {
      console.error('[Subscription] Portal error:', error);
      setNotification({ type: 'error', message: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  };
  
  // Cancel subscription
  const handleCancel = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;
    
    setActionLoading('cancel');
    
    try {
      const response = await fetch(`${API_URL}/api/v1/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotification({ type: 'success', message: t('management.cancelSuccess') });
        setShowCancelConfirm(false);
        fetchData(); // Refresh data
      } else {
        setNotification({ type: 'error', message: data.error?.message || 'Failed to cancel' });
      }
    } catch (error) {
      console.error('[Subscription] Cancel error:', error);
      setNotification({ type: 'error', message: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  };
  
  // Reactivate subscription
  const handleReactivate = async () => {
    const accessToken = localStorage.getItem('astrologaai_access_token');
    if (!accessToken) return;
    
    setActionLoading('reactivate');
    
    try {
      const response = await fetch(`${API_URL}/api/v1/subscription/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotification({ type: 'success', message: t('management.reactivateSuccess') });
        fetchData(); // Refresh data
      } else {
        setNotification({ type: 'error', message: data.error?.message || 'Failed to reactivate' });
      }
    } catch (error) {
      console.error('[Subscription] Reactivate error:', error);
      setNotification({ type: 'error', message: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'EUR') {
      return `€${amount.toFixed(2)}`;
    } else if (currency === 'BGN') {
      return `${amount.toFixed(2)} лв.`;
    }
    return `${amount.toFixed(2)} ${currency}`;
  };
  
  // Loading state
  if (authLoading || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.backgroundPrimary }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
            style={{ background: COLORS.gradient }}
          />
          <p style={{ color: COLORS.textSecondary }}>{t('management.loading')}</p>
        </div>
      </div>
    );
  }
  
  const tierName = subscription?.tier ? t(`tier.${subscription.tier.toLowerCase()}`) : 'Free';
  const isPaidTier = subscription?.tier && subscription.tier !== 'FREE';
  const isCanceled = subscription?.billing?.cancelAtPeriodEnd;
  
  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{
        background: COLORS.backgroundPrimary,
        backgroundImage: `radial-gradient(ellipse at top, #1A1A2E 0%, ${COLORS.backgroundPrimary} 50%, #000000 100%)`,
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          href="/settings"
          className="flex items-center gap-2 mb-8"
          style={{ color: COLORS.textSecondary }}
        >
          ← {t('management.backToSettings')}
        </Link>
        
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              color: COLORS.textPrimary,
              fontFamily: 'Playfair Display, serif',
            }}
          >
            {t('management.title')}
          </h1>
          <p style={{ color: COLORS.textSecondary }}>
            {t('management.subtitle')}
          </p>
        </div>
        
        {/* Notification */}
        {notification && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              background: notification.type === 'success' ? `${COLORS.success}20` : `${COLORS.error}20`,
              border: `1px solid ${notification.type === 'success' ? COLORS.success : COLORS.error}`,
              color: notification.type === 'success' ? COLORS.success : COLORS.error,
            }}
          >
            {notification.type === 'success' ? '✓' : '✗'} {notification.message}
          </div>
        )}
        
        {/* Current Plan Card */}
        <div
          className="p-6 rounded-xl mb-6"
          style={{
            background: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-medium mb-1" style={{ color: COLORS.textSecondary }}>
                {t('management.currentPlan')}
              </h2>
              <div className="flex items-center gap-3">
                <span
                  className="text-2xl font-bold"
                  style={{ color: COLORS.textPrimary }}
                >
                  {tierName}
                </span>
                <StatusBadge status={subscription?.status || 'ACTIVE'} />
              </div>
            </div>
            
            {/* Upgrade button for free users */}
            {subscription?.tier === 'FREE' && (
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-xl font-medium transition-all hover:opacity-90"
                style={{
                  background: COLORS.gradient,
                  color: '#FFFFFF',
                }}
              >
                {t('management.viewPlans')}
              </Link>
            )}
          </div>
          
          {/* Usage Stats */}
          <div
            className="p-4 rounded-xl mb-4"
            style={{ background: COLORS.surface }}
          >
            <h3 className="text-sm font-medium mb-3" style={{ color: COLORS.textSecondary }}>
              {t('management.usage')}
            </h3>
            
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: COLORS.textPrimary }}>
                {t('management.queriesThisMonth')}
              </span>
              <span style={{ color: COLORS.textSecondary }}>
                {subscription?.usage.queriesThisMonth} / {typeof subscription?.usage.queriesLimit === 'number' ? subscription.usage.queriesLimit : t('unlimited')}
              </span>
            </div>
            
            {/* Progress bar for limited tiers */}
            {typeof subscription?.usage.queriesLimit === 'number' && (
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: '#1A1A2E' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${subscription.usage.percentage || 0}%`,
                    background: subscription.limits.limitReached ? COLORS.error : COLORS.gradient,
                  }}
                />
              </div>
            )}
            
            {subscription?.usage.resetDate && (
              <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>
                {locale === 'bg' ? 'Нулиране на' : 'Resets on'} {formatDate(subscription.usage.resetDate)}
              </p>
            )}
          </div>
          
          {/* Billing Info for paid tiers */}
          {subscription?.billing && isPaidTier && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="p-4 rounded-xl"
                style={{ background: COLORS.surface }}
              >
                <h3 className="text-sm font-medium mb-1" style={{ color: COLORS.textSecondary }}>
                  {t('management.nextPaymentDate')}
                </h3>
                <p className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>
                  {formatDate(subscription.billing.currentPeriodEnd)}
                </p>
                {isCanceled && (
                  <p className="text-sm mt-1" style={{ color: COLORS.warning }}>
                    {locale === 'bg' ? 'Абонаментът ще бъде анулиран' : 'Subscription will be canceled'}
                  </p>
                )}
              </div>
              
              {subscription.billing.scheduledDowngrade && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: `${COLORS.warning}10`, border: `1px solid ${COLORS.warning}40` }}
                >
                  <h3 className="text-sm font-medium mb-1" style={{ color: COLORS.warning }}>
                    {locale === 'bg' ? 'Планирано намаляване' : 'Scheduled Downgrade'}
                  </h3>
                  <p style={{ color: COLORS.textPrimary }}>
                    {locale === 'bg' ? `Ще преминете към ${t(`tier.${subscription.billing.scheduledDowngrade.toLowerCase()}`)} в края на периода` : `Will change to ${t(`tier.${subscription.billing.scheduledDowngrade.toLowerCase()}`)} at period end`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions Card for paid tiers */}
        {isPaidTier && (
          <div
            className="p-6 rounded-xl mb-6"
            style={{
              background: COLORS.backgroundSecondary,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: COLORS.textPrimary }}>
              {t('management.managePayment')}
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {/* Stripe Portal Button */}
              <button
                onClick={handleOpenPortal}
                disabled={actionLoading === 'portal'}
                className="px-4 py-2 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: COLORS.gradient,
                  color: '#FFFFFF',
                }}
              >
                {actionLoading === 'portal' 
                  ? (locale === 'bg' ? 'Зареждане...' : 'Loading...')
                  : t('management.openPortal')}
              </button>
              
              {/* Reactivate / Cancel Button */}
              {isCanceled ? (
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading === 'reactivate'}
                  className="px-4 py-2 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: COLORS.success,
                    color: '#FFFFFF',
                  }}
                >
                  {actionLoading === 'reactivate'
                    ? (locale === 'bg' ? 'Възстановяване...' : 'Reactivating...')
                    : t('reactivateSubscription')}
                </button>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 rounded-xl font-medium transition-all hover:opacity-80"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${COLORS.error}`,
                    color: COLORS.error,
                  }}
                >
                  {t('cancelSubscription')}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          >
            <div
              className="max-w-md w-full p-6 rounded-xl"
              style={{
                background: COLORS.backgroundSecondary,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.textPrimary }}>
                {t('management.cancelWarning')}
              </h3>
              
              <p className="mb-4" style={{ color: COLORS.textSecondary }}>
                {t('management.cancelWarningDesc')}
              </p>
              
              <ul className="mb-6 space-y-2">
                <li className="flex items-center gap-2" style={{ color: COLORS.textSecondary }}>
                  <span style={{ color: COLORS.error }}>✗</span> {t('management.featureLoss.unlimitedQueries')}
                </li>
                <li className="flex items-center gap-2" style={{ color: COLORS.textSecondary }}>
                  <span style={{ color: COLORS.error }}>✗</span> {t('management.featureLoss.forecasts')}
                </li>
                <li className="flex items-center gap-2" style={{ color: COLORS.textSecondary }}>
                  <span style={{ color: COLORS.error }}>✗</span> {t('management.featureLoss.compatibility')}
                </li>
              </ul>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2 rounded-xl font-medium"
                  style={{
                    background: COLORS.surface,
                    color: COLORS.textPrimary,
                  }}
                >
                  {t('management.cancelBack')}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading === 'cancel'}
                  className="flex-1 py-2 rounded-xl font-medium"
                  style={{
                    background: COLORS.error,
                    color: '#FFFFFF',
                  }}
                >
                  {actionLoading === 'cancel'
                    ? (locale === 'bg' ? 'Анулиране...' : 'Canceling...')
                    : t('management.cancelConfirm')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Invoices Card */}
        <div
          className="p-6 rounded-xl"
          style={{
            background: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: COLORS.textPrimary }}>
            {t('management.invoices')}
          </h2>
          
          {invoices.length === 0 ? (
            <p style={{ color: COLORS.textSecondary }}>{t('management.noInvoices')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                      {t('management.invoiceNumber')}
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                      {t('management.invoiceDate')}
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                      {t('management.invoiceAmount')}
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                      {t('management.invoiceStatus')}
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                      PDF
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} style={{ borderBottom: `1px solid ${COLORS.border}40` }}>
                      <td className="py-3 px-2" style={{ color: COLORS.textPrimary }}>
                        {invoice.number || `#${invoice.id.slice(-8)}`}
                      </td>
                      <td className="py-3 px-2" style={{ color: COLORS.textSecondary }}>
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="py-3 px-2" style={{ color: COLORS.textPrimary }}>
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </td>
                      <td className="py-3 px-2">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="py-3 px-2 text-right">
                        {invoice.invoicePdf ? (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                            style={{ color: COLORS.primary }}
                          >
                            {t('management.downloadPdf')}
                          </a>
                        ) : (
                          <span style={{ color: COLORS.textMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Upgrade CTA for Free users */}
        {subscription?.tier === 'FREE' && (
          <div
            className="mt-6 p-6 rounded-xl text-center"
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.secondary}20 100%)`,
              border: `1px solid ${COLORS.primary}40`,
            }}
          >
            <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.textPrimary }}>
              {t('management.upgradeTitle')}
            </h3>
            <p className="mb-4" style={{ color: COLORS.textSecondary }}>
              {t('management.upgradeDesc')}
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
              style={{
                background: COLORS.gradient,
                color: '#FFFFFF',
              }}
            >
              {t('management.viewPlans')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
