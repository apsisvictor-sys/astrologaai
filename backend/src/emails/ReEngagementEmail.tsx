import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';

interface ReEngagementEmailProps {
  firstName?: string;
  sunSign?: string;
  chatUrl: string;
  unsubscribeUrl: string;
}

export function ReEngagementEmail({ firstName, sunSign, chatUrl, unsubscribeUrl }: ReEngagementEmailProps) {
  const name = firstName || 'there';
  const transit = sunSign ? `transits moving through ${sunSign} energy right now` : 'significant transits active in your chart right now';
  return (
    <BaseEmailLayout preview="Your chart has something new to show you" unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          Your chart has something new to show you
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Hey {name} — the planets don't stand still, and neither does your chart. There are {transit}. The Oracle can walk you through exactly what they mean for you.
        </Text>
        <Text style={{ color: '#e41aff', fontSize: '17px', fontStyle: 'italic', margin: '0 0 32px', lineHeight: '1.5' }}>
          "What transits are active in my chart this week, and how should I work with them?"
        </Text>
        <EmailButton href={chatUrl}>Ask the Oracle ✦</EmailButton>
      </Section>
    </BaseEmailLayout>
  );
}
