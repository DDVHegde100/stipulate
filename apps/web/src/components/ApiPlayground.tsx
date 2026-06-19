'use client';

import { useState } from 'react';
import { Badge, Button, Card, Text } from '@stipulate/ui';

import { apiBaseUrl, apiFetch, getStoredApiKey } from '../lib/auth';

const ENDPOINTS = [
  {
    id: 'route',
    label: 'POST /v1/route',
    path: '/route',
    sample: {
      merchantName: 'Starbucks',
      mcc: '5814',
      amount: { amountMinor: 650, currency: 'USD' },
      userCardIds: ['chase_sapphire_preferred'],
    },
  },
  {
    id: 'batch',
    label: 'POST /v1/route/batch',
    path: '/route/batch',
    sample: {
      sharedUserCardIds: ['chase_sapphire_preferred', 'amex_gold'],
      requests: [
        {
          merchantName: 'Starbucks',
          mcc: '5814',
          amount: { amountMinor: 650, currency: 'USD' },
          userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
        },
        {
          merchantName: 'Whole Foods',
          mcc: '5411',
          amount: { amountMinor: 4500, currency: 'USD' },
          userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
        },
      ],
    },
  },
  {
    id: 'proxy-pay',
    label: 'POST /v1/proxy-pay',
    path: '/proxy-pay',
    sample: {
      merchantName: 'Starbucks',
      mcc: '5814',
      amount: { amountMinor: 650, currency: 'USD' },
      userCardIds: ['chase_sapphire_preferred'],
      paymentMethodToken: 'pm_card_visa',
    },
  },
  {
    id: 'enrich',
    label: 'POST /v1/enrich',
    path: '/enrich',
    sample: { merchantName: 'Whole Foods Market', mcc: '5411' },
  },
  {
    id: 'cards',
    label: 'GET /v1/cards',
    path: '/cards?limit=5',
    method: 'GET' as const,
    sample: null,
  },
  {
    id: 'changelog',
    label: 'GET /v1/changelog',
    path: '/changelog?limit=5',
    method: 'GET' as const,
    sample: null,
  },
  {
    id: 'usage',
    label: 'GET /v1/usage',
    path: '/usage',
    method: 'GET' as const,
    sample: null,
  },
] as const;

function buildCurl(endpoint: (typeof ENDPOINTS)[number], body: string): string {
  const apiKey = getStoredApiKey() ?? 'YOUR_API_KEY';
  const url = `${apiBaseUrl()}${endpoint.path}`;
  const method = 'method' in endpoint && endpoint.method === 'GET' ? 'GET' : 'POST';

  if (method === 'GET') {
    return `curl ${url} \\\n  -H "X-API-Key: ${decodeURIComponent(apiKey)}"`;
  }

  return `curl -X POST ${apiBaseUrl()}${endpoint.path.replace(/\?.*$/, '')} \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ${decodeURIComponent(apiKey)}" \\\n  -d '${body.replace(/\n/g, '').replace(/'/g, "'\\''")}'`;
}

export function ApiPlayground() {
  const [endpoint, setEndpoint] = useState<(typeof ENDPOINTS)[number]>(ENDPOINTS[0]);
  const [body, setBody] = useState(JSON.stringify(ENDPOINTS[0].sample, null, 2));
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  async function runRequest() {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const method = 'method' in endpoint && endpoint.method === 'GET' ? 'GET' : 'POST';
      const data =
        method === 'GET'
          ? await apiFetch<unknown>(endpoint.path)
          : await apiFetch<unknown>(endpoint.path.replace(/\?.*$/, ''), {
              method: 'POST',
              body,
            });
      setLatencyMs(Math.round(performance.now() - start));
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setLatencyMs(Math.round(performance.now() - start));
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function copyCurl() {
    await navigator.clipboard.writeText(buildCurl(endpoint, body));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Text variant="overline" tone="secondary">
            Endpoint
          </Text>
          {latencyMs !== null && (
            <Badge variant={latencyMs < 300 ? 'success' : 'warning'}>{latencyMs}ms</Badge>
          )}
        </div>
        <select
          className="w-full rounded-lg border border-glass-border bg-ink-900 px-3 py-2 text-sm text-white"
          value={endpoint.id}
          onChange={(e) => {
            const next = ENDPOINTS.find((item) => item.id === e.target.value) ?? ENDPOINTS[0];
            setEndpoint(next);
            setBody(next.sample ? JSON.stringify(next.sample, null, 2) : '');
            setLatencyMs(null);
          }}
        >
          {ENDPOINTS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        {endpoint.sample && (
          <>
            <Text variant="overline" tone="secondary">
              Request body
            </Text>
            <textarea
              className="min-h-[220px] w-full rounded-lg border border-glass-border bg-ink-900 p-3 font-mono text-xs text-white"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void runRequest()} disabled={loading}>
            {loading ? 'Running…' : 'Send request'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copyCurl()}>
            {copied ? 'Copied!' : 'Copy curl'}
          </Button>
        </div>
        {error && <Text tone="secondary">{error}</Text>}
      </Card>

      <Card className="p-6">
        <Text variant="overline" tone="secondary" className="mb-3 block">
          Response
        </Text>
        <pre className="min-h-[320px] overflow-auto rounded-lg bg-ink-900 p-4 text-xs text-emerald-300">
          {response || 'Run a request to see the response'}
        </pre>
      </Card>
    </div>
  );
}
