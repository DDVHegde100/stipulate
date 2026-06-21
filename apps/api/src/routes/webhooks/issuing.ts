import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { timingSafeEqual } from 'node:crypto';

import { PhysicalCardShippingWebhookSchema } from '@stipulate/schema';
import * as issuingRepo from '../../repositories/issuing.repository.js';

export const issuingShippingWebhookHandler = new Hono();

issuingShippingWebhookHandler.post('/', async (c) => {
  const secret = process.env.ISSUING_WEBHOOK_SECRET;
  if (secret && process.env.NODE_ENV !== 'test') {
    const provided = c.req.header('x-issuing-webhook-secret') ?? '';
    if (!timingSafeEqualSecret(provided, secret)) {
      throw new HTTPException(401, { message: 'Invalid webhook secret' });
    }
  }

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = PhysicalCardShippingWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, 422);
  }

  const order = await issuingRepo.updatePhysicalCardOrderStatus({
    orderId: parsed.data.orderId,
    status: parsed.data.status,
    trackingNumber: parsed.data.trackingNumber,
  });

  if (!order) throw new HTTPException(404, { message: 'Physical card order not found' });

  return c.json({
    data: {
      id: order.id,
      cardholderId: order.cardholder_id,
      status: order.status,
      trackingNumber: order.tracking_number,
      updatedAt: new Date().toISOString(),
    },
  });
});

function timingSafeEqualSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
