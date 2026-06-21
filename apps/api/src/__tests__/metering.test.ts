import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';
import { reportStripeUsage } from '../services/metering.service.js';
import { setTestBillingSubscription } from '../repositories/billing.repository.js';

describe('Stripe metered usage reporting', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.STRIPE_SECRET_KEY = 'sk_test_metering';
    vi.restoreAllMocks();
  });

  it('posts usage to the subscription item id, not the price id', async () => {
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

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    await reportStripeUsage(orgId, 2);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/subscription_items/si_metered_test/usage_records');
    expect(String(url)).not.toContain('price_metered');
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).toContain('quantity=2');
  });

  it('skips Stripe when no subscription item id is stored', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    await reportStripeUsage('00000000-0000-4000-8000-000000000099', 1);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
