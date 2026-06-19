import { beforeEach, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { createProxyPayPaymentIntent } from '../services/stripe.service.js';
import { proxyPayPurchase } from '../services/proxy-pay.service.js';

describe('stripe proxy pay', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('createProxyPayPaymentIntent returns test intent in test mode', async () => {
    const intent = await createProxyPayPaymentIntent({
      amountMinor: 650,
      currency: 'USD',
      paymentMethodId: 'pm_card_visa',
      metadata: { request_id: 'req-1', best_card_id: 'amex_gold' },
    });

    expect(intent.id).toBe('pi_test_proxy_pay');
    expect(intent.status).toBe('requires_confirmation');
    expect(intent.clientSecret).toBeTruthy();
  });

  it('uses Stripe PaymentIntent id when pm_ token and Stripe configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    resetEnvCache();

    const result = await proxyPayPurchase(
      {
        merchantName: 'Starbucks',
        mcc: '5814',
        amount: { amountMinor: 650, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred'],
        paymentMethodToken: 'pm_card_visa',
      },
      'req-stripe-proxy',
    );

    expect(result.paymentIntent.id).toBe('pi_test_proxy_pay');
    expect(result.routing.bestCardId).toBeTruthy();
  });
});
