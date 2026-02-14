import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('production route API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.API_KEY;
  });

  it('POST /v1/route validates schema-compliant request', async () => {
    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -5 }),
    });
    expect(response.status).toBe(422);
  });

  it('POST /v1/route ranks cards by cash-equivalent reward', async () => {
    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'Blue Bottle Coffee',
        mcc: '5812',
        amount: { amountMinor: 1500, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.bestCardId).toBe('amex_gold');
    expect(body.data.rankedCards.length).toBeGreaterThanOrEqual(2);
    expect(body.data.rankedCards[0].rank).toBe(1);
    expect(body.data.computedAt).toEqual(expect.any(String));
  });

  it('POST /v1/route respects cap exhaustion', async () => {
    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'Whole Foods',
        mcc: '5411',
        amount: { amountMinor: 10000, currency: 'USD' },
        userCardIds: ['amex_gold'],
        metadata: { priorGrocerySpendMinor: 2500000 },
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.rankedCards[0].score).toBeGreaterThanOrEqual(0);
  });
});

describe('production enrich API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('POST /v1/enrich resolves merchant with MCC database', async () => {
    const app = createApp();
    const response = await app.request('/v1/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: "Trader Joe's",
        mcc: '5411',
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.enrichment.category).toBe('groceries');
    expect(body.data.enrichment.mcc).toBe('5411');
    expect(body.data.enrichment.confidence).toBeGreaterThan(0.9);
  });

  it('POST /v1/enrich parses statement descriptors', async () => {
    const app = createApp();
    const response = await app.request('/v1/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'SQ *STARBUCKS',
        rawDescriptor: 'SQ *STARBUCKS',
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.descriptorParsed).toBe(true);
    expect(body.data.enrichment.category).toBe('dining');
    expect(body.data.enrichment.mcc).toBe('5814');
  });

  it('POST /v1/enrich/corrections validates request body', async () => {
    const app = createApp();
    const response = await app.request('/v1/enrich/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantName: 'Test' }),
    });
    expect(response.status).toBe(422);
  });
});
