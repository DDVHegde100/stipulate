'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LINKS = [
  { label: 'Products', href: '#products' },
  { label: 'Platform', href: '#platform' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Developers', href: '#developers' },
  { label: 'Pricing', href: '/pricing' },
];

export function StripeNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap nav__inner">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="fur-logo fur-btn">
            <span>S</span>
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#0a2540]">Stipulate</span>
        </Link>

        <nav className="nav__links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <Link href="/docs">Docs</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn--secondary hidden px-4 py-2 text-sm sm:inline-flex">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn--primary fur-btn px-4 py-2 text-sm">
            Start now
          </Link>
        </div>
      </div>
    </header>
  );
}
