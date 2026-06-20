import Link from 'next/link';
import { StripeFooter } from '../../components/stripe/StripeFooter';
import { StripeNav } from '../../components/stripe/StripeNav';
import { FurEnhancer } from '../../components/stripe/FurEnhancer';
import { GradientMesh } from '../../components/stripe/Visuals';

const TIERS = [
  {
    name: 'API',
    price: '$0.001',
    unit: 'per call',
    desc: 'Pay-as-you-go routing for integrators',
    features: ['POST /v1/route & enrich', '200+ card catalog', 'Usage dashboard', 'TypeScript + Python SDKs'],
    href: '/signup',
    cta: 'Start building',
    highlight: false,
  },
  {
    name: 'SaaS',
    price: '$299',
    unit: 'per month',
    desc: 'Unlimited calls for production apps',
    features: ['Unlimited API calls', 'Benefit webhooks', 'Audit log & GDPR', 'Priority support'],
    href: '/dashboard/billing',
    cta: 'Upgrade to SaaS',
    highlight: true,
  },
  {
    name: 'Consumer',
    price: '$3.99',
    unit: 'per month',
    desc: 'Full wallet for rewards power users',
    features: ['200+ cards in wallet', 'Cap tracking & alerts', 'Receipt OCR', 'iOS + Android app'],
    href: '/app/wallet',
    cta: 'Open wallet',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="stripe">
      <FurEnhancer />
      <StripeNav />
      <main className="hero-bg">
        <GradientMesh variant="hero" />
        <GradientMesh variant="spiral" />
        <section className="relative pb-12 pt-20 md:pb-16 md:pt-28">
          <div className="wrap text-center">
            <p className="eyebrow mb-4">Pricing</p>
            <h1 className="h-section mb-4">Pay for what you route</h1>
            <p className="body-lg mx-auto max-w-2xl">
              Integrated per-call pricing with no hidden fees. Start free, scale with volume, or go
              unlimited on the SaaS tier with webhooks and audit logs included.
            </p>
          </div>
        </section>

        <section className="relative pb-24">
          <div className="wrap grid gap-6 lg:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`panel panel--infusion relative flex flex-col overflow-hidden p-8 ${t.highlight ? 'ring-2 ring-[#1b4332]/35' : ''}`}
              >
                <GradientMesh variant="card" />
                <div className="relative flex flex-1 flex-col">
                  {t.highlight && (
                    <span className="fur-chip mb-4 inline-flex w-fit px-3 py-1 text-xs">
                      Most popular
                    </span>
                  )}
                  <h2 className="text-xl font-semibold">{t.name}</h2>
                  <p className="mt-1 text-sm text-[#8898aa]">{t.desc}</p>
                  <p className="mt-6 text-4xl font-semibold tracking-tight">
                    {t.price}
                    <span className="text-sm font-normal text-[#8898aa]"> / {t.unit}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-[#425466]">
                        <span className="text-accent">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={t.href}
                    className={`btn mt-8 w-full text-center ${t.highlight ? 'btn--primary fur-btn' : 'btn--secondary'}`}
                  >
                    {t.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <StripeFooter />
    </div>
  );
}
