'use client';

import { useEffect, useState } from 'react';
import { Badge, GlassPanel, Heading, Text } from '@stipulate/ui';

import { demoApiFetch } from '../../../lib/demo-api';
import { getWalletCards } from '../../../lib/wallet';
import { PremiumGate } from '../../../components/PremiumGate';

interface ChangelogEntry {
  id: string;
  card_id: string;
  card_name?: string;
  version: number;
  previous_version?: number;
  change_summary: string;
  severity: string;
  published_at: string;
  changes: Array<{ field?: string; old_value?: unknown; new_value?: unknown }>;
}

export default function AlertsPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [selected, setSelected] = useState<ChangelogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wallet = getWalletCards();
    const cardId = wallet[0]?.cardId;

    void demoApiFetch<{ entries: ChangelogEntry[]; has_more: boolean }>(
      `/changelog?limit=20${cardId ? `&card_id=${cardId}` : ''}`,
    )
      .then((data) => setEntries(data.entries ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load alerts'));
  }, []);

  return (
    <PremiumGate feature="Benefit change alerts">
    <div className="space-y-8">
      <div>
        <Text variant="overline" tone="secondary">
          Benefit alerts
        </Text>
        <Heading as="h1" size="lg">
          What changed on your cards
        </Heading>
      </div>

      {error && <Text tone="secondary">{error}</Text>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelected(entry)}
              className="w-full text-left"
            >
              <GlassPanel
                hover
                className={selected?.id === entry.id ? 'border-accent-500/40' : ''}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant={entry.severity === 'material' ? 'warning' : 'default'}>
                      {entry.severity}
                    </Badge>
                    <Heading as="h3" size="sm" className="mt-2">
                      {entry.card_name ?? entry.card_id}
                    </Heading>
                    <Text tone="secondary" className="mt-1">
                      {entry.change_summary}
                    </Text>
                    <Text variant="caption" tone="tertiary" className="mt-2">
                      v{entry.previous_version ?? '?'} → v{entry.version} ·{' '}
                      {new Date(entry.published_at).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
              </GlassPanel>
            </button>
          ))}
          {entries.length === 0 && !error && (
            <GlassPanel>
              <Text tone="secondary">No benefit changes for your wallet cards yet.</Text>
            </GlassPanel>
          )}
        </div>

        <GlassPanel className="min-h-[280px]">
          {selected ? (
            <div className="space-y-4">
              <Heading as="h2" size="sm">
                Diff · {selected.card_name ?? selected.card_id}
              </Heading>
              <div className="rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-xs">
                <p className="text-red-300/80">
                  - version {selected.previous_version ?? 'unknown'}
                </p>
                <p className="text-emerald-300/80">+ version {selected.version}</p>
                <p className="mt-3 text-[var(--color-text-secondary)]">{selected.change_summary}</p>
              </div>
              {selected.changes.length > 0 && (
                <ul className="space-y-2">
                  {selected.changes.map((change, i) => (
                    <li key={i} className="text-sm text-[var(--color-text-secondary)]">
                      {change.field}: {JSON.stringify(change.old_value)} →{' '}
                      {JSON.stringify(change.new_value)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <Text tone="secondary">Select an alert to view the diff.</Text>
          )}
        </GlassPanel>
      </div>
    </div>
    </PremiumGate>
  );
}
