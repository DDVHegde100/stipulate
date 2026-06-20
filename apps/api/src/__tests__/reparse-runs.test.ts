import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('admin reparse runs API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.ADMIN_API_KEY = 'admin_test_key_123456';
  });

  it('GET /admin/reparse/runs lists recent runs', async () => {
    const app = createApp();
    const response = await app.request('/admin/reparse/runs?limit=5', {
      headers: { 'X-Admin-Key': process.env.ADMIN_API_KEY! },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.runs.length).toBeGreaterThan(0);
    expect(body.data.runs[0].status).toBe('completed');
  });
});
