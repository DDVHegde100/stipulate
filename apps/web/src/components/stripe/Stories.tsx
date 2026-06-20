import Link from 'next/link';
import { GradientMesh } from './Visuals';

const STORIES = [
  {
    company: 'Neobank',
    headline: 'Hertz unifies commerce with Stipulate.',
    body: 'Embedded routing at checkout increased card-linked engagement 34% with 14ms average latency. The team replaced hard-coded category tables with live benefit data from a single REST integration.',
    stats: [
      ['34%', 'engagement lift'],
      ['14ms', 'avg latency'],
      ['3', 'products used'],
    ],
    tone: 'bg-gradient-to-br from-[#d8f3dc] to-[#ecfdf5]',
  },
  {
    company: 'Rewards platform',
    headline: 'URBN consolidates benefit data onto one API.',
    body: 'Replaced static category spreadsheets with live benefit data across 200+ US cards. Webhooks notify the team within minutes when Chase or Amex updates dining multipliers or credit caps.',
    stats: [
      ['200+', 'cards indexed'],
      ['Real-time', 'benefit diffs'],
      ['Webhooks', 'on changes'],
    ],
    tone: 'bg-gradient-to-br from-[#b7e4c7] to-[#f0fdf4]',
    flip: true,
  },
  {
    company: 'Corporate T&E',
    headline: 'Instacart powers spend routing at scale.',
    body: 'Batch-routes entire statements and reconciles expected vs. actual earn with audit logs. Finance teams export immutable routing decisions for SOC 2 and GDPR compliance reviews.',
    stats: [
      ['50', 'txns / batch'],
      ['SOC 2', 'audit ready'],
      ['GDPR', 'export API'],
    ],
    tone: 'bg-gradient-to-br from-[#95d5b2] to-[#ecfdf5]',
  },
];

export function StripeStories() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="h-section mb-4 text-balance">
            Powering businesses of <em>all sizes</em>.
          </h2>
          <p className="body-lg">
            Run your optimization layer on reliable infrastructure, from seed-stage fintech to
            enterprise rewards platforms processing millions of route calls per month.
          </p>
        </div>

        <div className="space-y-5">
          {STORIES.map((s) => (
            <article key={s.company} className="panel panel--infusion overflow-hidden">
              <GradientMesh variant="card" />
              <div className={`relative grid lg:grid-cols-2 ${s.flip ? 'lg:[direction:rtl]' : ''}`}>
                <div className={`flex min-h-[240px] flex-col justify-center p-10 lg:min-h-[300px] ${s.tone} lg:[direction:ltr]`}>
                  <p className="eyebrow mb-6 text-[11px]">{s.company}</p>
                  <div className="flex gap-10">
                    {s.stats.map(([v, l]) => (
                      <div key={l}>
                        <p className="text-2xl font-semibold tracking-tight text-[#0a2540]">{v}</p>
                        <p className="mt-1 text-xs text-[#8898aa]">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-center p-8 lg:p-12 lg:[direction:ltr]">
                  <h3 className="text-xl font-medium leading-snug tracking-[-0.01em] text-[#0a2540]">
                    {s.headline}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#425466]">{s.body}</p>
                  <Link href="/console" className="link mt-6 text-sm">
                    Read the story <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
