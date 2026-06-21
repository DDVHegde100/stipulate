import { z } from 'zod';
import { RouteRequestSchema } from './routing.js';

/** Proxy pay routes a purchase and returns a tokenized payment intent stub. */
export const ProxyPayRequestSchema = RouteRequestSchema.extend({
  paymentMethodToken: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).optional(),
});

export const VaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(3),
  label: z.string().max(128).optional(),
  network: z.string().max(32).optional(),
  last4: z.string().length(4).optional(),
  setDefault: z.boolean().optional(),
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
    mode: z.enum(['sandbox', 'stripe']).optional(),
  }),
  computedAt: z.string().datetime({ offset: true }),
});

export type ProxyPayRequest = z.infer<typeof ProxyPayRequestSchema>;
export type ProxyPayResponse = z.infer<typeof ProxyPayResponseSchema>;
