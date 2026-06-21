import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { handleStripeIssuingWebhookEvent } from '../services/stripe-issuing-webhook.service.js';
import * as issuingRepo from '../repositories/issuing.repository.js';
import * as authRepo from '../repositories/issuing-authorization.repository.js';

describe('Stripe Issuing authorization webhooks', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_auth_webhook';
    vi.restoreAllMocks();
  });

  it('persists issuing_authorization.created', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/issuing/cardholders')) {
        return new Response(JSON.stringify({ id: 'ich_auth_holder' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: 'ic_auth_card',
          last4: '4242',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2029,
        }),
        { status: 200 },
      );
    });

    const cardholder = await issuingRepo.createCardholder({
      consumerUserId: '00000000-0000-4000-8000-000000000030',
      programSlug: 'stripe_issuing_sandbox',
    });
    await issuingRepo.issueVirtualCard({ cardholderId: cardholder.id });

    const handled = await handleStripeIssuingWebhookEvent({
      type: 'issuing_authorization.created',
      data: {
        object: {
          id: 'iauth_test_1',
          card: 'ic_auth_card',
          amount: 4200,
          currency: 'usd',
          status: 'pending',
          created: 1_700_000_000,
          merchant_data: { name: 'Whole Foods', category_code: '5411' },
        },
      },
    });

    expect(handled).toBe(true);
    const rows = await authRepo.listIssuingAuthorizations({ cardholderId: cardholder.id });
    expect(rows[0]?.amount_minor).toBe(4200);
    expect(rows[0]?.merchant_name).toBe('Whole Foods');
    expect(rows[0]?.status).toBe('pending');
  });

  it('updates authorization status on issuing_authorization.updated', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/issuing/cardholders')) {
        return new Response(JSON.stringify({ id: 'ich_auth_holder_2' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: 'ic_auth_card_2',
          last4: '1111',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2029,
        }),
        { status: 200 },
      );
    });

    const cardholder = await issuingRepo.createCardholder({
      consumerUserId: '00000000-0000-4000-8000-000000000031',
      programSlug: 'stripe_issuing_sandbox',
    });
    await issuingRepo.issueVirtualCard({ cardholderId: cardholder.id });

    await handleStripeIssuingWebhookEvent({
      type: 'issuing_authorization.created',
      data: {
        object: {
          id: 'iauth_test_2',
          card: 'ic_auth_card_2',
          amount: 900,
          currency: 'usd',
          status: 'pending',
        },
      },
    });

    await handleStripeIssuingWebhookEvent({
      type: 'issuing_authorization.updated',
      data: {
        object: {
          id: 'iauth_test_2',
          card: 'ic_auth_card_2',
          amount: 900,
          currency: 'usd',
          status: 'closed',
        },
      },
    });

    const rows = await authRepo.listIssuingAuthorizations({ cardholderId: cardholder.id });
    expect(rows[0]?.status).toBe('approved');
  });
});
