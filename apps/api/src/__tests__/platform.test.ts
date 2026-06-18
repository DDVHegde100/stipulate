import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('batch route API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.API_KEY;
  });

  it('POST /v1/route/batch routes multiple transactions', async () => {
    const app = createApp();
    const response = await app.request('/v1/route/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            merchantName: 'Starbucks',
            mcc: '5814',
            amount: { amountMinor: 650, currency: 'USD' },
            userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
          },
          {
            merchantName: 'Whole Foods',
            mcc: '5411',
            amount: { amountMinor: 5000, currency: 'USD' },
            userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
          },
        ],
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.total).toBe(2);
    expect(body.data.succeeded).toBe(2);
    expect(body.data.results).toHaveLength(2);
  });

  it('POST /v1/route/batch rejects empty batch', async () => {
    const app = createApp();
    const response = await app.request('/v1/route/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [] }),
    });
    expect(response.status).toBe(422);
  });
});

describe('routing explainability', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('POST /v1/route returns factors on ranked cards', async () => {
    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'Starbucks',
        mcc: '5814',
        amount: { amountMinor: 650, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.rankedCards[0].factors.length).toBeGreaterThan(0);
    expect(body.data.rankedCards[0].factors[0].category).toBeDefined();
  });
});

describe('platform middleware', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.API_KEY;
  });

  it('includes rate limit headers on v1 routes', async () => {
    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'Target',
        amount: { amountMinor: 2000, currency: 'USD' },
        userCardIds: ['amex_gold'],
      }),
    });

    expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
  });
});
