'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, Heading, Text } from '@stipulate/ui';

import { apiFetch } from '../../../lib/auth';

interface AuditEvent {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ events: AuditEvent[] }>('/org/audit')
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit log'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Text variant="overline" tone="secondary">
          Compliance
        </Text>
        <Heading as="h1" size="lg">
          Audit log
        </Heading>
        <Text tone="secondary" className="mt-2">
          Immutable record of API key and webhook changes for your organization.
        </Text>
      </div>

      {error && <Text tone="secondary">{error}</Text>}

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline">{event.action}</Badge>
                <Text className="mt-2 text-white">
                  {event.resource_type ?? 'org'} · {event.resource_id ?? '—'}
                </Text>
                {Object.keys(event.metadata).length > 0 && (
                  <Text variant="body-sm" tone="secondary" className="mt-1 font-mono">
                    {JSON.stringify(event.metadata)}
                  </Text>
                )}
              </div>
              <Text variant="caption" tone="tertiary">
                {new Date(event.created_at).toLocaleString()}
              </Text>
            </div>
          </Card>
        ))}
        {events.length === 0 && !error && (
          <Text tone="secondary">No audit events yet. Create an API key or webhook to populate the log.</Text>
        )}
      </div>
    </div>
  );
}
