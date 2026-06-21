import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';
import { findConsumerSubscription } from '../repositories/consumer-billing.repository.js';
import { handleStripeWebhookEvent } from '../services/stripe.service.js';

describe('consumer billing API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.STRIPE_SECRET_KEY = 'sk_test_consumer_billing_key';
  });

  it('POST /public/billing/checkout returns test session when Stripe configured', async () => {
    const app = createApp();
    const login = await app.request('/public/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@stipulate.io',
        password: 'demo-password-123',
      }),
    });
    const cookie = login.headers.get('Set-Cookie') ?? '';

    const response = await app.request('/public/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie.split(';')[0] ?? '',
      },
      body: JSON.stringify({
        successUrl: 'https://stipulate.io/app/settings?billing=success',
        cancelUrl: 'https://stipulate.io/app/settings?billing=cancel',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.url).toContain('checkout.stripe.com');
  });

  it('GET /public/billing/status returns free plan by default', async () => {
    const app = createApp();
    const login = await app.request('/public/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@stipulate.io',
        password: 'demo-password-123',
      }),
    });
    const cookie = login.headers.get('Set-Cookie') ?? '';

    const response = await app.request('/public/billing/status', {
      headers: { Cookie: cookie.split(';')[0] ?? '' },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.plan).toBe('free');
    expect(body.data.isPremium).toBe(false);
  });

  it('checkout webhook persists consumer premium subscription', async () => {
    await handleStripeWebhookEvent({
      id: 'evt_consumer_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_consumer_test',
          subscription: 'sub_consumer_test',
          metadata: {
            consumer_user_id: '00000000-0000-4000-8000-000000000001',
            plan: 'consumer_premium',
          },
        },
      },
    });

    const subscription = await findConsumerSubscription('00000000-0000-4000-8000-000000000001');
    expect(subscription?.subscription_plan).toBe('consumer_premium');
    expect(subscription?.subscription_status).toBe('active');
  });

  it('subscription deleted webhook downgrades consumer plan', async () => {
    await handleStripeWebhookEvent({
      id: 'evt_consumer_checkout_2',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_consumer_cancel',
          subscription: 'sub_consumer_cancel',
          metadata: {
            consumer_user_id: '00000000-0000-4000-8000-000000000001',
            plan: 'consumer_premium',
          },
        },
      },
    });

    await handleStripeWebhookEvent({
      id: 'evt_consumer_deleted_1',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_consumer_cancel' } },
    });

    const subscription = await findConsumerSubscription('00000000-0000-4000-8000-000000000001');
    expect(subscription?.subscription_plan).toBe('free');
    expect(subscription?.subscription_status).toBe('canceled');
  });

  it('POST /public/billing/portal returns portal url for subscribed customer', async () => {
    await handleStripeWebhookEvent({
      id: 'evt_consumer_portal_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_consumer_portal',
          subscription: 'sub_consumer_portal',
          metadata: {
            consumer_user_id: '00000000-0000-4000-8000-000000000001',
            plan: 'consumer_premium',
          },
        },
      },
    });

    const app = createApp();
    const login = await app.request('/public/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@stipulate.io',
        password: 'demo-password-123',
      }),
    });
    const cookie = login.headers.get('Set-Cookie') ?? '';

    const response = await app.request('/public/billing/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie.split(';')[0] ?? '',
      },
      body: JSON.stringify({
        returnUrl: 'https://stipulate.io/app/settings',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.url).toContain('billing.stripe.com');
  });
});
