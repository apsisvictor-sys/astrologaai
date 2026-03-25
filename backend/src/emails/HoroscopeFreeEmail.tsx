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

interface HoroscopeFreeEmailProps {
  firstName?: string;
  sunSign?: string;
  date: string;               // e.g. "Wednesday, 26 March 2026"
  generalTheme: string;       // full — shown in its entirety
  loveTeaser: string;         // first sentence only, rest is locked
  careerTeaser: string;       // first sentence only, rest is locked
  upgradeUrl: string;
  unsubscribeUrl: string;
}

export function HoroscopeFreeEmail({
  firstName,
  sunSign,
  date,
  generalTheme,
  loveTeaser,
  careerTeaser,
  upgradeUrl,
  unsubscribeUrl,
}: HoroscopeFreeEmailProps) {
  const name = firstName || 'there';
  const sunGlyph = sunSign ? (ZODIAC_GLYPHS[sunSign] ?? '✦') : '✦';

  const signMeta = sunSign ? `${sunGlyph} ${sunSign}  ·  ${date}` : date;

  return (
    <BaseEmailLayout
      preview={`✦ What do the stars say today, ${name}?`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section>
        {/* Sign + date meta */}
        <Text style={{ color: '#888888', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 8px' }}>
          {signMeta}
        </Text>

        {/* Headline */}
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 32px' }}>
          ✦ What do the stars say today?
        </Text>

        {/* General Theme — full */}
        <Text style={sectionLabel}>General Theme</Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.65', margin: 0 }}>
          {generalTheme}
        </Text>

        <EmailDivider />

        {/* Love — teaser + locked */}
        <Text style={sectionLabel}>Love</Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.65', margin: '0 0 12px' }}>
          {loveTeaser}
        </Text>
        <LockedSection upgradeUrl={upgradeUrl} />

        <EmailDivider />

        {/* Career — teaser + locked */}
        <Text style={sectionLabel}>Career</Text>
        <Text style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.65', margin: '0 0 12px' }}>
          {careerTeaser}
        </Text>
        <LockedSection upgradeUrl={upgradeUrl} />

        <EmailDivider />

        {/* Lucky Numbers + Power Hours locked */}
        <Text style={sectionLabel}>Lucky Numbers &amp; Power Hours</Text>
        <LockedSection upgradeUrl={upgradeUrl} compact />

        <EmailDivider />

        {/* Upgrade CTA */}
        <Text style={{ color: '#888888', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Hey {name} — upgrade to PRO to unlock your full daily reading, weekly forecast, and transit insights.
        </Text>
        <EmailButton href={upgradeUrl}>Unlock Your Full Horoscope ✦</EmailButton>
        <Text style={{ color: '#555555', fontSize: '13px', margin: '16px 0 0' }}>
          Your stars have more to say. <Link href={upgradeUrl} style={{ color: '#888888', textDecoration: 'underline' }}>See PRO plans →</Link>
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}

/** Inline locked-content placeholder — simulates blurred/redacted text in email clients */
function LockedSection({ upgradeUrl, compact = false }: { upgradeUrl: string; compact?: boolean }) {
  return (
    <Section style={{ backgroundColor: '#110018', padding: '14px 16px', borderRadius: '6px' }}>
      {!compact && (
        <>
          <Text style={{ color: '#2d0042', fontSize: '14px', letterSpacing: '3px', margin: '0 0 4px', fontFamily: 'monospace' }}>
            ████████████ ██████ ████████████████
          </Text>
          <Text style={{ color: '#2d0042', fontSize: '14px', letterSpacing: '3px', margin: '0 0 10px', fontFamily: 'monospace' }}>
            ████████ ███████████ █████
          </Text>
        </>
      )}
      {compact && (
        <Text style={{ color: '#2d0042', fontSize: '14px', letterSpacing: '3px', margin: '0 0 10px', fontFamily: 'monospace' }}>
          ████████ ██████ ██████████████
        </Text>
      )}
      <Text style={{ color: '#7700aa', fontSize: '13px', margin: 0 }}>
        🔒 PRO only —{' '}
        <Link href={upgradeUrl} style={{ color: '#e41aff', textDecoration: 'underline' }}>
          Unlock to read
        </Link>
      </Text>
    </Section>
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
