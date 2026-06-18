'use client';

import { useState } from 'react';
import { Button, Card, Text } from '@stipulate/ui';

import { apiFetch } from '../lib/auth';

const ENDPOINTS = [
  { id: 'route', label: 'POST /v1/route', path: '/route', sample: { merchantName: 'Starbucks', mcc: '5814', amount: { amountMinor: 650, currency: 'USD' }, userCardIds: ['chase_sapphire_preferred'] } },
  { id: 'enrich', label: 'POST /v1/enrich', path: '/enrich', sample: { merchantName: 'Whole Foods Market', mcc: '5411' } },
  { id: 'cards', label: 'GET /v1/cards', path: '/cards?limit=5', method: 'GET' as const, sample: null },
] as const;

export function ApiPlayground() {
  const [endpoint, setEndpoint] = useState<(typeof ENDPOINTS)[number]>(ENDPOINTS[0]);
  const [body, setBody] = useState(JSON.stringify(ENDPOINTS[0].sample, null, 2));
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runRequest() {
    setLoading(true);
    setError(null);
    try {
      const method = 'method' in endpoint && endpoint.method === 'GET' ? 'GET' : 'POST';
      const data =
        method === 'GET'
          ? await apiFetch<unknown>(endpoint.path)
          : await apiFetch<unknown>(endpoint.path.replace(/\?.*$/, ''), {
              method: 'POST',
              body,
            });
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 space-y-4">
        <Text variant="overline" tone="secondary">
          Endpoint
        </Text>
        <select
          className="w-full rounded-lg border border-glass-border bg-ink-900 px-3 py-2 text-sm text-white"
          value={endpoint.id}
          onChange={(e) => {
            const next = ENDPOINTS.find((item) => item.id === e.target.value) ?? ENDPOINTS[0];
            setEndpoint(next);
            setBody(next.sample ? JSON.stringify(next.sample, null, 2) : '');
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

        <Button onClick={() => void runRequest()} disabled={loading}>
          {loading ? 'Running…' : 'Send request'}
        </Button>
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
