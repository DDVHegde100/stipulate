import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';
import { resetTestAuditEvents } from '../repositories/audit.repository.js';
import { resetTestIdempotencyCache } from '../middleware/idempotency.js';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': 'test_api_key_ci_16chars',
};

describe('idempotency middleware', () => {
  beforeEach(async () => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    resetTestIdempotencyCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('replays cached POST /v1/route response for same Idempotency-Key', async () => {
    const app = createApp();
    const body = JSON.stringify({
      merchantName: 'Starbucks',
      mcc: '5814',
      amount: { amountMinor: 650, currency: 'USD' },
      userCardIds: ['chase_sapphire_preferred'],
    });

    const idempotencyKey = 'route-test-key-001';

    const first = await app.request('/v1/route', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': idempotencyKey },
      body,
    });
    expect(first.status).toBe(200);
    const firstJson = await first.json();

    const second = await app.request('/v1/route', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        merchantName: 'Different Merchant',
        mcc: '5812',
        amount: { amountMinor: 5000, currency: 'USD' },
        userCardIds: ['amex_gold'],
      }),
    });
    expect(second.status).toBe(200);
    const secondJson = await second.json();

    expect(secondJson.data).toEqual(firstJson.data);
  });
});

describe('webhook deliveries API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('GET /v1/webhooks/deliveries returns delivery log', async () => {
    const app = createApp();
    const response = await app.request('/v1/webhooks/deliveries', { headers });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.deliveries.length).toBeGreaterThan(0);
    expect(body.data.deliveries[0].status).toBeDefined();
  });
});

describe('org audit log', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    resetTestAuditEvents();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('records api key creation in audit log', async () => {
    const app = createApp();

    await app.request('/v1/keys', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'ci-test-key' }),
    });

    const audit = await app.request('/v1/org/audit', { headers });
    expect(audit.status).toBe(200);
    const body = await audit.json();
    expect(body.data.events.some((e: { action: string }) => e.action === 'api_key.created')).toBe(
      true,
    );
  });
});

describe('org isolation', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('rejects requests without API key in production mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.API_KEY = 'test_api_key_ci_16chars';
    resetEnvCache();

    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'Test',
        mcc: '5814',
        amount: { amountMinor: 100, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred'],
      }),
    });

    expect(response.status).toBe(401);
  });
});
