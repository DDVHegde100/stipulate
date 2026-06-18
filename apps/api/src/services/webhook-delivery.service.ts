import type { BenefitWebhookPayload } from '@stipulate/schema';
import {
  fetchPendingDeliveries,
  signWebhookPayload,
  updateDeliveryStatus,
} from '../repositories/webhook.repository.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger({ component: 'webhook-delivery' });

const MAX_ATTEMPTS = 5;

/** Deliver a single webhook with HMAC signature. */
export async function deliverWebhook(
  url: string,
  payload: BenefitWebhookPayload,
  secret: string,
): Promise<{ ok: boolean; status: number }> {
  const body = JSON.stringify(payload);
  const signature = signWebhookPayload(body, secret);
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Stipulate-Signature': signature,
      'X-Stipulate-Timestamp': String(timestamp),
      'User-Agent': 'Stipulate-Webhooks/1.0',
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  return { ok: response.ok, status: response.status };
}

/** Process pending webhook delivery queue. */
export async function processWebhookQueue(options: {
  secretResolver?: (hash: string) => string | undefined;
  limit?: number;
} = {}): Promise<{ processed: number; delivered: number; failed: number }> {
  const deliveries = await fetchPendingDeliveries(options.limit ?? 50);
  let delivered = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    try {
      const secret = delivery.secret_hash
        ? options.secretResolver?.(delivery.secret_hash)
        : process.env.WEBHOOK_DEV_SECRET;

      if (!secret) {
        await updateDeliveryStatus(delivery.id, 'failed', undefined, 'No signing secret');
        failed++;
        continue;
      }

      const payload = delivery.payload as BenefitWebhookPayload;
      const result = await deliverWebhook(delivery.url, payload, secret);

      if (result.ok) {
        await updateDeliveryStatus(delivery.id, 'delivered', result.status);
        delivered++;
      } else {
        await updateDeliveryStatus(delivery.id, 'failed', result.status, `HTTP ${result.status}`);
        failed++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateDeliveryStatus(delivery.id, 'failed', undefined, message);
      failed++;
      log.warn({ deliveryId: delivery.id, err: message }, 'Webhook delivery failed');
    }
  }

  return { processed: deliveries.length, delivered, failed };
}

/** Compute exponential backoff delay for retry attempt. */
export function retryDelayMs(attempt: number): number {
  return Math.min(60_000 * Math.pow(2, attempt), 3_600_000);
}

export { MAX_ATTEMPTS };
