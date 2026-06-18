import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp, type App } from '../app.js';
import { resetEnvCache } from '../config/env.js';

vi.mock('../repositories/benefit.repository.js', () => ({
  findCardUuid: vi.fn(() => Promise.reject(new Error('no db'))),
  getBenefitRules: vi.fn(),
  getBenefitVersion: vi.fn(),
  getLatestVersion: vi.fn(),
  listChangelog: vi.fn(() => Promise.reject(new Error('no db'))),
}));

describe('benefits API', () => {
  let app: App;
  const headers = { 'X-API-Key': 'test_api_key_ci_only', 'Content-Type': 'application/json' };

  beforeEach(() => {
    resetEnvCache();
    process.env.API_KEY = 'test_api_key_ci_only';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    app = createApp();
  });

  it('GET /v1/cards/:id/benefits returns demo benefits', async () => {
    const res = await app.request('/v1/cards/chase_sapphire_preferred/benefits', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.card_id).toBe('chase_sapphire_preferred');
    expect(body.data.benefits.length).toBeGreaterThan(0);
    expect(body.data.benefits[0].category).toBe('dining');
  });

  it('GET /v1/cards/:id/benefits supports as_of query', async () => {
    const res = await app.request('/v1/cards/amex_gold/benefits?as_of=2026-01-15', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.as_of).toBe('2026-01-15');
  });

  it('GET /v1/cards/:id/benefits returns 404 for unknown card', async () => {
    const res = await app.request('/v1/cards/unknown_card_xyz/benefits', { headers });
    expect(res.status).toBe(404);
  });

  it('GET /v1/changelog returns entries', async () => {
    const res = await app.request('/v1/changelog', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.entries.length).toBeGreaterThan(0);
    expect(body.data.entries[0].severity).toBe('breaking');
  });

  it('GET /v1/changelog filters by card_id', async () => {
    const res = await app.request('/v1/changelog?card_id=chase_sapphire_preferred', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.entries.every((e: { card_id: string }) => e.card_id === 'chase_sapphire_preferred')).toBe(true);
  });

  it('GET /v1 lists new endpoints', async () => {
    const res = await app.request('/v1', { headers });
    const body = await res.json();
    expect(body.endpoints.cards).toBeDefined();
    expect(body.endpoints.changelog).toBeDefined();
  });
});
