import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { brand } from '@stipulate/brand';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-stripe',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${brand.domain}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} · ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  keywords: ['credit card rewards', 'card benefits API', 'payment routing', 'MCC', 'fintech'],
  authors: [{ name: brand.name, url: siteUrl }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: brand.name,
    title: `${brand.name} · ${brand.tagline}`,
    description: brand.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brand.name} · ${brand.tagline}`,
    description: brand.description,
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
