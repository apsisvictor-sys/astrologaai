import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';
import { EmailDivider } from './EmailDivider';

interface SoftUpgradeEmailProps {
  firstName?: string;
  sunSign?: string;
  pricingUrl: string;
  chatUrl: string;
  unsubscribeUrl: string;
}

export function SoftUpgradeEmail({ firstName, sunSign, pricingUrl, chatUrl, unsubscribeUrl }: SoftUpgradeEmailProps) {
  const name = firstName || 'there';
  const signText = sunSign ? `${sunSign}` : "your sign's";
  return (
    <BaseEmailLayout preview={`You're exploring ${signText} energy deeply`} unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          You're exploring {signText} energy deeply ✦
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Hey {name} — you've been on a real cosmic journey over the past two weeks. PRO users unlock unlimited Oracle sessions, the full weekly forecast, and partner synastry charts.
        </Text>
        <EmailDivider />
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px' }}>
          ✦ Unlimited Oracle sessions — no daily cap
        </Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px' }}>
          ✦ Full daily + weekly forecast
        </Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.5', margin: '0 0 32px' }}>
          ✦ Partner synastry charts
        </Text>
        <EmailButton href={pricingUrl}>See PRO plans ✦</EmailButton>
        <Text style={{ color: '#555555', fontSize: '13px', margin: '20px 0 0' }}>
          Or <a href={chatUrl} style={{ color: '#888888' }}>keep exploring</a> your free daily reading.
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}
