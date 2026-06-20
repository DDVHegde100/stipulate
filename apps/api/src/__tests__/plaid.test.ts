import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('plaid link API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('POST /v1/plaid/link-token returns stub token', async () => {
    const app = createApp();
    const response = await app.request('/v1/plaid/link-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.linkToken).toMatch(/^link-/);
    expect(body.data.mode).toBe('stub');
  });

  it('POST /v1/plaid/exchange maps accounts to catalog cards', async () => {
    const app = createApp();
    const userId = '00000000-0000-4000-8000-000000000001';

    const response = await app.request('/v1/plaid/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': userId,
      },
      body: JSON.stringify({
        publicToken: 'public-sandbox-test-token',
        institutionName: 'Chase',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.accountsLinked).toBe(2);
    expect(body.data.suggestedCards.length).toBeGreaterThan(0);
    expect(body.data.suggestedCards[0].cardId).toBe('chase_sapphire_preferred');
  });

  it('GET /v1/plaid/accounts lists linked accounts after exchange', async () => {
    const app = createApp();
    const userId = '00000000-0000-4000-8000-000000000002';

    await app.request('/v1/plaid/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': userId,
      },
      body: JSON.stringify({
        publicToken: 'public-sandbox-linked',
        institutionName: 'Chase',
      }),
    });

    const response = await app.request('/v1/plaid/accounts', {
      headers: {
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': userId,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.accounts.length).toBe(2);
    expect(body.data.accounts[0].mappedCardId).toBeTruthy();
  });
});
