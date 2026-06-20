import Link from 'next/link';

const COLS = [
  {
    title: 'Products',
    links: [
      ['Routing API', '/console'],
      ['Benefit parsing', '/docs'],
      ['Consumer wallet', '/app/wallet'],
      ['Pricing', '/pricing'],
    ],
  },
  {
    title: 'Developers',
    links: [
      ['Documentation', '/docs'],
      ['API console', '/console'],
      ['OpenAPI spec', '/docs'],
      ['Status', '/status'],
    ],
  },
  {
    title: 'Solutions',
    links: [
      ['Neobanks', '#solutions'],
      ['SaaS platforms', '#solutions'],
      ['Enterprise', '/pricing'],
      ['Consumer apps', '/app/wallet'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['Sign up', '/signup'],
      ['Sign in', '/login'],
      ['Dashboard', '/dashboard'],
    ],
  },
] as const;

export function StripeFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="fur-logo fur-btn">
                <span>S</span>
              </span>
              <span className="font-semibold text-[#0a2540]">Stipulate</span>
            </div>
            <p className="text-sm leading-relaxed text-[#8898aa]">
              Card benefit intelligence infrastructure. Parse stipulations, enrich merchants, route
              spend, and maximize return for fintech and rewards platforms.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title} className="footer__col">
              <h4>{col.title}</h4>
              {col.links.map(([label, href]) => (
                <Link key={label} href={href}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[#e6ebf1] pt-8 text-xs text-[#8898aa] sm:flex-row">
          <span>© {new Date().getFullYear()} Stipulate, Inc.</span>
          <div className="flex gap-6">
            <Link href="/status">Status</Link>
            <Link href="/docs">Privacy</Link>
            <Link href="/docs">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
