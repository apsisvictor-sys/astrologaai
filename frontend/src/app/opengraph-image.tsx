import { ImageResponse } from 'next/og';

export const alt = 'The Oracle — Ethereal Astrology AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #080818 0%, #0d0928 50%, #160a2a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top-left glow */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -120,
            width: 560,
            height: 560,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
          }}
        />
        {/* Bottom-right glow */}
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 460,
            height: 460,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)',
          }}
        />

        {/* Decorative stars */}
        {[
          { top: '12%', left: '7%', size: 4 },
          { top: '18%', left: '91%', size: 3 },
          { top: '72%', left: '11%', size: 3 },
          { top: '58%', left: '88%', size: 4 },
          { top: '38%', left: '3%', size: 2 },
          { top: '82%', left: '72%', size: 3 },
          { top: '10%', left: '52%', size: 2 },
          { top: '88%', left: '38%', size: 3 },
          { top: '45%', left: '96%', size: 2 },
        ].map((star, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              background: 'white',
              opacity: 0.45,
            }}
          />
        ))}

        {/* Celestial symbol */}
        <div
          style={{
            fontSize: 64,
            color: '#818cf8',
            marginBottom: 20,
            lineHeight: 1,
          }}
        >
          ✦
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            gap: 18,
            fontSize: 80,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: 20,
          }}
        >
          <span>The</span>
          <span style={{ color: '#a78bfa' }}>Oracle</span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 80,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
            marginBottom: 24,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 30,
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            maxWidth: 820,
            lineHeight: 1.45,
            letterSpacing: '0.01em',
          }}
        >
          Your personal AI astrologer — Swiss Ephemeris precision
        </div>

        {/* Domain badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'rgba(255,255,255,0.3)',
            fontSize: 20,
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          astrologa.bg
        </div>
      </div>
    ),
    { ...size }
  );
}
