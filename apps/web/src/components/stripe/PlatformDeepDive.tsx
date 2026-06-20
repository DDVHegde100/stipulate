import Link from 'next/link';
import { GradientMesh } from './Visuals';

const STEPS = [
  {
    n: '01',
    title: 'Ingest issuer documents',
    body: 'Upload benefit guides, marketing PDFs, and terms pages. Stipulate normalizes them into a versioned catalog with confidence scores and human review flags for low-confidence extractions.',
  },
  {
    n: '02',
    title: 'Structure benefit rules',
    body: 'Earn rates, bonus categories, annual and quarterly caps, merchant exclusions, activation requirements, and reset periods are stored as queryable rules. Webhooks fire when issuer terms change.',
  },
  {
    n: '03',
    title: 'Enrich every transaction',
    body: 'Merchant names, MCC codes, and amounts pass through issuer-specific override tables. POST /v1/enrich returns the category each card network would assign before routing logic runs.',
  },
  {
    n: '04',
    title: 'Route to max return',
    body: 'POST /v1/route ranks every card in a wallet by expected cash-equivalent return, accounting for remaining cap headroom and points valuations. Batch mode handles up to 50 purchases per request.',
  },
];

const CAPABILITIES = [
  ['Benefit parsing', 'LLM pipeline with PDF ingestion, diffable changelog, reparse alerts'],
  ['Cap tracking', 'Annual, quarterly, monthly, and per-transaction limits with Redis-backed state'],
  ['Proxy pay', 'Stripe PaymentIntents routed to the optimal card via POST /v1/proxy-pay'],
  ['Consumer wallet', 'Cap dashboards, benefit alerts, receipt OCR, and Expo push notifications'],
  ['Developer platform', 'OpenAPI 3.1, TypeScript + Python SDKs, idempotency keys, audit logs'],
  ['Compliance', 'Org-scoped API keys, GDPR export, immutable audit trail for enterprise'],
];

export function PlatformDeepDive() {
  return (
    <section id="platform" className="section section--surface">
      <div className="wrap">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="eyebrow mb-3">Platform overview</p>
          <h2 className="h-section mb-4 text-balance">
            From unstructured fine print to <em>ranked routing decisions</em>
          </h2>
          <p className="body-lg">
            Stipulate is not a static category lookup table. It models the full stipulation lifecycle:
            parse, version, enrich, route, and notify when issuer terms change.
          </p>
        </div>

        <div className="mb-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="panel relative overflow-hidden p-6">
              <GradientMesh variant="card" />
              <div className="relative">
                <p className="text-3xl font-semibold text-[#2d6a4f]/40">{s.n}</p>
                <h3 className="mt-3 text-[15px] font-semibold text-[#0a2540]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#425466]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="panel overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="relative border-b border-[#e6ebf1] p-8 lg:border-b-0 lg:border-r">
              <GradientMesh variant="card" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-[#0a2540]">Full platform capabilities</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#425466]">
                  Everything you need to ship card optimization in production, from seed-stage prototypes
                  to enterprise deployments with SOC 2 audit requirements.
                </p>
                <dl className="mt-6 space-y-4">
                  {CAPABILITIES.map(([k, v]) => (
                    <div key={k} className="border-b border-[#e6ebf1] pb-4 last:border-0 last:pb-0">
                      <dt className="text-sm font-semibold text-[#0a2540]">{k}</dt>
                      <dd className="mt-1 text-sm text-[#425466]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <div className="flex flex-col justify-center p-8">
              <p className="eyebrow mb-2">Pricing at a glance</p>
              <ul className="space-y-3 text-sm text-[#425466]">
                <li>
                  <strong className="text-[#0a2540]">API:</strong> $0.001 per POST /v1/route or /v1/enrich
                  call, metered monthly
                </li>
                <li>
                  <strong className="text-[#0a2540]">SaaS:</strong> $299/month unlimited calls, webhooks,
                  audit log, priority support
                </li>
                <li>
                  <strong className="text-[#0a2540]">Consumer:</strong> $3.99/month wallet app with cap
                  tracking, alerts, and receipt OCR
                </li>
              </ul>
              <Link href="/pricing" className="link mt-6 text-sm">
                View full pricing <span aria-hidden>→</span>
              </Link>
              <Link href="/docs" className="link mt-3 text-sm">
                Read API documentation <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
