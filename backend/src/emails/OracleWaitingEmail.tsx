import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';

interface OracleWaitingEmailProps {
  firstName?: string;
  sunSign?: string;
  chatUrl: string;
  unsubscribeUrl: string;
}

export function OracleWaitingEmail({ firstName, sunSign, chatUrl, unsubscribeUrl }: OracleWaitingEmailProps) {
  const name = firstName || 'there';
  const sampleQuestion = sunSign
    ? `"What energy is ${sunSign} season bringing into my life right now?"`
    : '"What does my chart say about my path ahead?"';
  return (
    <BaseEmailLayout preview="The Oracle is waiting for you" unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          The Oracle is waiting for you
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Hey {name} — your chart is ready but the Oracle hasn't heard from you yet. Not sure what to ask? Try this:
        </Text>
        <Text style={{ color: '#e41aff', fontSize: '17px', fontStyle: 'italic', margin: '0 0 32px', lineHeight: '1.5' }}>
          {sampleQuestion}
        </Text>
        <EmailButton href={chatUrl}>Ask the Oracle ✦</EmailButton>
      </Section>
    </BaseEmailLayout>
  );
}
