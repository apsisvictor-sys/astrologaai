import React from 'react';
import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from './BaseEmailLayout';
import { EmailButton } from './EmailButton';

interface PasswordResetEmailProps {
  resetUrl: string;
  language: string;
}

export function PasswordResetEmail({ resetUrl, language }: PasswordResetEmailProps) {
  const isBg = language === 'bg';
  return (
    <BaseEmailLayout preview={isBg ? 'Нулиране на паролата' : 'Reset your password'}>
      <Section>
        <Text style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          {isBg ? 'Нулиране на парола' : 'Password Reset'}
        </Text>
        <Text style={{ color: '#888888', fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px' }}>
          {isBg
            ? 'Получихме заявка за нулиране на вашата парола. Кликнете бутона по-долу, за да създадете нова:'
            : 'We received a request to reset your password. Click the button below to create a new one:'}
        </Text>
        <EmailButton href={resetUrl}>
          {isBg ? 'Нулиране на паролата ✦' : 'Reset Password ✦'}
        </EmailButton>
        <Text style={{ color: '#555555', fontSize: '13px', margin: '28px 0 0' }}>
          {isBg
            ? 'Тази връзка изтича след 24 часа. Ако не сте поискали нулиране, игнорирайте този имейл.'
            : 'This link expires in 24 hours. If you didn\'t request a password reset, you can ignore this email.'}
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}
