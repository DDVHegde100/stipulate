'use client';

import { useMemo, useState } from 'react';
import { Button, GlassPanel, Heading, Text } from '@stipulate/ui';

import { apiV1Base, demoApiKey } from '../../../lib/demo-api';
import { getWalletCards } from '../../../lib/wallet';

const PRESET_BATCH = {
  requests: [
    {
      merchantName: 'Starbucks',
      mcc: '5814',
      amount: { amountMinor: 650, currency: 'USD' },
      userCardIds: [] as string[],
    },
    {
      merchantName: 'Whole Foods',
      mcc: '5411',
      amount: { amountMinor: 4500, currency: 'USD' },
      userCardIds: [] as string[],
    },
    {
      merchantName: 'United Airlines',
      mcc: '4511',
      amount: { amountMinor: 32000, currency: 'USD' },
      userCardIds: [] as string[],
    },
  ],
};

interface BatchResultRow {
  index: number;
  merchantName: string;
  bestCardId: string;
  rewardMinor: number;
}

export default function BatchRoutePage() {
  const walletCards = useMemo(() => getWalletCards(), []);
  const cardIds = useMemo(() => walletCards.map((c) => c.cardId), [walletCards]);
  const labelById = useMemo(
    () => Object.fromEntries(walletCards.map((c) => [c.cardId, c.label])),
    [walletCards],
  );

  const [results, setResults] = useState<BatchResultRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; succeeded: number; latencyMs: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBatchRoute() {
    if (cardIds.length === 0) {
      setError('Add cards to your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    const start = performance.now();

    const body = {
      sharedUserCardIds: cardIds,
      requests: PRESET_BATCH.requests.map((req) => ({
        ...req,
        userCardIds: cardIds,
      })),
    };

    try {
      const response = await fetch(`${apiV1Base()}/route/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': demoApiKey(),
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as {
        data: {
          results: Array<{
            bestCardId: string;
            rankedCards: Array<{ estimatedReward?: { amountMinor: number } }>;
          }>;
          total: number;
          succeeded: number;
        };
        error?: { message: string };
      };

      if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);

      const rows = json.data.results.map((result, index) => ({
        index: index + 1,
        merchantName: PRESET_BATCH.requests[index]?.merchantName ?? `Purchase ${index + 1}`,
        bestCardId: result.bestCardId,
        rewardMinor: result.rankedCards[0]?.estimatedReward?.amountMinor ?? 0,
      }));

      setResults(rows);
      setSummary({
        total: json.data.total,
        succeeded: json.data.succeeded,
        latencyMs: Math.round(performance.now() - start),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch routing failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Text variant="overline" tone="secondary">
          Batch routing
        </Text>
        <Heading as="h1" size="lg">
          Rank cards for multiple purchases
        </Heading>
        <Text tone="secondary" className="mt-2 max-w-2xl">
          Route a week of typical spend in one API call — coffee, groceries, and travel — using your
          wallet cards.
        </Text>
      </div>

      <GlassPanel>
        <Text variant="overline" tone="secondary" className="mb-3 block">
          Sample batch ({PRESET_BATCH.requests.length} purchases)
        </Text>
        <div className="space-y-2">
          {PRESET_BATCH.requests.map((req) => (
            <div
              key={req.merchantName}
              className="flex items-center justify-between rounded-lg border border-glass-border bg-ink-900 px-4 py-2 text-sm"
            >
              <span className="text-white">{req.merchantName}</span>
              <span className="text-[var(--color-text-secondary)]">
                ${(req.amount.amountMinor / 100).toFixed(2)} · MCC {req.mcc}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleBatchRoute()} disabled={loading}>
            {loading ? 'Routing…' : 'Run batch route'}
          </Button>
          {summary && (
            <Text variant="caption" tone="tertiary">
              {summary.succeeded}/{summary.total} succeeded · {summary.latencyMs}ms
            </Text>
          )}
        </div>
        {error && <Text className="mt-2 text-red-400">{error}</Text>}
      </GlassPanel>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((row) => (
            <GlassPanel key={row.index}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Text variant="overline" tone="secondary">
                    #{row.index} · {row.merchantName}
                  </Text>
                  <Heading as="h3" size="sm">
                    {labelById[row.bestCardId] ?? row.bestCardId}
                  </Heading>
                </div>
                <Text className="text-lg text-accent-300">+${(row.rewardMinor / 100).toFixed(2)}</Text>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
