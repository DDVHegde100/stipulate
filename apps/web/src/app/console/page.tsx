'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Footer, GlassPanel, Heading, NavBar, Text } from '@stipulate/ui';

import { ApiPlayground } from '../../components/ApiPlayground';
import { apiV1Base } from '../../lib/demo-api';

export default function ConsolePage() {
  const [tab, setTab] = useState<'playground' | 'docs'>('playground');

  return (
    <div className="relative min-h-screen bg-gradient-mesh">
      <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden />
      <NavBar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Text variant="overline" tone="secondary">
              Developer tools
            </Text>
            <Heading as="h1" size="lg">
              API console
            </Heading>
          </div>
          <div className="flex rounded-xl border border-glass-border p-1">
            <button
              type="button"
              onClick={() => setTab('playground')}
              className={`rounded-lg px-4 py-2 text-sm ${tab === 'playground' ? 'bg-glass-surface text-white' : 'text-[var(--color-text-secondary)]'}`}
            >
              Playground
            </button>
            <button
              type="button"
              onClick={() => setTab('docs')}
              className={`rounded-lg px-4 py-2 text-sm ${tab === 'docs' ? 'bg-glass-surface text-white' : 'text-[var(--color-text-secondary)]'}`}
            >
              API reference
            </button>
          </div>
        </div>

        {tab === 'playground' ? (
          <ApiPlayground />
        ) : (
          <div className="space-y-6">
            <GlassPanel>
              <Heading as="h2" size="sm" className="mb-2">
                OpenAPI 3.1
              </Heading>
              <Text tone="secondary" className="mb-4">
                Full specification for all v1 endpoints including route, enrich, billing, and org
                export.
              </Text>
              <div className="flex flex-wrap gap-3">
                <a href={`${apiV1Base()}/openapi`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    Download YAML
                  </Button>
                </a>
                <a href={`${apiV1Base()}/openapi/json`} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm">
                    View JSON
                  </Button>
                </a>
                <Link href="/docs">
                  <Button size="sm">Embedded docs</Button>
                </Link>
                <Link href="/docs/sdk">
                  <Button variant="outline" size="sm">
                    SDK docs
                  </Button>
                </Link>
              </div>
            </GlassPanel>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { method: 'POST', path: '/v1/route', desc: 'Rank cards for a purchase' },
                { method: 'POST', path: '/v1/route/batch', desc: 'Route up to 100 purchases in one call' },
                { method: 'POST', path: '/v1/proxy-pay', desc: 'Route + Stripe PaymentIntent (FEATURE_PROXY_PAY)' },
                { method: 'POST', path: '/v1/enrich', desc: 'Resolve merchant MCC' },
                { method: 'GET', path: '/v1/cards', desc: 'Search card catalog' },
                { method: 'GET', path: '/v1/changelog', desc: 'Benefit change history' },
                { method: 'GET', path: '/v1/usage', desc: 'Billing period usage' },
                { method: 'POST', path: '/v1/webhooks', desc: 'Subscribe to benefit alerts' },
              ].map((ep) => (
                <GlassPanel key={ep.path}>
                  <span className="font-mono text-xs text-accent-300">{ep.method}</span>
                  <p className="mt-1 font-mono text-sm text-white">{ep.path}</p>
                  <Text variant="body-sm" tone="secondary" className="mt-2">
                    {ep.desc}
                  </Text>
                </GlassPanel>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
