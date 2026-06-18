import { z } from 'zod';
import { RouteRequestSchema } from './routing.js';

/** Proxy pay routes a purchase and returns a tokenized payment intent stub. */
export const ProxyPayRequestSchema = RouteRequestSchema.extend({
  paymentMethodToken: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).optional(),
});

export const ProxyPayResponseSchema = z.object({
  requestId: z.string().min(1),
  routing: z.object({
    bestCardId: z.string(),
    estimatedRewardMinor: z.number().int().nonnegative(),
  }),
  paymentIntent: z.object({
    id: z.string().min(1),
    status: z.enum(['requires_confirmation', 'processing', 'succeeded']),
    tokenizedPan: z.string().optional(),
    network: z.string().optional(),
  }),
  computedAt: z.string().datetime({ offset: true }),
});

export type ProxyPayRequest = z.infer<typeof ProxyPayRequestSchema>;
export type ProxyPayResponse = z.infer<typeof ProxyPayResponseSchema>;
