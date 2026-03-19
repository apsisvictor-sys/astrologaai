import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import { VerificationEmail } from '../VerificationEmail';
import { PasswordResetEmail } from '../PasswordResetEmail';
import { PasswordChangedEmail } from '../PasswordChangedEmail';

describe('Transactional email templates', () => {
  it('VerificationEmail renders with EN copy', async () => {
    const html = await render(VerificationEmail({ verifyUrl: 'https://astrologa.bg/en/verify-email?token=abc', language: 'en' }));
    expect(html).toContain('Welcome to AstroLogAI');
    expect(html).toContain('https://astrologa.bg/en/verify-email?token=abc');
    expect(html).toContain('✦ AstroLogAI'); // logo in base layout
  });

  it('VerificationEmail renders with BG copy', async () => {
    const html = await render(VerificationEmail({ verifyUrl: 'https://astrologa.bg/verify-email?token=abc', language: 'bg' }));
    expect(html).toContain('AstroLogAI');
    expect(html).toContain('verify-email');
  });

  it('PasswordResetEmail renders with EN copy', async () => {
    const html = await render(PasswordResetEmail({ resetUrl: 'https://astrologa.bg/en/reset-password?token=xyz', language: 'en' }));
    expect(html).toContain('Password Reset');
    expect(html).toContain('reset-password');
  });

  it('PasswordChangedEmail renders', async () => {
    const html = await render(PasswordChangedEmail({ language: 'en' }));
    expect(html).toContain('Password Changed');
  });
});
