import React from 'react';
import { Section, Text, Row, Column } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';
import { EmailDivider } from './EmailDivider';

// Moon phase emoji map
const MOON_PHASE_ICONS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
};

const ENERGY_COLORS: Record<string, string> = {
  high: '#e41aff',
  medium: '#aa88cc',
  low: '#777799',
};

const ENERGY_LABELS: Record<string, { en: string; bg: string }> = {
  high: { en: 'High Energy', bg: 'Висока Енергия' },
  medium: { en: 'Moderate Energy', bg: 'Умерена Енергия' },
  low: { en: 'Low Energy', bg: 'Ниска Енергия' },
};

export interface TransitHighlight {
  planet: string;
  sign: string;
  influence: 'positive' | 'challenging' | 'neutral';
  description: string;
}

export interface MorningBriefingEmailProps {
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  language: 'bg' | 'en';
  firstName?: string;
  date: string;                      // e.g. "Wednesday, 26 March 2026"
  moonPhase: string;                 // e.g. "Waxing Gibbous"
  moonPhaseBg?: string;
  moonSign?: string;
  moonSignBg?: string;
  moonIllumination?: number;
  energy: 'high' | 'medium' | 'low';
  // PRO/PREMIUM only
  transits?: TransitHighlight[];
  tip?: string;
  tipBg?: string;
  // PREMIUM only
  oracleInsight?: string;
  // URLs
  forecastUrl: string;
  upgradeUrl: string;
  unsubscribeUrl: string;
}

export function MorningBriefingEmail({
  tier,
  language,
  firstName,
  date,
  moonPhase,
  moonPhaseBg,
  moonSign,
  moonSignBg,
  moonIllumination,
  energy,
  transits,
  tip,
  tipBg,
  oracleInsight,
  forecastUrl,
  upgradeUrl,
  unsubscribeUrl,
}: MorningBriefingEmailProps) {
  const isBg = language === 'bg';
  const name = firstName || (isBg ? 'там' : 'there');
  const moonIcon = MOON_PHASE_ICONS[moonPhase] ?? '🌙';
  const energyColor = ENERGY_COLORS[energy] ?? '#aa88cc';
  const energyLabel = isBg
    ? (ENERGY_LABELS[energy]?.bg ?? energy)
    : (ENERGY_LABELS[energy]?.en ?? energy);

  const phaseName = isBg ? (moonPhaseBg || moonPhase) : moonPhase;
  const signName = isBg ? (moonSignBg || moonSign) : moonSign;

  const moonMeta = [
    phaseName,
    signName && `в ${signName}`,
    moonIllumination != null && `${moonIllumination}%`,
  ].filter(Boolean).join(' · ');

  return (
    <BaseEmailLayout
      preview={isBg ? `${moonIcon} Твоят сутрешен брифинг за ${date}` : `${moonIcon} Your morning briefing for ${date}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section>
        {/* Date meta */}
        <Text style={{ color: '#888888', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 8px' }}>
          {date}
        </Text>

        {/* Headline */}
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 8px' }}>
          {moonIcon} {isBg ? 'Добро утро, ' : 'Good morning, '}{name}
        </Text>
        <Text style={{ color: '#aa88cc', fontSize: '14px', margin: '0 0 32px' }}>
          {isBg ? 'Твоят сутрешен астрологичен брифинг' : 'Your morning astrological briefing'}
        </Text>

        {/* Moon Phase Card */}
        <Section style={{ backgroundColor: '#1a0025', borderRadius: '8px', padding: '16px 20px', marginBottom: '16px' }}>
          <Row>
            <Column style={{ width: '48px' }}>
              <Text style={{ fontSize: '32px', margin: 0, lineHeight: '48px' }}>{moonIcon}</Text>
            </Column>
            <Column>
              <Text style={{ color: '#e41aff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 2px' }}>
                {isBg ? 'Лунна Фаза' : 'Moon Phase'}
              </Text>
              <Text style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                {moonMeta}
              </Text>
            </Column>
          </Row>
        </Section>

        {/* Energy Rating */}
        <Section style={{ backgroundColor: '#1a0025', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
          <Text style={{ color: '#888888', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>
            {isBg ? 'Дневна Енергия' : 'Daily Energy'}
          </Text>
          <Text style={{ color: energyColor, fontSize: '20px', fontWeight: 700, margin: 0 }}>
            ◉ {energyLabel}
          </Text>
        </Section>

        {tier === 'FREE' ? (
          <>
            {/* FREE: teaser + upgrade CTA */}
            <Text style={{ color: '#ccbbdd', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}>
              {isBg
                ? 'Звездите имат послание за теб днес. Надгради до PRO, за да видиш своите транзити, препоръки и личен хороскоп.'
                : 'The stars have a message for you today. Upgrade to PRO to see your transits, recommendations, and full personal horoscope.'}
            </Text>
            <EmailButton href={upgradeUrl}>
              {isBg ? 'Виж Пълния Брифинг → PRO' : 'See Full Briefing → PRO'}
            </EmailButton>
          </>
        ) : (
          <>
            {/* PRO / PREMIUM: full content */}

            {/* Transits */}
            {transits && transits.length > 0 && (
              <>
                <EmailDivider />
                <Text style={{ color: '#e41aff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>
                  {isBg ? 'Ключови Транзити' : 'Key Transits'}
                </Text>
                {transits.slice(0, 3).map((t, i) => (
                  <Section
                    key={i}
                    style={{ marginBottom: '8px', paddingLeft: '12px', borderLeft: `3px solid ${t.influence === 'positive' ? '#44cc88' : t.influence === 'challenging' ? '#cc4466' : '#888888'}` }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>
                      {t.planet} {isBg ? 'в' : 'in'} {t.sign}
                    </Text>
                    <Text style={{ color: '#aaaaaa', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                      {t.description}
                    </Text>
                  </Section>
                ))}
              </>
            )}

            {/* Tip */}
            {(tip || tipBg) && (
              <>
                <EmailDivider />
                <Text style={{ color: '#e41aff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>
                  {isBg ? 'Препоръка за Деня' : "Today's Tip"}
                </Text>
                <Text style={{ color: '#ccbbdd', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px', fontStyle: 'italic' }}>
                  "{isBg ? (tipBg || tip) : tip}"
                </Text>
              </>
            )}

            {/* PREMIUM: Oracle Insight */}
            {tier === 'PREMIUM' && oracleInsight && (
              <>
                <EmailDivider />
                <Section style={{ backgroundColor: '#220033', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', borderLeft: '3px solid #e41aff' }}>
                  <Text style={{ color: '#e41aff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>
                    ✦ {isBg ? 'Послание от Оракула' : 'Oracle Insight'}
                  </Text>
                  <Text style={{ color: '#ffffff', fontSize: '15px', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                    "{oracleInsight}"
                  </Text>
                </Section>
              </>
            )}

            {/* CTA */}
            <EmailButton href={forecastUrl}>
              {isBg ? 'Виж Пълното Четене →' : 'See Full Reading →'}
            </EmailButton>
          </>
        )}
      </Section>
    </BaseEmailLayout>
  );
}
