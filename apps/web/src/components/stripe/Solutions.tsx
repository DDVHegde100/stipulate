import Link from 'next/link';
import { GradientMesh } from './Visuals';

const SOLUTIONS = [
  [
    'Neobanks & challenger banks',
    'Embed routing at the point of debit card selection. Return ranked cards with expected cents-on-the-dollar return in under 20ms.',
    '/console',
  ],
  [
    'Rewards aggregators',
    'Live benefit data with webhooks on issuer changes. Replace static spreadsheets with a versioned catalog and diffable changelog.',
    '/docs',
  ],
  [
    'Corporate T&E',
    'Batch-route statements with audit-grade compliance. Export immutable routing logs for finance and SOC 2 reviews.',
    '/dashboard/audit',
  ],
  [
    'Consumer wallet apps',
    'Cap tracking, benefit alerts, receipt OCR, and push nudges. Ship the full Stipulate wallet on iOS and Android.',
    '/app/wallet',
  ],
  [
    'Affiliate & comparison',
    'Real cap math for card recommendation engines. Show users which card wins after annual and quarterly limits apply.',
    '/pricing',
  ],
  [
    'Issuer intelligence',
    'Structured diffs when rivals change benefits. Monitor Amex, Chase, and Citi updates with automated reparse alerts.',
    '/status',
  ],
] as const;

export function StripeSolutions() {
  return (
    <section id="solutions" className="section section--surface">
      <GradientMesh variant="spiral" />
      <div className="wrap relative">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="h-section mb-4">
            Built for the <em>card optimization</em> stack
          </h2>
          <p className="body-lg">
            One API call answers which card maximizes return at checkout. Integrate via REST, SDKs, or
            the consumer wallet depending on your product surface.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map(([title, desc, href]) => (
            <Link key={title} href={href} className="panel panel--hover panel--infusion relative block overflow-hidden p-6">
              <GradientMesh variant="card" />
              <div className="relative">
                <h3 className="text-[15px] font-semibold text-[#0a2540]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#425466]">{desc}</p>
                <span className="link mt-4 text-sm">
                  Learn more <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
