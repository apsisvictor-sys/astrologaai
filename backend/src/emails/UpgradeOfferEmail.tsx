import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';
import { EmailDivider } from './EmailDivider';

interface UpgradeOfferEmailProps {
  firstName?: string;
  sunSign?: string;
  moonSign?: string;
  promoCode?: string;
  pricingUrl: string;
  unsubscribeUrl: string;
}

export function UpgradeOfferEmail({ firstName, sunSign, moonSign, promoCode, pricingUrl, unsubscribeUrl }: UpgradeOfferEmailProps) {
  const name = firstName || 'there';
  const signs = [sunSign, moonSign].filter(Boolean).join(' and ');
  const signsText = signs ? `your ${signs} energy` : 'your cosmic energy';
  const promoUrl = promoCode ? `${pricingUrl}?promo=${promoCode}` : pricingUrl;
  return (
    <BaseEmailLayout preview="A month of cosmic exploration — a gift for you" unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          A month of cosmic exploration ✦
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Hey {name} — it's been a month since you started exploring {signsText} through AstroLogAI. You've uncovered a lot. Imagine what's possible with unlimited access.
        </Text>
        {promoCode && (
          <>
            <EmailDivider />
            <Text style={{ color: '#e41aff', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>
              A gift for you
            </Text>
            <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
              Use code: {promoCode}
            </Text>
            <Text style={{ color: '#888888', fontSize: '14px', margin: '0 0 28px' }}>
              Applied automatically when you click below.
            </Text>
            <EmailDivider />
          </>
        )}
        <EmailButton href={promoUrl}>
          Upgrade to PRO ✦{promoCode ? ` — use ${promoCode}` : ''}
        </EmailButton>
        <Text style={{ color: '#555555', fontSize: '13px', margin: '20px 0 0' }}>
          PRO is €9.99/month. Cancel anytime.
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}
