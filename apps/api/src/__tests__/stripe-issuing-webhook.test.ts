import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { handleStripeIssuingWebhookEvent } from '../services/stripe-issuing-webhook.service.js';
import * as issuingRepo from '../repositories/issuing.repository.js';

describe('Stripe Issuing webhooks', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_issuing_webhook';
    vi.restoreAllMocks();
  });

  it('syncs issuing_card.updated into virtual card status', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/issuing/cardholders')) {
        return new Response(JSON.stringify({ id: 'ich_webhook_holder' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: 'ic_webhook_card',
          last4: '4242',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2029,
        }),
        { status: 200 },
      );
    });

    const cardholder = await issuingRepo.createCardholder({
      consumerUserId: '00000000-0000-4000-8000-000000000010',
      programSlug: 'stripe_issuing_sandbox',
    });

    await issuingRepo.issueVirtualCard({ cardholderId: cardholder.id });

    const handled = await handleStripeIssuingWebhookEvent({
      type: 'issuing_card.updated',
      data: {
        object: {
          id: 'ic_webhook_card',
          status: 'inactive',
          last4: '1111',
          brand: 'mastercard',
        },
      },
    });

    expect(handled).toBe(true);
    const cards = await issuingRepo.listVirtualCards(cardholder.id);
    expect(cards[0]?.status).toBe('frozen');
    expect(cards[0]?.last4).toBe('1111');
    expect(cards[0]?.network).toBe('mastercard');
  });

  it('syncs issuing_cardholder.updated into cardholder status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'ich_webhook_holder_2' }), { status: 200 }),
    );

    const cardholder = await issuingRepo.createCardholder({
      consumerUserId: '00000000-0000-4000-8000-000000000011',
      programSlug: 'stripe_issuing_sandbox',
    });

    const handled = await handleStripeIssuingWebhookEvent({
      type: 'issuing_cardholder.updated',
      data: {
        object: {
          id: cardholder.external_id,
          status: 'blocked',
          requirements: { disabled_reason: 'listed' },
        },
      },
    });

    expect(handled).toBe(true);
    const refreshed = await issuingRepo.findCardholderById(cardholder.id);
    expect(refreshed?.status).toBe('suspended');
    expect(refreshed?.kyc_status).toBe('review');
  });

  it('ignores unrelated issuing events', async () => {
    const handled = await handleStripeIssuingWebhookEvent({
      type: 'issuing_dispute.created',
      data: { object: { id: 'idp_test' } },
    });
    expect(handled).toBe(false);
  });
});
