import { ImageResponse } from 'next/og';
import { brand } from '@stipulate/brand';

export const runtime = 'edge';
export const alt = `${brand.name} · ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #0f2922 0%, #1b4332 50%, #0a1f17 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 24,
          }}
        >
          {brand.name}
        </div>
        <div style={{ fontSize: 36, color: '#95d5b2', maxWidth: 800, lineHeight: 1.3 }}>
          {brand.tagline}
        </div>
        <div style={{ fontSize: 24, color: '#94a3b8', marginTop: 32, maxWidth: 700 }}>
          {brand.description}
        </div>
      </div>
    ),
    { ...size },
  );
}
