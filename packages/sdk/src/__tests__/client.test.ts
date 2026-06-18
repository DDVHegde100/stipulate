import { describe, it, expect, vi } from 'vitest';
import { StipulateClient, StipulateError } from '../client.js';

describe('StipulateClient', () => {
  it('posts route requests with API key header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { bestCardId: 'amex_gold', rankedCards: [], requestId: 'r1', computedAt: new Date().toISOString(), warnings: [] },
        requestId: 'r1',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.route({
      merchantName: 'Starbucks',
      amount: { amountMinor: 500, currency: 'USD' },
      userCardIds: ['amex_gold'],
    });

    expect(result.bestCardId).toBe('amex_gold');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/route',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-Key': 'test_key' }),
      }),
    );
  });

  it('throws StipulateError on API failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid route request' },
        requestId: 'r2',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', fetch: mockFetch });

    await expect(
      client.route({ amount: { amountMinor: -1, currency: 'USD' }, userCardIds: [] }),
    ).rejects.toBeInstanceOf(StipulateError);
  });
});
