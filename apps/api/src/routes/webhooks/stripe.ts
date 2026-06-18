import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { handleStripeWebhookEvent } from '../../services/stripe.service.js';

export const stripeWebhookHandler = new Hono();

stripeWebhookHandler.post('/', async (c) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await c.req.text();

  if (secret && process.env.NODE_ENV !== 'test') {
    const signature = c.req.header('stripe-signature') ?? '';
    const valid = verifyStripeSignature(rawBody, signature, secret);
    if (!valid) {
      return c.json({ error: 'Invalid signature' }, 400);
    }
  }

  const event = JSON.parse(rawBody) as {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };

  await handleStripeWebhookEvent(event);
  return c.json({ received: true });
});

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signed = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signed), Buffer.from(signature));
  } catch {
    return false;
  }
}
