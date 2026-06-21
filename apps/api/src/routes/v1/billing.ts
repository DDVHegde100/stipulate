import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionSummary,
} from '../../services/stripe.service.js';
import { getFeatureFlags } from '../../lib/feature-flags.js';
import { VaultPaymentMethodSchema } from '@stipulate/schema';
import * as pmRepo from '../../repositories/payment-method.repository.js';

const CheckoutSchema = z.object({
  plan: z.enum(['payg', 'saas']).default('payg'),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

export const billingHandler = new Hono<AppBindings>();

billingHandler.get('/subscription', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const summary = await getSubscriptionSummary(orgId);
  return c.json({
    data: summary ?? { plan: c.get('orgPlan') ?? 'free', status: 'active' },
    requestId: c.get('requestId'),
  });
});

billingHandler.post('/checkout', async (c) => {
  if (!getFeatureFlags().stripeBilling) {
    throw new HTTPException(503, { message: 'Billing is not configured' });
  }

  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') }, 422);
  }

  const session = await createCheckoutSession({
    orgId,
    orgSlug: orgId,
    orgName: orgId,
    plan: parsed.data.plan,
    successUrl: parsed.data.success_url,
    cancelUrl: parsed.data.cancel_url,
  });

  return c.json({ data: session, requestId: c.get('requestId') });
});

billingHandler.post('/portal', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const returnUrl = c.req.query('return_url') ?? 'https://stipulate.io/dashboard/billing';
  const session = await createPortalSession(orgId, returnUrl);
  return c.json({ data: session, requestId: c.get('requestId') });
});

billingHandler.get('/payment-methods', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const methods = await pmRepo.listOrgPaymentMethods(orgId);
  return c.json({
    data: {
      paymentMethods: methods.map((method) => ({
        id: method.id,
        paymentMethodId: method.stripe_payment_method_id,
        label: method.label,
        network: method.network,
        last4: method.last4,
        isDefault: method.is_default,
        consentGivenAt: method.consent_given_at.toISOString(),
      })),
    },
    requestId: c.get('requestId'),
  });
});

billingHandler.post('/payment-methods', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = VaultPaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const method = await pmRepo.addOrgPaymentMethod({
    orgId,
    stripePaymentMethodId: parsed.data.paymentMethodId,
    label: parsed.data.label,
    network: parsed.data.network,
    last4: parsed.data.last4,
    setDefault: parsed.data.setDefault,
  });

  return c.json(
    {
      data: {
        id: method.id,
        paymentMethodId: method.stripe_payment_method_id,
        label: method.label,
        network: method.network,
        last4: method.last4,
        isDefault: method.is_default,
        consentGivenAt: method.consent_given_at.toISOString(),
      },
      requestId: c.get('requestId'),
    },
    201,
  );
});

billingHandler.delete('/payment-methods/:id', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const methodId = c.req.param('id');
  const removed = await pmRepo.removeOrgPaymentMethod(orgId, methodId);
  if (!removed) throw new HTTPException(404, { message: 'Payment method not found' });

  return c.json({ data: { removed: true }, requestId: c.get('requestId') });
});
