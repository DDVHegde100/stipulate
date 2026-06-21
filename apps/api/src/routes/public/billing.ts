import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import { resolveConsumerUserId } from '../../lib/consumer-context.js';
import { getFeatureFlags } from '../../lib/feature-flags.js';
import { createConsumerCheckoutSession, createConsumerPortalSession } from '../../services/stripe.service.js';
import { findConsumerSubscription } from '../../repositories/consumer-billing.repository.js';

const CheckoutSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const PortalSchema = z.object({
  returnUrl: z.string().url(),
});

export const consumerBillingHandler = new Hono<AppBindings>();

consumerBillingHandler.post('/checkout', async (c) => {
  if (!getFeatureFlags().stripeBilling) {
    throw new HTTPException(503, { message: 'Billing is not configured' });
  }

  const userId = await resolveConsumerUserId(c);
  if (!userId) throw new HTTPException(401, { message: 'Authentication required' });

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const session = await createConsumerCheckoutSession({
    consumerUserId: userId,
    successUrl: parsed.data.successUrl,
    cancelUrl: parsed.data.cancelUrl,
  });

  return c.json({ data: session, requestId: c.get('requestId') });
});

consumerBillingHandler.get('/status', async (c) => {
  const userId = await resolveConsumerUserId(c);
  if (!userId) throw new HTTPException(401, { message: 'Authentication required' });

  const subscription = await findConsumerSubscription(userId);
  const plan = subscription?.subscription_plan ?? 'free';
  const status = subscription?.subscription_status ?? 'inactive';

  return c.json({
    data: {
      plan,
      status,
      isPremium: plan === 'consumer_premium' && status === 'active',
    },
    requestId: c.get('requestId'),
  });
});

consumerBillingHandler.post('/portal', async (c) => {
  if (!getFeatureFlags().stripeBilling) {
    throw new HTTPException(503, { message: 'Billing is not configured' });
  }

  const userId = await resolveConsumerUserId(c);
  if (!userId) throw new HTTPException(401, { message: 'Authentication required' });

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = PortalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const subscription = await findConsumerSubscription(userId);
  if (!subscription?.stripe_customer_id) {
    throw new HTTPException(404, { message: 'No active billing customer found' });
  }

  const session = await createConsumerPortalSession({
    consumerUserId: userId,
    returnUrl: parsed.data.returnUrl,
  });

  return c.json({ data: session, requestId: c.get('requestId') });
});
