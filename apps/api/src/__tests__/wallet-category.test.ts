import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('wallet category state API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('POST /v1/wallet/category-state stores rotating category', async () => {
    const app = createApp();
    const response = await app.request('/v1/wallet/category-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({
        cardId: 'citi_custom_cash',
        stateType: 'custom_cash_top',
        activeCategory: 'groceries',
        activated: true,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.cardId).toBe('citi_custom_cash');
    expect(body.data.activeCategory).toBe('groceries');
  });
});
