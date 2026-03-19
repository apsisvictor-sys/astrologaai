import React from 'react';
import {
  Html, Head, Body, Container, Section, Text, Link, Hr, Font,
} from '@react-email/components';

interface BaseEmailLayoutProps {
  children: React.ReactNode;
  unsubscribeUrl?: string;
  preview?: string;
}

export function BaseEmailLayout({ children, unsubscribeUrl, preview }: BaseEmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{ url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{ url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2', format: 'woff2' }}
          fontWeight={700}
          fontStyle="normal"
        />
        {preview && (
          <meta name="x-apple-disable-message-reformatting" />
        )}
      </Head>
      <Body style={{ backgroundColor: '#0D0010', margin: 0, padding: 0, fontFamily: 'Inter, Arial, sans-serif' }}>
        {/* Preview text — shown in inbox before opening */}
        {preview && (
          <Text style={{ display: 'none', maxHeight: 0, overflow: 'hidden', color: '#0D0010', fontSize: '1px' }}>
            {preview}
          </Text>
        )}
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
          {/* Logo */}
          <Section style={{ marginBottom: '32px' }}>
            <Text style={{ color: '#e41aff', fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              ✦ AstroLogAI
            </Text>
          </Section>

          {/* Content */}
          {children}

          {/* Footer */}
          <Hr style={{ borderColor: '#2a0035', margin: '40px 0 24px' }} />
          <Section>
            {unsubscribeUrl && (
              <Text style={{ color: '#555555', fontSize: '12px', margin: '0 0 8px' }}>
                <Link href={unsubscribeUrl} style={{ color: '#888888', textDecoration: 'underline' }}>
                  Unsubscribe
                </Link>
                {' '}from email notifications.
              </Text>
            )}
            <Text style={{ color: '#444444', fontSize: '12px', margin: 0 }}>
              © 2026 AstroLogAI. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
