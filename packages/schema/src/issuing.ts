import { z } from 'zod';

export const CardholderStatusSchema = z.enum(['pending', 'approved', 'rejected', 'suspended']);
export const KycStatusSchema = z.enum(['pending', 'passed', 'failed', 'review']);
export const VirtualCardStatusSchema = z.enum(['active', 'frozen', 'closed']);

export const CreateCardholderSchema = z.object({
  programSlug: z.string().min(1).default('stipulate_sandbox'),
  metadata: z.record(z.unknown()).optional(),
});

export const IssueVirtualCardSchema = z.object({
  cardholderId: z.string().uuid(),
  spendLimitMinor: z.number().int().positive().optional(),
});

export const UpdateVirtualCardStatusSchema = z.object({
  status: VirtualCardStatusSchema,
});

export const OrderPhysicalCardSchema = z.object({
  cardholderId: z.string().uuid(),
  shippingAddress: z.object({
    line1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(2).max(32),
    postalCode: z.string().min(3).max(16),
    country: z.string().length(2).default('US'),
  }),
});

export const PhysicalCardOrderStatusSchema = z.enum([
  'pending',
  'submitted',
  'shipped',
  'delivered',
  'cancelled',
]);

export const PhysicalCardShippingWebhookSchema = z.object({
  orderId: z.string().uuid(),
  status: PhysicalCardOrderStatusSchema,
  trackingNumber: z.string().max(128).optional(),
});

export const CardholderSchema = z.object({
  id: z.string().uuid(),
  consumerUserId: z.string().uuid(),
  programSlug: z.string(),
  status: CardholderStatusSchema,
  kycStatus: KycStatusSchema,
  createdAt: z.string().datetime(),
});

export const VirtualCardSchema = z.object({
  id: z.string().uuid(),
  cardholderId: z.string().uuid(),
  last4: z.string().length(4),
  network: z.string(),
  status: VirtualCardStatusSchema,
  panToken: z.string().optional(),
  expMonth: z.number().int().min(1).max(12).optional(),
  expYear: z.number().int().optional(),
  spendLimitMinor: z.number().int().optional(),
});

export type CreateCardholderInput = z.infer<typeof CreateCardholderSchema>;
export type IssueVirtualCardInput = z.infer<typeof IssueVirtualCardSchema>;
