import { randomUUID } from 'node:crypto';
import { ProxyPayResponseSchema, type ProxyPayRequest } from '@stipulate/schema';
import { routePurchase } from './routing.service.js';
import { createProxyPayPaymentIntent } from './stripe.service.js';

export class ProxyPayError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ProxyPayError';
  }
}

function inferPaymentNetwork(input: { paymentMethodToken?: string; bestCardId: string }): string {
  if (input.bestCardId.includes('amex')) return 'amex';
  if (input.paymentMethodToken?.includes('discover')) return 'discover';
  if (input.paymentMethodToken?.includes('mastercard') || input.paymentMethodToken?.includes('mc_')) {
    return 'mastercard';
  }
  return 'visa';
}

function mapStripeStatus(status: string): 'requires_confirmation' | 'processing' | 'succeeded' {
  if (status === 'succeeded') return 'succeeded';
  if (status === 'processing' || status === 'requires_capture') return 'processing';
  return 'requires_confirmation';
}

async function buildPaymentIntent(input: {
  request: ProxyPayRequest;
  requestId: string;
  bestCardId: string;
  estimatedRewardMinor: number;
  network: string;
}) {
  const token = input.request.paymentMethodToken;
  const useStripe =
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    Boolean(token?.startsWith('pm_'));

  if (useStripe && token) {
    try {
      const stripeIntent = await createProxyPayPaymentIntent({
        amountMinor: input.request.amount.amountMinor,
        currency: input.request.amount.currency,
        paymentMethodId: token,
        metadata: {
          request_id: input.requestId,
          best_card_id: input.bestCardId,
          estimated_reward_minor: String(input.estimatedRewardMinor),
        },
      });

      return {
        id: stripeIntent.id,
        status: mapStripeStatus(stripeIntent.status),
        tokenizedPan: undefined,
        network: input.network,
        mode: 'stripe' as const,
      };
    } catch {
      // Fall through to sandbox intent when Stripe rejects test tokens
    }
  }

  return {
    id: `pi_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    status: token ? ('requires_confirmation' as const) : ('processing' as const),
    tokenizedPan: token ? `tok_${token.slice(0, 8)}` : undefined,
    network: input.network,
    mode: 'sandbox' as const,
  };
}

/** Proxy pay combines routing with a tokenized payment intent. */
export async function proxyPayPurchase(
  request: ProxyPayRequest,
  requestId: string,
  context: { orgId?: string } = {},
) {
  if (process.env.NODE_ENV === 'production' && !request.paymentMethodToken) {
    throw new ProxyPayError(
      'paymentMethodToken is required for proxy pay in production',
      'PAYMENT_TOKEN_REQUIRED',
    );
  }

  const routing = await routePurchase(request, requestId, context);
  const best = routing.rankedCards[0];
  const network = inferPaymentNetwork({
    paymentMethodToken: request.paymentMethodToken,
    bestCardId: routing.bestCardId,
  });

  const paymentIntent = await buildPaymentIntent({
    request,
    requestId,
    bestCardId: routing.bestCardId,
    estimatedRewardMinor: best?.estimatedReward.amountMinor ?? 0,
    network,
  });

  return ProxyPayResponseSchema.parse({
    requestId,
    routing: {
      bestCardId: routing.bestCardId,
      estimatedRewardMinor: best?.estimatedReward.amountMinor ?? 0,
    },
    paymentIntent,
    computedAt: new Date().toISOString(),
  });
}
