import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetIngestionMemoryStore } from '../repositories/ingestion.repository.js';

describe('admin corrections API', () => {
  let app: ReturnType<typeof createApp>;
  const adminHeaders = {
    'X-Admin-Key': 'test_admin_key_ci_only',
    'Content-Type': 'application/json',
  };

  beforeEach(() => {
    resetEnvCache();
    resetIngestionMemoryStore();
    process.env.API_KEY = 'test_admin_key_ci_only';
    process.env.ADMIN_API_KEY = 'test_admin_key_ci_only';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    app = createApp();
  });

  it('GET /admin/corrections returns pending list', async () => {
    const res = await app.request('/admin/corrections', { headers: adminHeaders });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.corrections)).toBe(true);
  });

  it('POST /admin/corrections/:id/approve works in test mode', async () => {
    const res = await app.request('/admin/corrections/test-id/approve', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ reviewed_by: 'admin@test.com' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('approved');
  });
});

describe('admin orgs API', () => {
  let app: ReturnType<typeof createApp>;
  const adminHeaders = {
    'X-Admin-Key': 'test_admin_key_ci_only',
    'Content-Type': 'application/json',
  };

  beforeEach(() => {
    resetEnvCache();
    process.env.API_KEY = 'test_admin_key_ci_only';
    process.env.ADMIN_API_KEY = 'test_admin_key_ci_only';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    app = createApp();
  });

  it('GET /admin lists org endpoints', async () => {
    const res = await app.request('/admin', { headers: adminHeaders });
    const body = await res.json();
    expect(body.endpoints.orgs).toBeDefined();
    expect(body.endpoints.corrections).toBeDefined();
  });
});

describe('card catalog API', () => {
  beforeEach(() => {
    resetEnvCache();
    delete process.env.API_KEY;
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('GET /v1/cards lists demo catalog', async () => {
    const app = createApp();
    const res = await app.request('/v1/cards');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.cards.length).toBeGreaterThan(0);
    expect(body.data.total).toBeGreaterThan(0);
  });

  it('GET /v1/cards supports issuer filter', async () => {
    const app = createApp();
    const res = await app.request('/v1/cards?issuer=chase');
    const body = await res.json();
    expect(body.data.cards.every((c: { issuer_slug: string | null }) => c.issuer_slug?.includes('chase'))).toBe(true);
  });
});
