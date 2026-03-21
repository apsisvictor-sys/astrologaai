'use client';

import { useState } from 'react';

interface ShareCardModalProps {
  userId: string;
  onClose: () => void;
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://astrologa.bg';

export function ShareCardModal({ userId, onClose }: ShareCardModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${FRONTEND_URL}/share/card/${userId}`;
  const ogImageUrl = `${FRONTEND_URL}/share/card/${userId}/opengraph-image`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#0D0010', border: '1px solid #2a0035', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#e41aff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Share your chart ✦</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        {/* Card preview */}
        <img
          src={ogImageUrl}
          alt="Your Big 3 card"
          style={{ width: '100%', borderRadius: '8px', border: '1px solid #2a0035', marginBottom: '20px' }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={ogImageUrl}
            download="astrologai-big3.png"
            style={{
              flex: 1, padding: '12px', background: '#1a0025', border: '1px solid #2a0035',
              color: '#ffffff', textDecoration: 'none', borderRadius: '8px',
              textAlign: 'center', fontSize: '14px', fontWeight: 600,
            }}
          >
            Download PNG
          </a>
          <button
            onClick={copyLink}
            style={{
              flex: 1, padding: '12px', background: copied ? '#1a3a1a' : '#e41aff',
              border: 'none', color: '#ffffff', borderRadius: '8px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {copied ? 'Copied ✦' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
