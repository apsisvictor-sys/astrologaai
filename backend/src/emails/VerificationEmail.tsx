import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';

interface VerificationEmailProps {
  verifyUrl: string;
  language: string;
}

export function VerificationEmail({ verifyUrl, language }: VerificationEmailProps) {
  const isBg = language === 'bg';
  return (
    <BaseEmailLayout preview={isBg ? 'Потвърди имейл адреса си ✦' : 'Confirm your email address ✦'}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          {isBg ? 'Добре дошли в AstroLogAI ✦' : 'Welcome to AstroLogAI ✦'}
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px' }}>
          {isBg
            ? 'Потвърди имейл адреса си, за да отключиш пълния достъп до своя хороскоп и космически прозрения.'
            : 'Confirm your email address to unlock full access to your horoscope and cosmic insights.'}
        </Text>
        <EmailButton href={verifyUrl}>
          {isBg ? 'Потвърди имейл адреса ✦' : 'Verify my email ✦'}
        </EmailButton>
        <Text style={{ color: '#555555', fontSize: '13px', margin: '28px 0 0' }}>
          {isBg
            ? 'Тази връзка изтича след 24 часа. Ако не си създавал акаунт, игнорирай този имейл.'
            : 'This link expires in 24 hours. If you didn\'t create an account, you can safely ignore this email.'}
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}
