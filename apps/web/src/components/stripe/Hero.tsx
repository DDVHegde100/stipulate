import Link from 'next/link';
import { RouteDashboardMockup } from './Mockups';
import { GradientMesh } from './Visuals';

export function StripeHero() {
  return (
    <section className="hero-bg pb-20 pt-16 md:pb-28 md:pt-24">
      <GradientMesh variant="hero" />
      <GradientMesh variant="spiral" />
      <div className="wrap relative">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow mb-6">Card benefit intelligence</p>
            <h1 className="h-hero mb-7 text-balance">
              Financial infrastructure to <em>grow card returns</em>.
            </h1>
            <p className="body-lg mb-9 max-w-[30rem] text-balance">
              Parse issuer fine print, enrich merchant categories, and route spend to the card that
              maximizes net return. Ship via REST API, TypeScript and Python SDKs, or the consumer
              wallet app.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn--primary fur-btn px-7 py-3">
                Start now
              </Link>
              <Link href="/console" className="btn btn--secondary px-7 py-3">
                View API console
              </Link>
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-[#8898aa]">
              Free to start · $0.001 per route call · 200+ US cards · Sub-20ms P95 latency
            </p>
          </div>
          <div className="mockup-wrap">
            <GradientMesh variant="card" />
            <RouteDashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
