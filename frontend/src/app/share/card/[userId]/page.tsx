import { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://astrologa.bg';

interface ShareCardData {
  sunSign: string | null;
  moonSign: string | null;
  risingSign: string | null;
  sunGlyph: string;
  moonGlyph: string;
  risingGlyph: string | null;
}

async function getShareCard(userId: string): Promise<ShareCardData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/user/share-card/public/${userId}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { userId: string } }): Promise<Metadata> {
  const data = await getShareCard(params.userId);
  const title = data?.sunSign
    ? `${data.sunSign} Sun · ${data.moonSign} Moon — AstroLogAI`
    : 'My Cosmic Blueprint — AstroLogAI';
  return {
    title,
    description: 'Discover your Sun, Moon, and Rising signs. Get a free cosmic reading at astrologa.bg',
    openGraph: {
      title,
      description: 'Discover your cosmic blueprint',
      images: [`${FRONTEND_URL}/share/card/${params.userId}/opengraph-image`],
    },
    twitter: { card: 'summary_large_image', title },
  };
}

export default async function SharePage({ params }: { params: { userId: string } }) {
  const data = await getShareCard(params.userId);

  if (!data || (!data.sunSign && !data.moonSign)) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888888' }}>Chart not found.</p>
      </div>
    );
  }

  const signs = [
    { glyph: data.sunGlyph, label: 'Sun', sign: data.sunSign },
    { glyph: data.moonGlyph, label: 'Moon', sign: data.moonSign },
    ...(data.risingSign ? [{ glyph: data.risingGlyph ?? '↑', label: 'Rising', sign: data.risingSign }] : []),
  ];

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0D0010 0%, #1a0020 60%, #0D0010 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'Inter, sans-serif' }}>
      <p style={{ color: '#e41aff', fontSize: '14px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '32px' }}>
        ✦ AstroLogAI — Cosmic Blueprint
      </p>
      <div style={{ display: 'flex', gap: '48px', marginBottom: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {signs.map(({ glyph, label, sign }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '56px', color: '#ffffff', marginBottom: '8px' }}>{glyph}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>{sign}</div>
            <div style={{ fontSize: '12px', color: '#888888', letterSpacing: '2px', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>
      <Link
        href="/en/register"
        style={{
          display: 'inline-block', padding: '14px 32px',
          background: '#e41aff', color: '#ffffff',
          textDecoration: 'none', borderRadius: '8px',
          fontWeight: 700, fontSize: '16px', marginBottom: '20px',
        }}
      >
        Discover your cosmic blueprint ✦
      </Link>
      <p style={{ color: '#555555', fontSize: '13px' }}>Free reading at astrologa.bg</p>
    </main>
  );
}
