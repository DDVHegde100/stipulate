'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, Heading, Input, Text } from '@stipulate/ui';

import { apiFetch } from '../../../lib/auth';

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
}

interface DeliveryRow {
  id: string;
  url: string;
  event_id: string;
  status: string;
  attempts: number;
  response_status: number | null;
  error_message: string | null;
  created_at: string;
}

export default function WebhooksPage() {
  const [tab, setTab] = useState<'subscriptions' | 'deliveries'>('subscriptions');
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<WebhookRow[]>('/webhooks');
    setRows(data);
  }

  async function loadDeliveries() {
    const data = await apiFetch<{ deliveries: DeliveryRow[] }>('/webhooks/deliveries');
    setDeliveries(data.deliveries);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
    void loadDeliveries().catch(() => {});
  }, []);

  async function createWebhook() {
    setError(null);
    const result = await apiFetch<{ secret: string }>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events: ['benefit.version_published'] }),
    });
    setSecret(result.secret);
    setUrl('');
    await load();
    await loadDeliveries();
  }

  async function revoke(id: string) {
    await apiFetch(`/webhooks/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <Heading as="h1" size="lg">
          Webhooks
        </Heading>
        <div className="flex rounded-xl border border-glass-border p-1">
          <button
            type="button"
            onClick={() => setTab('subscriptions')}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'subscriptions' ? 'bg-glass-surface text-white' : 'text-[var(--color-text-secondary)]'}`}
          >
            Subscriptions
          </button>
          <button
            type="button"
            onClick={() => setTab('deliveries')}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'deliveries' ? 'bg-glass-surface text-white' : 'text-[var(--color-text-secondary)]'}`}
          >
            Delivery log
          </button>
        </div>
      </div>

      {tab === 'subscriptions' ? (
        <>
          <Card className="space-y-4 p-6">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks/stipulate" />
            <Button onClick={() => void createWebhook()} disabled={!url}>
              Add webhook
            </Button>
            {secret && (
              <Text variant="body-sm" tone="secondary">
                Signing secret (save now): <span className="font-mono text-emerald-300">{secret}</span>
              </Text>
            )}
            {error && <Text tone="secondary">{error}</Text>}
          </Card>

          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="break-all text-white">{row.url}</p>
                  <Text variant="body-sm" tone="secondary">
                    {row.events.join(', ')} · {row.is_active ? 'active' : 'revoked'}
                  </Text>
                </div>
                {row.is_active && (
                  <Button variant="secondary" size="sm" onClick={() => void revoke(row.id)}>
                    Revoke
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {deliveries.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="break-all text-white">{row.url}</p>
                  <Text variant="body-sm" tone="secondary" className="mt-1">
                    {row.event_id} · {row.attempts} attempt{row.attempts !== 1 ? 's' : ''}
                  </Text>
                  <Text variant="caption" tone="tertiary" className="mt-1">
                    {new Date(row.created_at).toLocaleString()}
                  </Text>
                </div>
                <Badge variant={row.status === 'delivered' ? 'success' : row.status === 'failed' ? 'warning' : 'default'}>
                  {row.status}
                  {row.response_status ? ` · ${row.response_status}` : ''}
                </Badge>
              </div>
              {row.error_message && (
                <Text variant="body-sm" tone="secondary" className="mt-2">
                  {row.error_message}
                </Text>
              )}
            </Card>
          ))}
          {deliveries.length === 0 && <Text tone="secondary">No deliveries yet.</Text>}
        </div>
      )}
    </div>
  );
}
