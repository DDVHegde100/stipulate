'use client';

import { useEffect, useState } from 'react';
import { Card, Heading, Text } from '@stipulate/ui';

import { apiFetch } from '../../../lib/auth';

interface UsageData {
  totalCalls: number;
  totalCostUsd: number;
  byType: Record<string, number>;
  plan: string;
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<UsageData>('/usage')
      .then(setUsage)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load usage'));
  }, []);

  const entries = Object.entries(usage?.byType ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        Usage
      </Heading>

      {error && <Text tone="secondary">{error}</Text>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <Text variant="overline" tone="secondary">
            Total calls
          </Text>
          <p className="mt-2 text-3xl font-semibold text-white">{usage?.totalCalls ?? '—'}</p>
        </Card>
        <Card className="p-6">
          <Text variant="overline" tone="secondary">
            Cost (USD)
          </Text>
          <p className="mt-2 text-3xl font-semibold text-white">
            {usage ? `$${usage.totalCostUsd.toFixed(2)}` : '—'}
          </p>
        </Card>
        <Card className="p-6">
          <Text variant="overline" tone="secondary">
            Plan
          </Text>
          <p className="mt-2 text-xl capitalize text-white">{usage?.plan ?? '—'}</p>
        </Card>
      </div>

      <Card className="p-6">
        <Heading as="h2" size="sm" className="mb-4">
          By endpoint
        </Heading>
        <div className="space-y-3">
          {entries.map(([type, count]) => {
            const max = entries[0]?.[1] ?? 1;
            const pct = Math.round((count / max) * 100);
            return (
              <div key={type}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-white">{type}</span>
                  <span className="text-[var(--color-text-secondary)]">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-ink-900">
                  <div className="h-2 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {entries.length === 0 && <Text tone="secondary">No usage recorded this period.</Text>}
        </div>
      </Card>
    </div>
  );
}
