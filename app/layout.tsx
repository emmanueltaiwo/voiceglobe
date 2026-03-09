import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from './ConvexClientProvider';
import { Analytics } from '@vercel/analytics/next';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voiceglobe.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'VoiceGlobe — Voice Messages on the Globe',
  description:
    'Transmit voice messages across the globe. Drop voice recordings on the map and discover what others have left behind. Tune in to what the world is saying.',
  openGraph: {
    title: 'VoiceGlobe — Voice Messages on the Globe',
    description:
      'Transmit voice messages across the globe. Drop voice recordings on the map and discover what others have left behind.',
    url: siteUrl,
    siteName: 'VoiceGlobe',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoiceGlobe — Voice Messages on the Globe',
    description:
      'Transmit voice messages across the globe. Drop voice recordings on the map and discover what others have left behind.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={`${plexMono.variable} ${spaceGrotesk.variable}`}>
      <body className='antialiased font-mono'>
        <ConvexClientProvider>
          {children}
          <Analytics />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
