import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('plaid transaction sync API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('POST /v1/plaid/sync-transactions imports spend after bank link', async () => {
    const app = createApp();
    const userId = '00000000-0000-4000-8000-000000000003';

    await app.request('/v1/plaid/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': userId,
      },
      body: JSON.stringify({
        publicToken: 'public-sync-test',
        institutionName: 'Chase',
      }),
    });

    const response = await app.request('/v1/plaid/sync-transactions', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': userId,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBeGreaterThan(0);
    expect(body.data.mode).toBe('stub');
  });
});
