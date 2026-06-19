import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Button } from './Button.js';
import { Logo } from './Logo.js';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavBarProps {
  links?: NavLink[];
  cta?: ReactNode;
  className?: string;
}

const defaultLinks: NavLink[] = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/console' },
];

export function NavBar({ links = defaultLinks, cta, className }: NavBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-glass-border bg-ink-950/80 backdrop-blur-xl',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="/">
          <Logo variant="full" />
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {cta ?? (
            <>
              <a href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </a>
              <a href="/signup">
                <Button variant="primary" size="sm">
                  Get started
                </Button>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export interface FooterLinkGroup {
  title: string;
  links: NavLink[];
}

export interface FooterProps {
  groups?: FooterLinkGroup[];
}

const defaultGroups: FooterLinkGroup[] = [
  {
    title: 'Product',
    links: [
      { label: 'API', href: '/console' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Wallet', href: '/app/wallet' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Console', href: '/console' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Status', href: '/status' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Sign up', href: '/signup' },
      { label: 'Sign in', href: '/login' },
    ],
  },
];

export function Footer({ groups = defaultGroups }: FooterProps) {
  return (
    <footer className="border-t border-glass-border py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Logo variant="wordmark" className="opacity-80" />
            <p className="mt-4 text-sm text-[var(--color-text-tertiary)]">
              Parse the stipulations. Route the payment.
            </p>
          </div>
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {group.title}
              </p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-[var(--color-text-tertiary)]">
          © {new Date().getFullYear()} Stipulate. stipulate.io
        </p>
      </div>
    </footer>
  );
}
