'use client';

import { useEffect, useState } from 'react';
import { Badge, GlassPanel, Heading, Text } from '@stipulate/ui';

function statusBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');
}

interface StatusPayload {
  status: string;
  version: string;
  checks: {
    postgres: { ok: boolean; latencyMs?: number };
    redis: { ok: boolean };
    workers: { ingestionQueueDepth: number; reviewQueueDepth: number };
    slo: {
      routeP99LimitMs: number;
      routeP50Ms?: number;
      routeP95Ms?: number;
      routeP99Ms?: number;
      routeSampleCount?: number;
      routeSloBreaches?: number;
    };
    features: Record<string, boolean>;
    integrations: {
      emailAlerts: boolean;
      pushAlerts: boolean;
      plaid: boolean;
      emailDelivery?: { sent: number; failed: number };
    };
    monitoring: {
      routeSloOk: boolean;
      ingestionQueueOk: boolean;
      reviewQueueOk: boolean;
      observability: { sentry: boolean; posthog: boolean };
      stripe: {
        billing: boolean;
        liveMode: boolean;
        webhookConfigured: boolean;
        consumerPriceConfigured: boolean;
      };
    };
  };
  timestamp: string;
}

export default function StatusPage() {
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${statusBase()}/status`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<StatusPayload>;
      })
      .then(setPayload)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load status'));
  }, []);

  const operational = payload?.status === 'operational';

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Text variant="overline" tone="secondary">
            System status
          </Text>
          <Heading as="h1" size="lg">
            Stipulate platform health
          </Heading>
        </div>

        {error && <Text tone="secondary">{error}</Text>}

        {payload && (
          <>
            <GlassPanel className="flex items-center justify-between">
              <div>
                <Heading as="h2" size="sm">
                  API {payload.version}
                </Heading>
                <Text variant="caption" tone="tertiary" className="mt-1">
                  Updated {new Date(payload.timestamp).toLocaleString()}
                </Text>
              </div>
              <Badge variant={operational ? 'success' : 'warning'}>{payload.status}</Badge>
            </GlassPanel>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Postgres', ok: payload.checks.postgres.ok, detail: `${payload.checks.postgres.latencyMs ?? '—'}ms` },
                { label: 'Redis', ok: payload.checks.redis.ok },
                {
                  label: 'Ingestion queue',
                  ok: payload.checks.monitoring.ingestionQueueOk,
                  detail: String(payload.checks.workers.ingestionQueueDepth),
                },
                {
                  label: 'Route p99',
                  ok: payload.checks.monitoring.routeSloOk,
                  detail: `${payload.checks.slo.routeP99Ms ?? '—'}ms / ${payload.checks.slo.routeP99LimitMs}ms`,
                },
              ].map((check) => (
                <GlassPanel key={check.label}>
                  <Text variant="overline" tone="secondary">
                    {check.label}
                  </Text>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={check.ok ? 'success' : 'warning'}>{check.ok ? 'ok' : 'degraded'}</Badge>
                    {check.detail && (
                      <Text variant="body-sm" tone="secondary">
                        {check.detail}
                      </Text>
                    )}
                  </div>
                </GlassPanel>
              ))}
            </div>

            <GlassPanel>
              <Text variant="overline" tone="secondary" className="mb-3 block">
                Integrations
              </Text>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['emailAlerts', payload.checks.integrations.emailAlerts],
                    ['pushAlerts', payload.checks.integrations.pushAlerts],
                    ['plaid', payload.checks.integrations.plaid],
                  ] as const
                ).map(([name, enabled]) => (
                  <Badge key={name} variant={enabled ? 'success' : 'outline'}>
                    {name}
                  </Badge>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel>
              <Text variant="overline" tone="secondary" className="mb-3 block">
                Monitoring
              </Text>
              <div className="grid gap-2 text-sm text-[var(--color-text-secondary)]">
                <p>
                  Sentry: {payload.checks.monitoring.observability.sentry ? 'configured' : 'missing'} · PostHog:{' '}
                  {payload.checks.monitoring.observability.posthog ? 'configured' : 'missing'}
                </p>
                <p>
                  Stripe billing: {payload.checks.monitoring.stripe.billing ? 'on' : 'off'} · Live mode:{' '}
                  {payload.checks.monitoring.stripe.liveMode ? 'yes' : 'no'} · Webhook:{' '}
                  {payload.checks.monitoring.stripe.webhookConfigured ? 'yes' : 'no'}
                </p>
              </div>
            </GlassPanel>

            <GlassPanel>
              <Text variant="overline" tone="secondary" className="mb-3 block">
                Feature flags
              </Text>
              <div className="flex flex-wrap gap-2">
                {Object.entries(payload.checks.features).map(([flag, enabled]) => (
                  <Badge key={flag} variant={enabled ? 'accent' : 'outline'}>
                    {flag}
                  </Badge>
                ))}
              </div>
            </GlassPanel>
          </>
        )}
      </div>
    </div>
  );
}
