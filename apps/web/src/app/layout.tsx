import type { Metadata } from 'next';
import { brand } from '@stipulate/brand';
import './globals.css';

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen bg-ink-950 font-sans antialiased">{children}</body>
    </html>
  );
}
