import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';
import { EmailDivider } from './EmailDivider';

interface WelcomeEmailProps {
  firstName?: string;
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
  chatUrl: string;
  unsubscribeUrl: string;
}

export function WelcomeEmail({ firstName, sunSign, moonSign, risingSign, chatUrl, unsubscribeUrl }: WelcomeEmailProps) {
  const name = firstName || 'Cosmic Traveller';
  const hasSigns = sunSign && moonSign;
  return (
    <BaseEmailLayout preview="Your cosmic blueprint is ready ✦" unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          Your cosmic blueprint is ready ✦
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Welcome, {name}. The stars were aligned in a very specific way the moment you arrived in this world — and your chart captures that moment forever.
        </Text>
        {hasSigns && (
          <>
            <EmailDivider />
            <Text style={{ color: '#e41aff', fontSize: '13px', fontWeight: 700, margin: '0 0 12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Your Big 3
            </Text>
            <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
              ☉ Sun — {sunSign}
            </Text>
            <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
              ☽ Moon — {moonSign}
            </Text>
            {risingSign && (
              <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                ↑ Rising — {risingSign}
              </Text>
            )}
            <EmailDivider />
          </>
        )}
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px' }}>
          The Oracle is ready to answer your first question. Ask anything — your chart, your relationships, what the stars say about your path ahead.
        </Text>
        <EmailButton href={chatUrl}>Begin your Oracle session ✦</EmailButton>
      </Section>
    </BaseEmailLayout>
  );
}
