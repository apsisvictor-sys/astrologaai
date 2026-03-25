import React from 'react';
import { Section, Text, Row, Column } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';
import { EmailDivider } from './EmailDivider';

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

interface HoroscopeProEmailProps {
  firstName?: string;
  sunSign?: string;
  moonSign?: string;
  date: string;               // e.g. "Wednesday, 26 March 2026"
  generalTheme: string;       // 2–3 sentences
  love: string;               // full paragraph
  career: string;             // full paragraph
  luckyNumbers: number[];     // e.g. [3, 7, 22]
  powerHours: string[];       // e.g. ["10:00 – 12:00", "18:00 – 20:00"]
  forecastUrl: string;
  unsubscribeUrl: string;
}

export function HoroscopeProEmail({
  firstName,
  sunSign,
  moonSign,
  date,
  generalTheme,
  love,
  career,
  luckyNumbers,
  powerHours,
  forecastUrl,
  unsubscribeUrl,
}: HoroscopeProEmailProps) {
  const name = firstName || 'there';
  const sunGlyph = sunSign ? (ZODIAC_GLYPHS[sunSign] ?? '✦') : '✦';
  const moonGlyph = moonSign ? (ZODIAC_GLYPHS[moonSign] ?? '') : '';

  const signMeta = [
    sunSign && `${sunGlyph} ${sunSign}`,
    moonSign && `☽ ${moonGlyph} ${moonSign}`,
  ].filter(Boolean).join('  ·  ');

  return (
    <BaseEmailLayout
      preview={`${sunGlyph} Your horoscope for ${date}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section>
        {/* Sign + date meta */}
        <Text style={{ color: '#888888', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 8px' }}>
          {signMeta ? `${signMeta}  ·  ${date}` : date}
        </Text>

        {/* Headline */}
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 32px' }}>
          {sunGlyph} Your horoscope for today
        </Text>

        {/* General Theme */}
        <Text style={sectionLabel}>General Theme</Text>
        <Text style={bodyText}>{generalTheme}</Text>

        <EmailDivider />

        {/* Love */}
        <Text style={sectionLabel}>Love</Text>
        <Text style={bodyText}>{love}</Text>

        <EmailDivider />

        {/* Career */}
        <Text style={sectionLabel}>Career</Text>
        <Text style={bodyText}>{career}</Text>

        <EmailDivider />

        {/* Lucky Numbers + Power Hours — two columns */}
        <Row>
          <Column style={{ width: '50%', verticalAlign: 'top', paddingRight: '16px' }}>
            <Text style={sectionLabel}>Lucky Numbers</Text>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, letterSpacing: '3px', margin: 0 }}>
              {luckyNumbers.join(' · ')}
            </Text>
          </Column>
          <Column style={{ width: '50%', verticalAlign: 'top', paddingLeft: '16px', borderLeft: '1px solid #2a0035' }}>
            <Text style={sectionLabel}>Power Hours</Text>
            {powerHours.map((h, i) => (
              <Text key={i} style={{ color: '#ffffff', fontSize: '15px', lineHeight: '1.5', margin: i === 0 ? 0 : '4px 0 0' }}>
                {h}
              </Text>
            ))}
          </Column>
        </Row>

        <EmailDivider />

        {/* CTA */}
        <EmailButton href={forecastUrl}>See Full Forecast ✦</EmailButton>
        <Text style={{ color: '#555555', fontSize: '13px', margin: '16px 0 0' }}>
          Hey {name} — your full weekly forecast and transit calendar are waiting.
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}

const sectionLabel: React.CSSProperties = {
  color: '#e41aff',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 8px',
};

const bodyText: React.CSSProperties = {
  color: '#cccccc',
  fontSize: '15px',
  lineHeight: '1.65',
  margin: 0,
};
