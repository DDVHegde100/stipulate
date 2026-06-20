import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

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
});
