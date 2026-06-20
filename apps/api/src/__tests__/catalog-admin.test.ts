import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('admin catalog coverage', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.ADMIN_API_KEY = 'admin_test_key_123456';
  });

  it('GET /admin/catalog/coverage returns summary', async () => {
    const app = createApp();
    const response = await app.request('/admin/catalog/coverage?limit=5', {
      headers: { 'X-Admin-Key': process.env.ADMIN_API_KEY! },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.summary).toBeDefined();
    expect(Array.isArray(body.data.cards)).toBe(true);
  });

  it('GET /admin/catalog/coverage/gaps returns missing cards', async () => {
    const app = createApp();
    const response = await app.request('/admin/catalog/coverage/gaps?limit=10', {
      headers: { 'X-Admin-Key': process.env.ADMIN_API_KEY! },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.missingBenefits).toBeDefined();
    expect(typeof body.data.count).toBe('number');
  });
});
