'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Heading, Input, Text } from '@stipulate/ui';

import { apiFetch } from '../../../lib/auth';

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
}

export default function WebhooksPage() {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<WebhookRow[]>('/webhooks');
    setRows(data);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
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
  }

  async function revoke(id: string) {
    await apiFetch(`/webhooks/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        Webhooks
      </Heading>

      <Card className="p-6 space-y-4">
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
              <p className="text-white break-all">{row.url}</p>
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
    </div>
  );
}
