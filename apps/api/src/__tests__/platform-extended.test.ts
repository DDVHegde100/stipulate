import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { getFeatureFlags } from '../lib/feature-flags.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('feature flags', () => {
  beforeEach(() => {
    resetEnvCache();
    delete process.env.FEATURE_RECEIPT_OCR;
    delete process.env.FEATURE_PROXY_PAY;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('defaults receipt OCR and webhooks on, proxy pay off', () => {
    const flags = getFeatureFlags();
    expect(flags.receiptOcr).toBe(true);
    expect(flags.benefitWebhooks).toBe(true);
    expect(flags.proxyPay).toBe(false);
    expect(flags.stripeBilling).toBe(false);
  });

  it('enables proxy pay when env flag set', () => {
    process.env.FEATURE_PROXY_PAY = 'true';
    resetEnvCache();
    expect(getFeatureFlags().proxyPay).toBe(true);
  });
});

describe('billing API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('GET /v1/billing/subscription returns plan summary', async () => {
    const app = createApp();
    const response = await app.request('/v1/billing/subscription', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.plan).toBeDefined();
  });

  it('POST /v1/billing/checkout returns test session without Stripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_PRICE_ID_METERED = 'price_test';
    resetEnvCache();

    const app = createApp();
    const response = await app.request('/v1/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({
        plan: 'payg',
        success_url: 'https://stipulate.io/success',
        cancel_url: 'https://stipulate.io/cancel',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.url).toContain('stripe.com');
  });
});

describe('proxy pay API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.API_KEY;
    process.env.FEATURE_PROXY_PAY = 'true';
  });

  it('POST /v1/proxy-pay returns routing and payment intent', async () => {
    const app = createApp();
    const response = await app.request('/v1/proxy-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'Starbucks',
        mcc: '5814',
        amount: { amountMinor: 650, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred'],
        paymentMethodToken: 'tok_test_12345678',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.routing.bestCardId).toBeTruthy();
    expect(body.data.paymentIntent.status).toBe('requires_confirmation');
  });

  it('returns 404 when proxy pay disabled', async () => {
    delete process.env.FEATURE_PROXY_PAY;
    resetEnvCache();

    const app = createApp();
    const response = await app.request('/v1/proxy-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: { amountMinor: 650, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred'],
      }),
    });

    expect(response.status).toBe(404);
  });
});

describe('admin reparse API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.ADMIN_API_KEY = 'admin_test_key_16chars';
  });

  it('POST /admin/reparse/trigger runs batch reparse', async () => {
    const app = createApp();
    const response = await app.request('/admin/reparse/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': process.env.ADMIN_API_KEY!,
      },
      body: JSON.stringify({ limit: 2, concurrency: 1 }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.summary.total).toBeGreaterThan(0);
  });
});
