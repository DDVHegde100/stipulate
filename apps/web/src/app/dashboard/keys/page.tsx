'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Heading, Input, Text } from '@stipulate/ui';

import { apiFetch } from '../../../lib/auth';

interface ApiKeyRow {
  id: string;
  prefix: string;
  name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState('production');
  const [error, setError] = useState<string | null>(null);

  async function loadKeys() {
    const rows = await apiFetch<ApiKeyRow[]>('/keys');
    setKeys(rows);
  }

  useEffect(() => {
    void loadKeys().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load keys'));
  }, []);

  async function createKey() {
    setError(null);
    setNewKey(null);
    const result = await apiFetch<{ apiKey: string }>('/keys', {
      method: 'POST',
      body: JSON.stringify({ name, scopes: ['route:read', 'enrich:read', 'webhooks:write'] }),
    });
    setNewKey(result.apiKey);
    await loadKeys();
  }

  async function revoke(id: string) {
    await apiFetch(`/keys/${id}`, { method: 'DELETE' });
    await loadKeys();
  }

  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        API keys
      </Heading>

      <Card className="p-6 space-y-4">
        <Text tone="secondary">Create and revoke organization API keys.</Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" />
          <Button onClick={() => void createKey()}>Create key</Button>
        </div>
        {newKey && (
          <div className="rounded-lg bg-ink-900 p-4 font-mono text-xs text-emerald-300 break-all">
            {newKey}
          </div>
        )}
        {error && <Text tone="secondary">{error}</Text>}
      </Card>

      <div className="space-y-3">
        {keys.map((key) => (
          <Card key={key.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-white">{key.name}</p>
              <Text variant="body-sm" tone="secondary">
                {key.prefix}… · {key.is_active ? 'active' : 'revoked'}
              </Text>
            </div>
            {key.is_active && (
              <Button variant="secondary" size="sm" onClick={() => void revoke(key.id)}>
                Revoke
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
