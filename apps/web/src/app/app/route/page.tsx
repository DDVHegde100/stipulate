'use client';

import { useMemo, useState } from 'react';
import { Button, GlassPanel, Heading, Text } from '@stipulate/ui';

import { demoApiKey, apiV1Base } from '../../../lib/demo-api';
import { recordRouteHistory } from '../../../lib/route-history';
import { getWalletCards } from '../../../lib/wallet';

const MCC_PRESETS = [
  { label: 'Coffee shop', mcc: '5814', merchant: 'Starbucks' },
  { label: 'Restaurant', mcc: '5812', merchant: 'Local Bistro' },
  { label: 'Grocery', mcc: '5411', merchant: 'Whole Foods' },
  { label: 'Gas station', mcc: '5541', merchant: 'Shell' },
  { label: 'Airline', mcc: '4511', merchant: 'United Airlines' },
] as const;

interface RankedCard {
  cardId: string;
  rank: number;
  reasoning: string;
  score?: number;
  estimatedReward?: { amountMinor: number; currency: string };
  factors?: Array<{ label: string; value: string | number }>;
}

export default function RoutePage() {
  const walletCards = useMemo(() => getWalletCards(), []);
  const labelById = useMemo(
    () => Object.fromEntries(walletCards.map((c) => [c.cardId, c.label])),
    [walletCards],
  );

  const [merchant, setMerchant] = useState('Starbucks');
  const [mcc, setMcc] = useState('5814');
  const [amount, setAmount] = useState(6.5);
  const [results, setResults] = useState<RankedCard[]>([]);
  const [bestCardId, setBestCardId] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [parsingReceipt, setParsingReceipt] = useState(false);

  const curlExample = useMemo(() => {
    const body = {
      merchantName: merchant,
      mcc,
      amount: { amountMinor: Math.round(amount * 100), currency: 'USD' },
      userCardIds: walletCards.map((c) => c.cardId),
    };
    return `curl -X POST ${apiV1Base()}/route \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${demoApiKey()}" \\
  -d '${JSON.stringify(body)}'`;
  }, [merchant, mcc, amount, walletCards]);

  async function handleRoute() {
    if (walletCards.length === 0) {
      setError('Add cards to your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    const start = performance.now();

    try {
      const amountMinor = Math.round(amount * 100);
      const response = await fetch(`${apiV1Base()}/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': demoApiKey(),
        },
        body: JSON.stringify({
          merchantName: merchant,
          mcc,
          amount: { amountMinor, currency: 'USD' },
          userCardIds: walletCards.map((c) => c.cardId),
        }),
      });

      const json = (await response.json()) as {
        data: { rankedCards: RankedCard[]; bestCardId: string };
        error?: { message: string };
      };

      if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);

      setLatencyMs(Math.round(performance.now() - start));
      setResults(json.data.rankedCards);
      setBestCardId(json.data.bestCardId);

      const best = json.data.rankedCards[0];
      recordRouteHistory({
        merchant,
        mcc,
        amountMinor,
        bestCardId: json.data.bestCardId,
        rewardMinor: best?.estimatedReward?.amountMinor ?? 0,
        usedBestCard: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing failed');
    } finally {
      setLoading(false);
    }
  }

  async function copyCurl() {
    await navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function parseReceipt() {
    if (!receiptText.trim()) return;
    setParsingReceipt(true);
    setError(null);
    try {
      const response = await fetch(`${apiV1Base()}/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': demoApiKey(),
        },
        body: JSON.stringify({ receiptOcrText: receiptText }),
      });
      const json = (await response.json()) as {
        data: {
          enrichment: { merchantName: string; mcc?: string };
          receiptParsed?: boolean;
        };
        error?: { message: string };
      };
      if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);

      const enrichment = json.data.enrichment;
      if (enrichment.merchantName) setMerchant(enrichment.merchantName);
      if (enrichment.mcc) setMcc(enrichment.mcc);
      setShowReceipt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Receipt parse failed');
    } finally {
      setParsingReceipt(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <Text variant="overline" tone="secondary">
            Route preview
          </Text>
          <Heading as="h1" size="lg">
            Which card should you use?
          </Heading>
        </div>
        {latencyMs !== null && (
          <span className="rounded-full border border-glass-border bg-glass-surface px-3 py-1 text-xs text-accent-300">
            {latencyMs}ms
          </span>
        )}
      </div>

      <GlassPanel>
        <button
          type="button"
          onClick={() => setShowReceipt(!showReceipt)}
          className="mb-4 text-sm text-accent-400 hover:underline"
        >
          {showReceipt ? 'Hide receipt OCR' : 'Paste receipt text (OCR)'}
        </button>

        {showReceipt && (
          <div className="mb-4 space-y-3">
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-glass-border bg-ink-900 p-3 font-mono text-xs text-white"
              placeholder="Paste raw receipt text from your scanner or photo OCR…"
              value={receiptText}
              onChange={(e) => setReceiptText(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => void parseReceipt()} disabled={parsingReceipt}>
              {parsingReceipt ? 'Parsing…' : 'Extract merchant'}
            </Button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {MCC_PRESETS.map((preset) => (
            <button
              key={preset.mcc}
              type="button"
              onClick={() => {
                setMerchant(preset.merchant);
                setMcc(preset.mcc);
              }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                mcc === preset.mcc
                  ? 'border-accent-500/50 bg-accent-500/15 text-accent-200'
                  : 'border-glass-border text-[var(--color-text-secondary)] hover:bg-glass-surface'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Text variant="overline" tone="secondary" className="mb-2 block">
              Merchant
            </Text>
            <input
              className="w-full rounded-xl border border-glass-border bg-ink-900 px-4 py-2.5 text-sm text-white"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>
          <div>
            <Text variant="overline" tone="secondary" className="mb-2 block">
              MCC · {mcc}
            </Text>
            <input
              type="range"
              min={1}
              max={100}
              step={0.5}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="w-full accent-accent-500"
            />
            <Text variant="body-sm" tone="secondary" className="mt-1">
              ${amount.toFixed(2)}
            </Text>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => void handleRoute()} disabled={loading}>
            {loading ? 'Routing…' : 'Get recommendation'}
          </Button>
          <Button variant="outline" onClick={() => void copyCurl()}>
            {copied ? 'Copied!' : 'Copy curl'}
          </Button>
        </div>
        {error && <Text className="mt-2 text-red-400">{error}</Text>}
      </GlassPanel>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((card) => (
            <GlassPanel
              key={card.cardId}
              glow={card.cardId === bestCardId}
              className={card.cardId === bestCardId ? 'border-accent-500/40' : ''}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Text variant="overline" tone="secondary">
                    #{card.rank}
                    {card.cardId === bestCardId ? ' · Best pick' : ''}
                    {card.score !== undefined ? ` · score ${card.score.toFixed(2)}` : ''}
                  </Text>
                  <Heading as="h3" size="sm">
                    {labelById[card.cardId] ?? card.cardId}
                  </Heading>
                  <Text tone="secondary" className="mt-2">
                    {card.reasoning}
                  </Text>
                  {card.factors && card.factors.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.factors.map((f) => (
                        <span
                          key={f.label}
                          className="rounded-lg border border-glass-border bg-ink-900 px-2 py-1 text-xs text-[var(--color-text-secondary)]"
                          title={String(f.value)}
                        >
                          {f.label}: {f.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {card.estimatedReward && (
                  <Text className="shrink-0 text-lg text-accent-300">
                    +${(card.estimatedReward.amountMinor / 100).toFixed(2)}
                  </Text>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
