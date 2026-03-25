'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { UpgradeModal } from './upgrade-modal';
import { EmailVerificationBanner } from './email-verification-banner';
import { CreditPurchaseModal } from '../credits/credit-purchase-modal';
import { CreditsUpsellBanner } from '../credits/credits-upsell-banner';
import { useAuth } from '@/lib/auth-context';
import { useCreditBalance } from '@/lib/use-credit-balance';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [lockedFeature, setLockedFeature] = useState('');
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const { user } = useAuth();
  const tier = (user?.tier || 'FREE') as 'FREE' | 'PRO' | 'PREMIUM';
  const { spentEurLast30Days } = useCreditBalance();

  return (
    <div className="flex min-h-screen bg-background-deep">
      <Sidebar
        onLockedFeatureClick={setLockedFeature}
        onOpenCredits={() => setCreditModalOpen(true)}
      />

      <main className="flex-1 md:ml-[260px] min-h-screen pb-20 md:pb-0">
        <EmailVerificationBanner />
        <CreditsUpsellBanner
          spentEurLast30Days={spentEurLast30Days ?? 0}
          userTier={tier}
        />
        {children}
      </main>

      <BottomNav onLockedClick={setLockedFeature} />

      <UpgradeModal
        isOpen={!!lockedFeature}
        feature={lockedFeature}
        onClose={() => setLockedFeature('')}
      />

      <CreditPurchaseModal
        isOpen={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
      />
    </div>
  );
}
