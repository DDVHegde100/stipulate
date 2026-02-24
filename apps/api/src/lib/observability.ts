import { randomUUID } from 'node:crypto';
import { createChildLogger } from './logger.js';

const log = createChildLogger({ component: 'observability' });

/** Capture an exception to Sentry via HTTP envelope (no SDK required). */
export async function captureException(error: unknown, context: Record<string, unknown> = {}): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV === 'test') {
    log.error({ err: error, ...context }, 'Unhandled error');
    return;
  }

  try {
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
    if (!match) return;

    const [, , host, projectId] = match;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const envelope = [
      JSON.stringify({ event_id: randomUUID().replace(/-/g, ''), sent_at: new Date().toISOString() }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify({
        exception: { values: [{ type: 'Error', value: message, stacktrace: stack ? { frames: [] } : undefined }] },
        level: 'error',
        tags: { service: '@stipulate/api' },
        extra: context,
      }),
    ].join('\n');

    await fetch(`https://${host}/api/${projectId}/envelope/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope', 'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${match[1]?.split(':')[0]}` },
      body: envelope,
    });
  } catch {
    log.error({ err: error }, 'Failed to report to Sentry');
  }
}

/** Track a product analytics event via PostHog HTTP API. */
export async function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
  distinctId = 'api-server',
): Promise<void> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST ?? 'https://app.posthog.com';
  if (!apiKey || process.env.NODE_ENV === 'test') return;

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, event, properties, distinct_id: distinctId }),
    });
  } catch {
    // analytics failures are non-fatal
  }
}
