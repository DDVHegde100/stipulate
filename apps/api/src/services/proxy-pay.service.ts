import { randomUUID } from 'node:crypto';
import { ProxyPayResponseSchema, type ProxyPayRequest } from '@stipulate/schema';
import { routePurchase } from './routing.service.js';

/** Proxy pay combines routing with a tokenized payment intent (production stub). */
export async function proxyPayPurchase(
  request: ProxyPayRequest,
  requestId: string,
  context: { orgId?: string } = {},
) {
  const routing = await routePurchase(request, requestId, context);
  const best = routing.rankedCards[0];

  return ProxyPayResponseSchema.parse({
    requestId,
    routing: {
      bestCardId: routing.bestCardId,
      estimatedRewardMinor: best?.estimatedReward.amountMinor ?? 0,
    },
    paymentIntent: {
      id: `pi_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      status: 'requires_confirmation',
      tokenizedPan: request.paymentMethodToken ? `tok_${request.paymentMethodToken.slice(0, 8)}` : undefined,
      network: 'visa',
    },
    computedAt: new Date().toISOString(),
  });
}
