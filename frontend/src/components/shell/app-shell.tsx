'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { UpgradeModal } from './upgrade-modal';
import { EmailVerificationBanner } from './email-verification-banner';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [lockedFeature, setLockedFeature] = useState('');

  return (
    <div className="flex min-h-screen bg-background-deep">
      <Sidebar onLockedFeatureClick={setLockedFeature} />

      <main className="flex-1 md:ml-[260px] min-h-screen pb-20 md:pb-0">
        <EmailVerificationBanner />
        {children}
      </main>

      <BottomNav onLockedClick={setLockedFeature} />

      <UpgradeModal
        isOpen={!!lockedFeature}
        feature={lockedFeature}
        onClose={() => setLockedFeature('')}
      />
    </div>
  );
}
