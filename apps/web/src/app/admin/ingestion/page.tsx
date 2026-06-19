'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Heading, Input, Text } from '@stipulate/ui';

import { adminFetch, getStoredAdminKey, storeAdminKey } from '../../../lib/admin-api';

interface IngestionJob {
  id: string;
  card_id: string;
  status: string;
  source_url: string;
}

export default function AdminIngestionPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    setError(null);
    try {
      const data = await adminFetch<{ jobs: IngestionJob[] }>('/admin/ingestion/jobs?limit=25');
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    }
  }

  useEffect(() => {
    if (getStoredAdminKey()) void loadJobs();
  }, []);

  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        Ingestion queue
      </Heading>

      {!getStoredAdminKey() && (
        <Card className="p-6 space-y-3">
          <Text tone="secondary">Enter admin API key to manage ingestion jobs.</Text>
          <Input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Admin key" />
          <Button
            onClick={() => {
              storeAdminKey(adminKey);
              void loadJobs();
            }}
          >
            Unlock admin
          </Button>
        </Card>
      )}

      {error && <Text tone="secondary">{error}</Text>}

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id} className="p-4">
            <p className="font-mono text-sm text-white">{job.card_id}</p>
            <Text variant="body-sm" tone="secondary">
              {job.status} · {job.source_url}
            </Text>
          </Card>
        ))}
      </div>
    </div>
  );
}
