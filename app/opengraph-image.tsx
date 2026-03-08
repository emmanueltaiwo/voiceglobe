import { ImageResponse } from 'next/og';

export const alt = 'VoiceGlobe — Transmit voice messages across the globe';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: 1200,
        height: 630,
        flexDirection: 'column',
        background: '#050810',
        padding: 32,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Subtle vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(2, 4, 12, 0.5) 100%)',
          borderRadius: 16,
          pointerEvents: 'none',
        }}
      />
      {/* Main content panel - dark glass like app */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(13, 17, 23, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          padding: 48,
        }}
      >
        {/* VoiceGlobe · Live header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: '#a3e635',
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#8b99a8',
              letterSpacing: 4,
            }}
          >
            VOICEGLOBE · LIVE
          </span>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#a3e635',
            marginBottom: 16,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          VoiceGlobe
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#8b99a8',
            letterSpacing: 4,
            marginBottom: 32,
          }}
        >
          VOICE MESSAGES ON THE GLOBE
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: 18,
            color: '#8b99a8',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            Transmit voice messages across the globe.
          </div>
          <div>Tune in to what the world is saying.</div>
        </div>
        {/* Accent bar */}
        <div
          style={{
            width: 120,
            height: 4,
            background: '#a3e635',
            marginTop: 40,
            borderRadius: 2,
          }}
        />
      </div>
    </div>,
    {
      ...size,
    },
  );
}
