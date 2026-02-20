import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { query } from '../lib/db.js';

export interface WebhookSubscriptionRow {
  id: string;
  org_id: string;
  url: string;
  events: string[];
  is_active: boolean;
}

export interface WebhookDeliveryRow {
  id: string;
  subscription_id: string;
  event_id: string;
  status: string;
  attempts: number;
  next_retry_at: Date | null;
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function findSubscriptionsForEvent(
  orgId: string,
  eventType: string,
): Promise<WebhookSubscriptionRow[]> {
  const result = await query<WebhookSubscriptionRow & { events: unknown }>(
    `SELECT id, org_id, url, events, is_active
     FROM webhook_subscriptions
     WHERE org_id = $1::uuid AND is_active = TRUE`,
    [orgId],
  );

  return result.rows.filter((row) => {
    const events = Array.isArray(row.events) ? row.events : JSON.parse(String(row.events ?? '[]'));
    return events.includes(eventType) || events.includes('*');
  });
}

export async function queueWebhookDelivery(input: {
  subscriptionId: string;
  eventId?: string;
  payload: unknown;
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO webhook_deliveries (subscription_id, event_id, payload, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id`,
    [input.subscriptionId, input.eventId ?? randomUUID(), JSON.stringify(input.payload)],
  );
  return result.rows[0]!.id;
}

export async function fetchPendingDeliveries(limit = 50): Promise<
  Array<WebhookDeliveryRow & { url: string; secret_hash: string; payload: unknown }>
> {
  const result = await query<
    WebhookDeliveryRow & { url: string; secret_hash: string; payload: unknown }
  >(
    `SELECT wd.id, wd.subscription_id, wd.event_id, wd.status, wd.attempts, wd.next_retry_at,
            ws.url, ws.secret_hash, wd.payload
     FROM webhook_deliveries wd
     JOIN webhook_subscriptions ws ON ws.id = wd.subscription_id
     WHERE wd.status IN ('pending', 'failed')
       AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= NOW())
       AND wd.attempts < 5
     ORDER BY wd.created_at ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: 'delivered' | 'failed',
  httpStatus?: number,
  error?: string,
): Promise<void> {
  const nextRetry =
    status === 'failed'
      ? new Date(Date.now() + 60_000 * Math.pow(2, 2)).toISOString()
      : null;

  await query(
    `UPDATE webhook_deliveries
     SET status = $2, response_status = $3, error_message = $4,
         attempts = attempts + 1, last_attempt_at = NOW(),
         next_retry_at = $5::timestamptz
     WHERE id = $1`,
    [deliveryId, status, httpStatus ?? null, error ?? null, nextRetry],
  );
}

export async function createWebhookSubscription(input: {
  orgId: string;
  url: string;
  events: string[];
  secret: string;
}): Promise<{ id: string; secret: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO webhook_subscriptions (org_id, url, events, secret_hash, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    [input.orgId, input.url, JSON.stringify(input.events), hashSecret(input.secret)],
  );
  return { id: result.rows[0]!.id, secret: input.secret };
}

export async function listWebhookSubscriptions(orgId: string): Promise<
  Array<{ id: string; url: string; events: string[]; is_active: boolean; created_at: string }>
> {
  const result = await query<{
    id: string;
    url: string;
    events: unknown;
    is_active: boolean;
    created_at: string;
  }>(
    `SELECT id, url, events, is_active, created_at::text
     FROM webhook_subscriptions
     WHERE org_id = $1::uuid
     ORDER BY created_at DESC`,
    [orgId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    url: row.url,
    events: Array.isArray(row.events) ? (row.events as string[]) : JSON.parse(String(row.events)),
    is_active: row.is_active,
    created_at: row.created_at,
  }));
}

/** All active subscriptions listening for an event type. */
export async function listActiveSubscriptionsForEvent(
  eventType: string,
): Promise<Array<{ id: string; org_id: string; url: string }>> {
  const result = await query<{ id: string; org_id: string; url: string; events: unknown }>(
    `SELECT id, org_id, url, events FROM webhook_subscriptions WHERE is_active = TRUE`,
  );

  return result.rows.filter((row) => {
    const events = Array.isArray(row.events) ? row.events : JSON.parse(String(row.events ?? '[]'));
    return events.includes(eventType) || events.includes('*');
  });
}
