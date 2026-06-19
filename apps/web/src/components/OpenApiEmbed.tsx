'use client';

import { useEffect, useState } from 'react';
import { GlassPanel, Heading, Text } from '@stipulate/ui';

import { apiV1Base } from '../lib/demo-api';

interface OpenApiSpec {
  info?: { title?: string; version?: string; description?: string };
  paths?: Record<string, Record<string, { summary?: string; description?: string }>>;
}

export function OpenApiEmbed() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${apiV1Base()}/openapi/json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<OpenApiSpec>;
      })
      .then(setSpec)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load spec'));
  }, []);

  if (error) {
    return (
      <GlassPanel>
        <Text tone="secondary">Could not load OpenAPI spec: {error}</Text>
      </GlassPanel>
    );
  }

  if (!spec) {
    return (
      <GlassPanel>
        <Text tone="secondary">Loading API reference…</Text>
      </GlassPanel>
    );
  }

  const paths = Object.entries(spec.paths ?? {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <GlassPanel>
        <Heading as="h2" size="sm">
          {spec.info?.title ?? 'Stipulate API'}
        </Heading>
        <Text tone="secondary" className="mt-2">
          {spec.info?.description}
        </Text>
        <Text variant="caption" tone="tertiary" className="mt-2 block">
          Version {spec.info?.version ?? '1'}
        </Text>
      </GlassPanel>

      <div className="space-y-3">
        {paths.map(([path, methods]) =>
          Object.entries(methods).map(([method, op]) => (
            <GlassPanel key={`${method}-${path}`}>
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-accent-500/20 px-2 py-0.5 font-mono text-xs uppercase text-accent-300">
                  {method}
                </span>
                <span className="font-mono text-sm text-white">{path}</span>
              </div>
              {(op.summary || op.description) && (
                <Text variant="body-sm" tone="secondary" className="mt-2">
                  {op.summary ?? op.description}
                </Text>
              )}
            </GlassPanel>
          )),
        )}
      </div>
    </div>
  );
}
