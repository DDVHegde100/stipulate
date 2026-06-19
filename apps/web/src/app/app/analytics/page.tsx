'use client';

import { useEffect, useMemo, useState } from 'react';
import { GlassPanel, Heading, Text } from '@stipulate/ui';

import { demoApiFetch } from '../../../lib/demo-api';
import { estimateMissedRewards, getRouteHistory } from '../../../lib/route-history';
import { getWalletCards } from '../../../lib/wallet';

interface CapRow {
  cardId: string;
  category: string;
  capPeriod: string;
  spentMinor: number;
}

const CAP_LIMITS: Record<string, number> = {
  groceries: 2_500_000,
  dining: 1_000_000,
  travel: 1_500_000,
  default: 1_000_000,
};

export default function AnalyticsPage() {
  const [caps, setCaps] = useState<CapRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const history = useMemo(() => getRouteHistory(), []);

  useEffect(() => {
    const cards = getWalletCards();
    if (cards.length === 0) return;

    void demoApiFetch<{ caps: CapRow[] }>(
      `/spend/summary?user_ref=web-wallet&card_ids=${cards.map((c) => c.cardId).join(',')}`,
    )
      .then((data) => setCaps(data.caps))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load spend'));
  }, []);

  const missedMinor = estimateMissedRewards(history);
  const categoryTotals = history.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.mcc.startsWith('54') ? 'groceries' : entry.mcc.startsWith('58') ? 'dining' : 'other';
    acc[key] = (acc[key] ?? 0) + entry.amountMinor;
    return acc;
  }, {});

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategory = categoryEntries[0]?.[1] ?? 1;

  return (
    <div className="space-y-8">
      <div>
        <Text variant="overline" tone="secondary">
          Spend analytics
        </Text>
        <Heading as="h1" size="lg">
          Rewards overview
        </Heading>
      </div>

      {error && <Text tone="secondary">{error}</Text>}

      <div className="grid gap-4 md:grid-cols-3">
        <GlassPanel>
          <Text variant="overline" tone="secondary">
            Missed rewards (est.)
          </Text>
          <p className="mt-2 text-3xl font-semibold text-white">
            ${(missedMinor / 100).toFixed(2)}
          </p>
          <Text variant="caption" tone="tertiary" className="mt-1">
            Based on {history.length} routed purchases
          </Text>
        </GlassPanel>
        <GlassPanel>
          <Text variant="overline" tone="secondary">
            Routes analyzed
          </Text>
          <p className="mt-2 text-3xl font-semibold text-white">{history.length}</p>
        </GlassPanel>
        <GlassPanel>
          <Text variant="overline" tone="secondary">
            Cap categories tracked
          </Text>
          <p className="mt-2 text-3xl font-semibold text-white">{caps.length}</p>
        </GlassPanel>
      </div>

      <GlassPanel>
        <Heading as="h2" size="sm" className="mb-4">
          Spend by category
        </Heading>
        <div className="space-y-3">
          {categoryEntries.map(([cat, total]) => (
            <div key={cat}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="capitalize text-white">{cat}</span>
                <span className="text-[var(--color-text-secondary)]">${(total / 100).toFixed(2)}</span>
              </div>
              <div className="h-2 rounded-full bg-ink-900">
                <div
                  className="h-2 rounded-full bg-accent-500"
                  style={{ width: `${Math.round((total / maxCategory) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          {categoryEntries.length === 0 && (
            <Text tone="secondary">Route a few purchases to see category breakdown.</Text>
          )}
        </div>
      </GlassPanel>

      <GlassPanel>
        <Heading as="h2" size="sm" className="mb-4">
          Cap utilization
        </Heading>
        <div className="space-y-4">
          {caps.map((cap) => {
            const limit = CAP_LIMITS[cap.category] ?? CAP_LIMITS.default!;
            const pct = Math.min(100, Math.round((cap.spentMinor / limit) * 100));
            return (
              <div key={`${cap.cardId}-${cap.category}`}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-white">
                    {cap.category} · {cap.cardId}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-ink-900">
                  <div
                    className={`h-2 rounded-full ${pct > 85 ? 'bg-orange-400' : 'bg-accent-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {caps.length === 0 && <Text tone="secondary">No cap spend recorded yet.</Text>}
        </div>
      </GlassPanel>
    </div>
  );
}
