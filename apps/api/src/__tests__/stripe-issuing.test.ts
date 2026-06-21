import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { createStripeCardholder, createStripeVirtualCard } from '../services/stripe-issuing.service.js';

describe('Stripe Issuing service', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.STRIPE_SECRET_KEY = 'sk_test_issuing';
    vi.restoreAllMocks();
  });

  it('createStripeCardholder posts to Stripe Issuing API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'ich_test_cardholder' }), { status: 200 }),
    );

    const holder = await createStripeCardholder({
      name: 'Demo User',
      email: 'demo@stipulate.io',
      metadata: { consumer_user_id: '00000000-0000-4000-8000-000000000001' },
    });

    expect(holder.id).toBe('ich_test_cardholder');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/issuing/cardholders');
  });

  it('createStripeVirtualCard posts virtual card request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'ic_test_card',
          last4: '4242',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2029,
        }),
        { status: 200 },
      ),
    );

    const card = await createStripeVirtualCard({ cardholderId: 'ich_test_cardholder' });

    expect(card.last4).toBe('4242');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/issuing/cards');
  });
});
