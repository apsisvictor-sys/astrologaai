import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AstroLogAI — Your Cosmic Blueprint';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

export default async function Image({ params }: { params: { userId: string } }) {
  let sunSign = '?', moonSign = '?', risingSign = '?';
  let sunGlyph = '☉', moonGlyph = '☽', risingGlyph = '↑';

  try {
    const res = await fetch(`${API_URL}/api/v1/user/share-card/public/${params.userId}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      sunSign = json.data.sunSign ?? '?';
      moonSign = json.data.moonSign ?? '?';
      risingSign = json.data.risingSign ?? '?';
      sunGlyph = json.data.sunGlyph ?? '☉';
      moonGlyph = json.data.moonGlyph ?? '☽';
      risingGlyph = json.data.risingGlyph ?? '↑';
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #0D0010 0%, #1a0020 60%, #0D0010 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', padding: '60px',
        }}
      >
        {/* Logo */}
        <div style={{ position: 'absolute', top: 48, left: 60, color: '#e41aff', fontSize: 28, fontWeight: 700, display: 'flex' }}>
          ✦ AstroLogAI
        </div>
        {/* Big 3 */}
        <div style={{ display: 'flex', gap: '80px', alignItems: 'center', marginBottom: '48px' }}>
          {[
            { glyph: sunGlyph, label: 'Sun', sign: sunSign },
            { glyph: moonGlyph, label: 'Moon', sign: moonSign },
            { glyph: risingGlyph, label: 'Rising', sign: risingSign },
          ].map(({ glyph, label, sign }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: 72, color: '#ffffff' }}>{glyph}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#ffffff' }}>{sign}</div>
              <div style={{ fontSize: 15, color: '#888888', letterSpacing: '2px', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div style={{ color: '#888888', fontSize: 18, textAlign: 'center', display: 'flex' }}>
          Discover your cosmic blueprint at astrologa.bg
        </div>
        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#e41aff', display: 'flex' }} />
      </div>
    ),
    { ...size }
  );
}
