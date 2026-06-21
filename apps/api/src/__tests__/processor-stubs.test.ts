import { beforeEach, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { getIssuingProcessor, processorKindFromSlug } from '../services/processors/index.js';

describe('alternate issuing processor stubs', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LITHIC_API_KEY = 'lithic_test_key';
    process.env.MARQETA_APPLICATION_TOKEN = 'marqeta_test_token';
  });

  it('maps processor slugs to kinds', () => {
    expect(processorKindFromSlug('stripe_issuing')).toBe('stripe');
    expect(processorKindFromSlug('lithic')).toBe('lithic');
    expect(processorKindFromSlug('marqeta')).toBe('marqeta');
    expect(processorKindFromSlug('stipulate_sandbox')).toBe('sandbox');
  });

  it('lithic stub returns synthetic external IDs', async () => {
    const processor = getIssuingProcessor('lithic');
    const holder = await processor.createCardholder({
      consumerUserId: '00000000-0000-4000-8000-000000000020',
      name: 'Lithic User',
      email: 'lithic@example.com',
    });
    expect(holder.externalId).toMatch(/^lithic_ch_/);

    const card = await processor.issueVirtualCard({ cardholderExternalId: holder.externalId });
    expect(card.externalId).toMatch(/^lithic_card_/);
    expect(card.network).toBe('mastercard');
    expect(card.last4).toHaveLength(4);
  });

  it('marqeta stub returns synthetic external IDs', async () => {
    const processor = getIssuingProcessor('marqeta');
    const holder = await processor.createCardholder({
      consumerUserId: '00000000-0000-4000-8000-000000000021',
      name: 'Marqeta User',
    });
    expect(holder.externalId).toMatch(/^mq_user_/);

    const card = await processor.issueVirtualCard({ cardholderExternalId: holder.externalId });
    expect(card.externalId).toMatch(/^mq_card_/);
    expect(card.network).toBe('visa');
  });
});
