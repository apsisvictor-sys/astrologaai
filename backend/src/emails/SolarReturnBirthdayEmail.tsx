import React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';
import { EmailDivider } from './EmailDivider';

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

interface SolarReturnBirthdayEmailProps {
  firstName?: string;
  sunSign?: string;
  isPremium: boolean;         // PREMIUM → full reading; PRO/FREE → upgrade CTA
  solarReturnUrl: string;     // /solar-return (PREMIUM) or /pricing (PRO/FREE)
  unsubscribeUrl: string;
}

export function SolarReturnBirthdayEmail({
  firstName,
  sunSign,
  isPremium,
  solarReturnUrl,
  unsubscribeUrl,
}: SolarReturnBirthdayEmailProps) {
  const name = firstName || 'there';
  const sunGlyph = sunSign ? (ZODIAC_GLYPHS[sunSign] ?? '✦') : '✦';

  if (isPremium) {
    return (
      <BaseEmailLayout
        preview={`${sunGlyph} Happy Birthday! Your Solar Return chart is ready`}
        unsubscribeUrl={unsubscribeUrl}
      >
        <Section>
          {/* Sign meta */}
          {sunSign && (
            <Text style={{ color: '#888888', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 8px' }}>
              {sunGlyph} {sunSign}  ·  Solar Return {new Date().getFullYear() + 1}
            </Text>
          )}

          {/* Headline */}
          <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 8px' }}>
            {sunGlyph} Your Solar Return is Ready
          </Text>
          <Text style={{ color: '#888888', fontSize: '14px', margin: '0 0 32px' }}>
            Happy Birthday, {name} — the Sun returns to its birth position, marking the start of your personal new year.
          </Text>

          <EmailDivider />

          {/* What is Solar Return */}
          <Text style={sectionLabel}>Your Year Ahead</Text>
          <Text style={bodyText}>
            Your Solar Return chart captures the exact moment the Sun crosses the degree it occupied at your birth.
            It reveals the themes, opportunities, and challenges that will define the next 12 months of your life.
          </Text>

          <EmailDivider />

          {/* What's inside */}
          <Text style={sectionLabel}>What's in your reading</Text>
          {[
            '✦ Solar Return ascendant & house emphasis',
            '✦ Key planetary themes for the year',
            '✦ Annual forecast narrative',
            '✦ Overlay with your natal chart',
          ].map((item, i) => (
            <Text key={i} style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.65', margin: i === 0 ? 0 : '6px 0 0' }}>
              {item}
            </Text>
          ))}

          <EmailDivider />

          {/* CTA */}
          <EmailButton href={solarReturnUrl}>View Your Solar Return ✦</EmailButton>
          <Text style={{ color: '#555555', fontSize: '13px', margin: '16px 0 0' }}>
            Your chart is waiting at{' '}
            <Link href={solarReturnUrl} style={{ color: '#888888', textDecoration: 'underline' }}>
              astrologa.bg/solar-return
            </Link>
          </Text>
        </Section>
      </BaseEmailLayout>
    );
  }

  // PRO / FREE — upgrade CTA with locked preview
  return (
    <BaseEmailLayout
      preview={`${sunGlyph} The stars have a message for your year ahead`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section>
        {/* Sign meta */}
        {sunSign && (
          <Text style={{ color: '#888888', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 8px' }}>
            {sunGlyph} {sunSign}  ·  Your Birthday
          </Text>
        )}

        {/* Headline */}
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 8px' }}>
          ✦ Your Year Ahead is Waiting
        </Text>
        <Text style={{ color: '#888888', fontSize: '14px', margin: '0 0 32px' }}>
          Happy Birthday, {name}! Your Solar Return chart is calculated — unlock it to see what this year holds.
        </Text>

        <EmailDivider />

        {/* Teaser — what's inside (locked) */}
        <Text style={sectionLabel}>Your Solar Return Reading</Text>
        <Text style={bodyText}>
          Every year on your birthday the Sun returns to its exact birth position, creating a unique chart that maps
          the 12 months ahead. This year's chart is ready — but it's a PREMIUM feature.
        </Text>

        <Section style={{ backgroundColor: '#110018', padding: '20px 16px', borderRadius: '6px', marginTop: '20px' }}>
          <Text style={{ color: '#2d0042', fontSize: '14px', letterSpacing: '3px', margin: '0 0 4px', fontFamily: 'monospace' }}>
            ████████████ ██████ ████████████████
          </Text>
          <Text style={{ color: '#2d0042', fontSize: '14px', letterSpacing: '3px', margin: '0 0 4px', fontFamily: 'monospace' }}>
            ████████ ███████████ █████ ████████
          </Text>
          <Text style={{ color: '#2d0042', fontSize: '14px', letterSpacing: '3px', margin: '0 0 12px', fontFamily: 'monospace' }}>
            █████████████ ██████████ ███
          </Text>
          <Text style={{ color: '#7700aa', fontSize: '13px', margin: 0 }}>
            🔒 PREMIUM only —{' '}
            <Link href={solarReturnUrl} style={{ color: '#e41aff', textDecoration: 'underline' }}>
              Unlock your year ahead
            </Link>
          </Text>
        </Section>

        <EmailDivider />

        {/* What they'd get */}
        <Text style={sectionLabel}>What's inside</Text>
        {[
          '✦ Solar Return ascendant & house emphasis',
          '✦ Key planetary themes for your year',
          '✦ Annual forecast narrative',
          '✦ Overlay with your natal chart',
        ].map((item, i) => (
          <Text key={i} style={{ color: '#555555', fontSize: '15px', lineHeight: '1.65', margin: i === 0 ? 0 : '6px 0 0' }}>
            {item}
          </Text>
        ))}

        <EmailDivider />

        {/* Upgrade CTA */}
        <Text style={{ color: '#888888', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Hey {name} — upgrade to PREMIUM to unlock your Solar Return reading plus the full astrology suite.
        </Text>
        <EmailButton href={solarReturnUrl}>Unlock Your Year Ahead ✦</EmailButton>
        <Text style={{ color: '#555555', fontSize: '13px', margin: '16px 0 0' }}>
          One chart. One year. All yours.{' '}
          <Link href={solarReturnUrl} style={{ color: '#888888', textDecoration: 'underline' }}>
            See PREMIUM plans →
          </Link>
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
