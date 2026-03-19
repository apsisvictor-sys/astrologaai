import React from 'react';
import { Button } from '@react-email/components';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        display: 'inline-block',
        padding: '14px 28px',
        backgroundColor: '#e41aff',
        color: '#ffffff',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '15px',
        fontFamily: 'Inter, Arial, sans-serif',
        letterSpacing: '-0.2px',
      }}
    >
      {children}
    </Button>
  );
}
