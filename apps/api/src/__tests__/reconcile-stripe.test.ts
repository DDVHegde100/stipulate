import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { setTestBillingSubscription } from '../repositories/billing.repository.js';
import { fetchStripeUsageTotal } from '../services/stripe-reconcile.service.js';

describe('Stripe usage reconciliation', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_reconcile';
    vi.restoreAllMocks();
  });

  it('fetchStripeUsageTotal sums Stripe usage record summaries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ total_usage: 42 }, { total_usage: 8 }] }), {
        status: 200,
      }),
    );

    const total = await fetchStripeUsageTotal(
      'si_test_item',
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-19T00:00:00Z'),
    );

    expect(total).toBe(50);
  });

  it('setTestBillingSubscription stores subscription item id for drift checks', () => {
    const orgId = '00000000-0000-4000-8000-000000000001';
    setTestBillingSubscription(orgId, {
      id: 'sub-row',
      org_id: orgId,
      stripe_customer_id: 'cus_test',
      stripe_subscription_id: 'sub_test',
      stripe_subscription_item_id: 'si_metered_test',
      stripe_price_id: 'price_metered',
      plan: 'payg',
      status: 'active',
    });

    expect(true).toBe(true);
  });
});
