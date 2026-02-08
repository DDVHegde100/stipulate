import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';

describe('admin ingestion API', () => {
  const app = createApp();
  const adminHeaders = {
    'X-Admin-Key': 'test_api_key_ci',
    'Content-Type': 'application/json',
  };

  beforeEach(() => {
    process.env.API_KEY = 'test_api_key_ci';
    process.env.ADMIN_API_KEY = 'test_api_key_ci';
    process.env.NODE_ENV = 'test';
  });

  it('POST /admin/ingestion/jobs creates a job', async () => {
    const res = await app.request('/admin/ingestion/jobs', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        card_id: 'chase_sapphire_preferred',
        source_url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.cardId).toBe('chase_sapphire_preferred');
    expect(body.data.status).toBe('queued');
  });

  it('GET /admin/ingestion/queue returns review and queued counts', async () => {
    const res = await app.request('/admin/ingestion/queue', { headers: adminHeaders });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.data.review_count).toBe('number');
  });

  it('rejects requests without admin key', async () => {
    const res = await app.request('/admin/ingestion/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: 'amex_gold',
        source_url: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('GET /admin lists endpoints', async () => {
    const res = await app.request('/admin', { headers: adminHeaders });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.endpoints.ingestion).toBeDefined();
  });
});
