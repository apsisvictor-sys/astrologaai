import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';

interface PasswordChangedEmailProps {
  language: string;
}

export function PasswordChangedEmail({ language }: PasswordChangedEmailProps) {
  const isBg = language === 'bg';
  return (
    <BaseEmailLayout preview={isBg ? 'Паролата е сменена успешно' : 'Your password has been changed'}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          {isBg ? 'Паролата е сменена ✦' : 'Password Changed ✦'}
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }}>
          {isBg
            ? 'Вашата парола беше успешно сменена. Ако не сте го направили вие, свържете се с нас незабавно.'
            : 'Your password has been successfully changed. If you did not do this, contact us immediately.'}
        </Text>
        <Text style={{ color: '#555555', fontSize: '13px' }}>
          {isBg ? '© 2026 AstroLogAI' : 'If this was you, no action is needed.'}
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}
