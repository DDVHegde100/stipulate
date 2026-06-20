import Link from 'next/link';
import { BillingMeterMockup, EnrichMockup, ParserMockup, RouteDashboardMockup } from './Mockups';
import { GradientMesh } from './Visuals';

const PRODUCTS = [
  {
    tag: 'Payments',
    title: 'Accept and optimize routing globally',
    desc: 'Rank every card in a wallet by expected return for any merchant, MCC, and amount. Returns human-readable reasoning, cap headroom, and expected cents-on-the-dollar return in under 20ms P95.',
    mockup: <RouteDashboardMockup />,
    wide: true,
  },
  {
    tag: 'Billing',
    title: 'Enable any billing model',
    desc: 'Metered API calls at $0.001 each, a $299/month SaaS unlimited tier, or a $3.99 consumer wallet subscription. All plans include org-scoped API keys and a usage dashboard.',
    mockup: <BillingMeterMockup />,
  },
  {
    tag: 'Parsing',
    title: 'Parse benefit stipulations',
    desc: 'LLM pipeline extracts earn rates, caps, exclusions, and activation rules from issuer PDFs and markdown. Every change is versioned with diffable changelog entries and optional webhook alerts.',
    mockup: <ParserMockup />,
  },
  {
    tag: 'Enrichment',
    title: 'Enrich merchant categories',
    desc: '450+ MCC codes mapped through issuer-specific override tables. POST /v1/enrich resolves the category each card network would assign before routing logic evaluates the wallet.',
    mockup: <EnrichMockup />,
  },
];

export function StripeProducts() {
  return (
    <section id="products" className="section">
      <GradientMesh variant="spiral" />
      <div className="wrap relative">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="h-section mb-4 text-balance">
            Flexible solutions for <em>every business model</em>.
          </h2>
          <p className="body-lg mx-auto max-w-2xl">
            Grow your business with a comprehensive set of routing, parsing, and wallet tools designed
            to work individually or together on one platform.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {PRODUCTS.map((p) => (
            <div
              key={p.title}
              className={`panel panel--hover panel--infusion overflow-hidden ${p.wide ? 'lg:col-span-2' : ''}`}
            >
              <div className={`grid ${p.wide ? 'lg:grid-cols-2' : ''}`}>
                <div className="relative border-b border-[#e6ebf1] bg-[#fafbfc] lg:border-b-0 lg:border-r">
                  <GradientMesh variant="card" />
                  <div className="relative">{p.mockup}</div>
                </div>
                <div className="flex flex-col justify-center p-7">
                  <p className="eyebrow mb-2 text-[11px]">{p.tag}</p>
                  <h3 className="text-lg font-semibold leading-snug text-[#0a2540]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#425466]">{p.desc}</p>
                  <Link href="/docs" className="link mt-5 text-sm">
                    Learn more <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
