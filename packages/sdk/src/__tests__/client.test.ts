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

  it('lists webhook deliveries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          deliveries: [
            { id: 'd1', url: 'https://example.com/hook', event_id: 'evt_1', status: 'delivered', attempts: 1, response_status: 200 },
          ],
        },
        requestId: 'r3',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.listWebhookDeliveries(10);

    expect(result.deliveries).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/webhooks/deliveries?limit=10',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-API-Key': 'test_key' }) }),
    );
  });

  it('fetches org audit log', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { events: [{ id: 'a1', action: 'api_key.created', created_at: '2026-06-19T00:00:00Z' }] },
        requestId: 'r4',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.getOrgAuditLog(25);

    expect(result.events[0]?.action).toBe('api_key.created');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/org/audit?limit=25',
      expect.any(Object),
    );
  });

  it('posts batch route requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          batchId: 'batch-r5',
          results: [],
          total: 2,
          succeeded: 2,
          failed: 0,
          errors: [],
          computedAt: new Date().toISOString(),
        },
        requestId: 'r5',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.routeBatch({
      requests: [
        {
          merchantName: 'Starbucks',
          amount: { amountMinor: 650, currency: 'USD' },
          userCardIds: ['amex_gold'],
        },
        {
          merchantName: 'Shell',
          mcc: '5541',
          amount: { amountMinor: 5000, currency: 'USD' },
          userCardIds: ['amex_gold'],
        },
      ],
    });

    expect(result.succeeded).toBe(2);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/route/batch',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('posts proxy pay requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          requestId: 'r6',
          routing: { bestCardId: 'amex_gold', estimatedRewardMinor: 26 },
          paymentIntent: { id: 'pi_test', status: 'requires_confirmation', network: 'visa' },
          computedAt: new Date().toISOString(),
        },
        requestId: 'r6',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.proxyPay({
      merchantName: 'Starbucks',
      amount: { amountMinor: 650, currency: 'USD' },
      userCardIds: ['amex_gold'],
      paymentMethodToken: 'pm_card_visa',
    });

    expect(result.paymentIntent.status).toBe('requires_confirmation');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/proxy-pay',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('lists vaulted payment methods', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { paymentMethods: [{ id: 'pm1', paymentMethodId: 'pm_test', isDefault: true }] },
        requestId: 'r7',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.listVaultedPaymentMethods();

    expect(result.paymentMethods).toHaveLength(1);
  });

  it('issues virtual cards via issuing API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: 'card-1', last4: '4242', mode: 'sandbox' },
        requestId: 'r8',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.issueVirtualCard({ cardholderId: '00000000-0000-4000-8000-000000000020' });

    expect(result.last4).toBe('4242');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/issuing/cards/virtual',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('lists issuing authorizations', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { authorizations: [{ id: 'auth-1', status: 'approved' }] },
        requestId: 'r9',
      }),
    });

    const client = new StipulateClient({ apiKey: 'test_key', baseUrl: 'http://localhost:3000/v1', fetch: mockFetch });
    const result = await client.listIssuingAuthorizations({ cardholderId: 'ch_1' });

    expect(result.authorizations).toHaveLength(1);
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain('/issuing/authorizations');
  });
});
