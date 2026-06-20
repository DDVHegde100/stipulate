import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('spend track and caps API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('POST /v1/spend/track records spend', async () => {
    const app = createApp();
    const response = await app.request('/v1/spend/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({
        userRef: 'mobile-wallet',
        cardId: 'amex_gold',
        category: 'groceries',
        amountMinor: 4200,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.spentMinor).toBe(4200);
  });

  it('GET /v1/spend/caps returns headroom rows', async () => {
    const app = createApp();
    const response = await app.request(
      '/v1/spend/caps?user_ref=mobile-wallet&card_ids=amex_gold,chase_sapphire_preferred',
      {
        headers: { 'X-API-Key': process.env.API_KEY! },
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.caps.length).toBeGreaterThan(0);
    expect(body.data.caps[0].remainingMinor).toBeGreaterThanOrEqual(0);
    expect(body.data.caps[0].capLimitMinor).toBeGreaterThan(0);
  });
});
