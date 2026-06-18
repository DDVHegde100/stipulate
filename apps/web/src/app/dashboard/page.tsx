'use client';

import { useEffect, useState } from 'react';
import { Card, Heading, Text } from '@stipulate/ui';

import { apiFetch } from '../../lib/auth';

interface UsageSummary {
  totalCalls: number;
  totalCostUsd: number;
  periodStart: string;
}

export default function DashboardPage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<UsageSummary>('/usage')
      .then(setUsage)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load usage'));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <Text variant="overline" tone="secondary">
          Organization
        </Text>
        <Heading as="h1" size="lg">
          Dashboard
        </Heading>
      </div>

      {error && <Text tone="secondary">{error}</Text>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <Text variant="overline" tone="secondary">
            API calls (MTD)
          </Text>
          <p className="mt-2 text-3xl font-semibold text-white">{usage?.totalCalls ?? '—'}</p>
        </Card>
        <Card className="p-6">
          <Text variant="overline" tone="secondary">
            Estimated cost
          </Text>
          <p className="mt-2 text-3xl font-semibold text-white">
            {usage ? `$${usage.totalCostUsd.toFixed(2)}` : '—'}
          </p>
        </Card>
        <Card className="p-6">
          <Text variant="overline" tone="secondary">
            Period start
          </Text>
          <p className="mt-2 text-lg text-white">{usage?.periodStart?.slice(0, 10) ?? '—'}</p>
        </Card>
      </div>
    </div>
  );
}
