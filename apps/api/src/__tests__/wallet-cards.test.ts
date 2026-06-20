import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('wallet cards API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('GET /v1/wallet/cards returns demo wallet cards', async () => {
    const app = createApp();
    const response = await app.request('/v1/wallet/cards', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.cards.length).toBeGreaterThan(0);
    expect(body.data.cards[0].cardId).toBeTruthy();
  });

  it('POST /v1/wallet/cards adds a card', async () => {
    const app = createApp();
    const response = await app.request('/v1/wallet/cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': '00000000-0000-4000-8000-000000000001',
      },
      body: JSON.stringify({
        cardId: 'amex_gold',
        label: 'Amex Gold',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.cardId).toBe('amex_gold');
  });

  it('DELETE /v1/wallet/cards/:cardId removes a card', async () => {
    const app = createApp();
    const response = await app.request('/v1/wallet/cards/chase_sapphire_preferred', {
      method: 'DELETE',
      headers: {
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': '00000000-0000-4000-8000-000000000001',
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.removed).toBe(true);
  });
});
