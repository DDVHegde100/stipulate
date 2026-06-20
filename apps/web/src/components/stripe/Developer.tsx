import Link from 'next/link';

const PATHS = [
  ["Don't code?", 'Use the API console to send route requests instantly.', 'Open console', '/console'],
  ['Use our SDKs', 'Typed TypeScript and Python clients for production.', 'View docs', '/docs'],
  ['Build your own', 'OpenAPI 3.1, webhooks, idempotency keys, and org API keys.', 'Get API key', '/signup'],
] as const;

export function StripeDeveloper() {
  return (
    <section id="developers" className="section section--dark">
      <div className="wrap">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="h-section mb-4 text-white">
            Reliable infrastructure for <em>every stack</em>.
          </h2>
          <p className="text-lg leading-relaxed text-white/65">
            Adapt Stipulate with flexible integration paths: console, SDKs, or raw REST. Every endpoint
            returns structured JSON with human-readable reasoning for the winning card.
          </p>
        </div>

        <div className="mb-12 grid gap-8 border-y border-white/10 py-10 sm:grid-cols-3">
          {[
            ['500K+', 'route calls / day'],
            ['10K+', 'requests / second'],
            ['150K+', 'cards ranked / min'],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <p className="text-4xl font-semibold tracking-tight">{v}</p>
              <p className="mt-2 text-sm text-white/50">{l}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d1f35]">
            <div className="border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-[11px] text-white/40">route.ts</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-[1.8] text-white/75">{`import { Stipulate } from '@stipulate/sdk';

const client = new Stipulate({
  apiKey: process.env.STIPULATE_KEY,
});

const { best } = await client.route({
  amount: 87.42,
  merchant: { name: 'Nobu', mcc: '5812' },
  wallet: ['amex_gold', 'chase_sapphire_reserve'],
});

// best.return_pct → 4.2`}</pre>
          </div>

          <div className="space-y-3">
            {PATHS.map(([title, desc, cta, href]) => (
              <div
                key={title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.07]"
              >
                <h3 className="font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{desc}</p>
                <Link href={href} className="link mt-3 inline-block text-sm font-medium text-[#95d5b2] hover:underline">
                  {cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
