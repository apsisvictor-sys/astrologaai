import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';
import { EmailDivider } from './EmailDivider';

interface FeatureDiscoveryEmailProps {
  firstName?: string;
  forecastUrl: string;
  partnersUrl: string;
  chartUrl: string;
  chatUrl: string;
  unsubscribeUrl: string;
}

export function FeatureDiscoveryEmail({ firstName, forecastUrl, partnersUrl, chartUrl, chatUrl, unsubscribeUrl }: FeatureDiscoveryEmailProps) {
  const name = firstName || 'there';
  return (
    <BaseEmailLayout preview="Did you know the Oracle can..." unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          Did you know the Oracle can...
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 28px' }}>
          Hey {name}, most people only use AstroLogAI for chat — but there's a lot more waiting for you.
        </Text>
        <EmailDivider />
        <Text style={{ color: '#e41aff', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Daily &amp; Weekly Forecast
        </Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.5', margin: '0 0 20px' }}>
          Get personalised daily horoscopes and weekly forecasts calculated directly from your natal chart — not generic sun sign content.
        </Text>
        <EmailDivider />
        <Text style={{ color: '#e41aff', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Partner Synastry
        </Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.5', margin: '0 0 20px' }}>
          Add a partner's birth data and see exactly how your charts interact. The Oracle can explain every aspect.
        </Text>
        <EmailDivider />
        <Text style={{ color: '#e41aff', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Chart Explorer
        </Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.5', margin: '0 0 32px' }}>
          Dive deep into your natal chart — planets, houses, aspects, elements. Everything annotated and explained.
        </Text>
        <EmailButton href={chatUrl}>Explore the Oracle ✦</EmailButton>
      </Section>
    </BaseEmailLayout>
  );
}
