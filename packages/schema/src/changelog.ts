import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { BenefitChangeSchema, ParsedBenefitBundleSchema } from './parsed-benefit.js';
import { BenefitRuleSchema } from './benefit.js';

/** Webhook event types emitted when card benefits change. */
export const BenefitWebhookEventTypeSchema = z.enum([
  'benefit.created',
  'benefit.updated',
  'benefit.removed',
  'benefit.version_published',
  'catalog.refresh_completed',
]);

/** HMAC-signed webhook payload for B2B integrators. */
export const BenefitWebhookPayloadSchema = z.object({
  id: z.string().uuid(),
  type: BenefitWebhookEventTypeSchema,
  created_at: z.string().datetime({ offset: true }),
  api_version: z.string().default('2026-02-08'),
  data: z.object({
    card_id: z.string().min(1),
    version: z.number().int().positive(),
    previous_version: z.number().int().positive().optional(),
    changes: z.array(BenefitChangeSchema).default([]),
    snapshot: ParsedBenefitBundleSchema.optional(),
    benefits: z.array(BenefitRuleSchema).optional(),
  }),
  livemode: z.boolean().default(true),
});

/** Changelog entry returned by GET /v1/changelog. */
export const BenefitChangelogEntrySchema = z.object({
  id: z.string().uuid(),
  card_id: z.string().min(1),
  card_name: z.string().optional(),
  version: z.number().int().positive(),
  previous_version: z.number().int().positive().optional(),
  change_summary: z.string(),
  severity: z.enum(['breaking', 'material', 'minor']).default('material'),
  changes: z.array(BenefitChangeSchema).default([]),
  effective_from: z.string().date().optional(),
  published_at: z.string().datetime({ offset: true }),
});

export const BenefitChangelogResponseSchema = z.object({
  entries: z.array(BenefitChangelogEntrySchema),
  has_more: z.boolean(),
  next_cursor: z.string().optional(),
});

/** Query params for versioned benefit lookup. */
export const BenefitLookupQuerySchema = z.object({
  as_of: z.string().date().optional(),
  version: z.coerce.number().int().positive().optional(),
  include_history: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const CardBenefitsResponseSchema = z.object({
  card_id: z.string().min(1),
  card_name: z.string(),
  version: z.number().int().positive(),
  as_of: z.string().date(),
  benefits: z.array(BenefitRuleSchema),
  effective_from: z.string().date(),
  effective_to: z.string().date().nullable(),
  source_url: z.string().url().optional(),
  changelog_url: z.string().url().optional(),
});

export type BenefitWebhookEventType = z.infer<typeof BenefitWebhookEventTypeSchema>;
export type BenefitWebhookPayload = z.infer<typeof BenefitWebhookPayloadSchema>;
export type BenefitChangelogEntry = z.infer<typeof BenefitChangelogEntrySchema>;
export type BenefitChangelogResponse = z.infer<typeof BenefitChangelogResponseSchema>;
export type BenefitLookupQuery = z.infer<typeof BenefitLookupQuerySchema>;
export type CardBenefitsResponse = z.infer<typeof CardBenefitsResponseSchema>;

/** Build a webhook payload from a published benefit version. */
export function buildWebhookPayload(input: {
  cardId: string;
  version: number;
  previousVersion?: number;
  changes: z.infer<typeof BenefitChangeSchema>[];
  eventType?: BenefitWebhookEventType;
}): BenefitWebhookPayload {
  return BenefitWebhookPayloadSchema.parse({
    id: randomUUID(),
    type: input.eventType ?? (input.previousVersion ? 'benefit.updated' : 'benefit.created'),
    created_at: new Date().toISOString(),
    data: {
      card_id: input.cardId,
      version: input.version,
      previous_version: input.previousVersion,
      changes: input.changes,
    },
  });
}
