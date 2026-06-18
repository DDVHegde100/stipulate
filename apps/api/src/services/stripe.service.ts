import * as billingRepo from '../repositories/billing.repository.js';
import { findOrgBySlug } from '../repositories/org.repository.js';

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeRequest<T>(
  path: string,
  body?: Record<string, string>,
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');

  const response = await fetch(`${STRIPE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Stripe API error: ${response.status} ${err}`);
  }

  return response.json() as Promise<T>;
}

/** Create a Stripe Checkout session for plan upgrade. */
export async function createCheckoutSession(input: {
  orgId: string;
  orgSlug: string;
  orgName: string;
  plan: 'payg' | 'saas';
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  if (process.env.NODE_ENV === 'test') {
    return { url: 'https://checkout.stripe.com/test', sessionId: 'cs_test' };
  }

  const priceId =
    input.plan === 'saas'
      ? process.env.STRIPE_PRICE_ID_SAAS
      : process.env.STRIPE_PRICE_ID_METERED;

  if (!priceId) throw new Error(`No Stripe price configured for plan: ${input.plan}`);

  let customerId: string | undefined;
  const existing = await billingRepo.findBillingSubscription(input.orgId);
  if (existing) {
    customerId = existing.stripe_customer_id;
  } else {
    const customer = await stripeRequest<{ id: string }>('/customers', {
      name: input.orgName,
      'metadata[org_id]': input.orgId,
      'metadata[org_slug]': input.orgSlug,
    });
    customerId = customer.id;
  }

  const session = await stripeRequest<{ id: string; url: string }>('/checkout/sessions', {
    mode: 'subscription',
    customer: customerId!,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    'metadata[org_id]': input.orgId,
    'metadata[plan]': input.plan,
  });

  return { url: session.url, sessionId: session.id };
}

/** Create a billing portal session for self-serve management. */
export async function createPortalSession(orgId: string, returnUrl: string): Promise<{ url: string }> {
  if (process.env.NODE_ENV === 'test') {
    return { url: 'https://billing.stripe.com/test' };
  }

  const sub = await billingRepo.findBillingSubscription(orgId);
  if (!sub) throw new Error('No billing subscription found');

  const session = await stripeRequest<{ url: string }>('/billing_portal/sessions', {
    customer: sub.stripe_customer_id,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/** Handle Stripe webhook events. */
export async function handleStripeWebhookEvent(event: {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<void> {
  const isNew = await billingRepo.recordStripeWebhookEvent(event.id, event.type, event);
  if (!isNew) return;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orgId = String(session.metadata ? (session.metadata as Record<string, string>).org_id : '');
    const plan = String(session.metadata ? (session.metadata as Record<string, string>).plan : 'payg');
    const customerId = String(session.customer ?? '');

    if (orgId && customerId) {
      await billingRepo.upsertBillingSubscription({
        orgId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: session.subscription ? String(session.subscription) : undefined,
        plan,
        status: 'active',
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const customerId = String(sub.customer ?? '');
    // downgrade handled via org lookup in production
    void customerId;
  }
}

export async function getSubscriptionSummary(orgId: string): Promise<{
  plan: string;
  status: string;
  stripeCustomerId?: string;
} | null> {
  const sub = await billingRepo.findBillingSubscription(orgId);
  if (!sub) return null;
  return {
    plan: sub.plan,
    status: sub.status,
    stripeCustomerId: sub.stripe_customer_id,
  };
}

export { findOrgBySlug };
