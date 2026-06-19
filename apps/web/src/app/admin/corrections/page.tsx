'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Heading, Text } from '@stipulate/ui';

import { adminFetch, getStoredAdminKey } from '../../../lib/admin-api';

interface Correction {
  id: string;
  merchant_name: string;
  proposed_mcc: string;
  status: string;
}

export default function AdminCorrectionsPage() {
  const [rows, setRows] = useState<Correction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredAdminKey()) return;
    void adminFetch<{ corrections: Correction[] }>('/admin/corrections')
      .then((data) => setRows(data.corrections))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  async function approve(id: string) {
    await adminFetch(`/admin/corrections/${id}/approve`, { method: 'POST', body: '{}' });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        MCC corrections
      </Heading>
      {error && <Text tone="secondary">{error}</Text>}
      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-white">{row.merchant_name}</p>
              <Text variant="body-sm" tone="secondary">
                MCC {row.proposed_mcc} · {row.status}
              </Text>
            </div>
            <Button size="sm" onClick={() => void approve(row.id)}>
              Approve
            </Button>
          </Card>
        ))}
        {rows.length === 0 && <Text tone="secondary">No pending corrections.</Text>}
      </div>
    </div>
  );
}
