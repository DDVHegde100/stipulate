'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Logo } from '@stipulate/ui';

import { clearUser, getStoredUser } from '../lib/consumer-auth';

const navItems = [
  { href: '/app/wallet', label: 'Wallet' },
  { href: '/app/route', label: 'Route' },
  { href: '/app/batch', label: 'Batch' },
  { href: '/app/analytics', label: 'Analytics' },
  { href: '/app/alerts', label: 'Alerts' },
  { href: '/app/discover', label: 'Discover' },
  { href: '/app/settings', label: 'Settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = getStoredUser();

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-50 border-b border-glass-border bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/app/wallet">
            <Logo variant="full" />
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  pathname.startsWith(item.href)
                    ? 'text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-[var(--color-text-tertiary)] md:inline">
                {user.email}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearUser();
                window.location.href = '/login';
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
