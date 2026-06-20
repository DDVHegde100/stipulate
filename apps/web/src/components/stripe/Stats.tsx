import { GradientMesh } from './Visuals';

const STATS = [
  {
    value: '200+',
    label: 'US credit and debit cards indexed with earn rates, caps, and activation rules',
  },
  {
    value: '<20ms',
    label: 'P95 routing latency with Redis-backed cap state and warm catalog cache',
  },
  {
    value: '450+',
    label: 'MCC codes mapped through issuer-specific override tables before routing',
  },
  {
    value: '99.9%',
    label: 'Historical API uptime across route, enrich, parse, and webhook services',
  },
];

export function StripeStats() {
  return (
    <section className="section section--surface border-y border-[#e6ebf1]">
      <GradientMesh variant="spiral" />
      <div className="wrap relative">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="h-section mb-4 text-balance">
            The backbone of <em>global card optimization</em>
          </h2>
          <p className="body-lg">
            Production-grade infrastructure trusted by neobanks, rewards platforms, and corporate T&E
            teams that need accurate benefit math at checkout scale.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`text-center lg:text-left ${i > 0 ? 'lg:border-l lg:border-[#e6ebf1] lg:pl-8' : ''}`}
            >
              <p className="stat-num">{s.value}</p>
              <p className="stat-label mx-auto lg:mx-0">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
