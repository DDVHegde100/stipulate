'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Container, Logo } from '@stipulate/ui';

import { clearApiKey } from '../../lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/usage', label: 'Usage' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/keys', label: 'API keys' },
  { href: '/dashboard/webhooks', label: 'Webhooks' },
  { href: '/dashboard/audit', label: 'Audit' },
  { href: '/console', label: 'Console' },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-glass-border bg-ink-950/90 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/dashboard">
            <Logo variant="full" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${pathname === item.href ? 'text-white' : 'text-[var(--color-text-secondary)] hover:text-white'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              clearApiKey();
              window.location.href = '/login';
            }}
          >
            Sign out
          </Button>
        </Container>
      </header>
      <main className="py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
