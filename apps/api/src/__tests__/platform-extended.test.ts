import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { getFeatureFlags } from '../lib/feature-flags.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';
import { proxyPayPurchase, ProxyPayError } from '../services/proxy-pay.service.js';

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

  it('requires paymentMethodToken in production', async () => {
    process.env.NODE_ENV = 'production';
    resetEnvCache();

    await expect(
      proxyPayPurchase(
        {
          merchantName: 'Starbucks',
          mcc: '5814',
          amount: { amountMinor: 650, currency: 'USD' },
          userCardIds: ['chase_sapphire_preferred'],
        },
        'req-proxy-pay-prod',
      ),
    ).rejects.toMatchObject({
      name: 'ProxyPayError',
      code: 'PAYMENT_TOKEN_REQUIRED',
    } satisfies Partial<ProxyPayError>);
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

describe('org self-service keys API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('GET /v1/keys lists org keys', async () => {
    const app = createApp();
    const response = await app.request('/v1/keys', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /v1/keys creates a new key', async () => {
    const app = createApp();
    const response = await app.request('/v1/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({ name: 'ci-test' }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.apiKey).toContain('stip_');
  });
});

describe('spend summary API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.API_KEY;
  });

  it('GET /v1/spend/summary returns cap rows', async () => {
    const app = createApp();
    const response = await app.request(
      '/v1/spend/summary?user_ref=mobile-wallet&card_ids=amex_gold,chase_sapphire_preferred',
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.caps.length).toBeGreaterThan(0);
  });
});

describe('public waitlist API', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
  });

  it('POST /public/waitlist accepts email signup', async () => {
    const app = createApp();
    const response = await app.request('/public/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'founder@example.com', company: 'Acme' }),
    });
    expect(response.status).toBe(201);
  });
});

describe('GDPR org API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('GET /v1/org/export returns data bundle', async () => {
    const app = createApp();
    const response = await app.request('/v1/org/export', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.org).toBeDefined();
    expect(body.data.exportedAt).toBeDefined();
  });

  it('DELETE /v1/org schedules deletion', async () => {
    const app = createApp();
    const response = await app.request('/v1/org', {
      method: 'DELETE',
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.data.status).toBe('scheduled');
    expect(body.data.scheduledFor).toBeDefined();
  });
});

describe('public status API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('GET /status returns operational checks', async () => {
    const app = createApp();
    const response = await app.request('/status');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('operational');
    expect(body.checks.api.ok).toBe(true);
    expect(body.checks.workers).toBeDefined();
    expect(body.checks.slo.routeP99LimitMs).toBe(20);
  });
});

describe('consumer auth API', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('POST /public/auth/login accepts demo credentials', async () => {
    const app = createApp();
    const response = await app.request('/public/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@stipulate.io', password: 'demo-password-123' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.email).toBe('demo@stipulate.io');
  });

  it('POST /public/auth/signup creates user', async () => {
    const app = createApp();
    const response = await app.request('/public/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'securepass1',
        name: 'New User',
      }),
    });
    expect(response.status).toBe(201);
  });
});

describe('openapi spec', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('GET /v1/openapi returns YAML spec', async () => {
    const app = createApp();
    const response = await app.request('/v1/openapi', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('openapi: 3.1.0');
    expect(text).toContain('/org/export');
    expect(text).toContain('/billing/payment-methods');
    expect(text).toContain('/issuing/cardholders');
  });

  it('GET /v1/openapi/json returns parsed spec', async () => {
    const app = createApp();
    const response = await app.request('/v1/openapi/json', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.paths['/org/export']).toBeDefined();
    expect(body.paths['/proxy-pay']).toBeDefined();
    expect(body.paths['/billing/payment-methods']).toBeDefined();
    expect(body.paths['/issuing/cardholders']).toBeDefined();
  });
});
