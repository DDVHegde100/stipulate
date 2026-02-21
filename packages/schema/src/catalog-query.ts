import { z } from 'zod';

export const CardCatalogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  issuer: z.string().min(1).optional(),
  network: z.enum(['visa', 'mastercard', 'amex', 'discover']).optional(),
  q: z.string().min(1).optional(),
});

export const CardSummarySchema = z.object({
  card_id: z.string().min(1),
  name: z.string().min(1),
  issuer_slug: z.string().nullable(),
  issuer_name: z.string().nullable(),
  network: z.string(),
  annual_fee_cents: z.number().int().nonnegative(),
  is_active: z.boolean(),
  benefit_guide_url: z.string().nullable(),
});

export const CardCatalogResponseSchema = z.object({
  cards: z.array(CardSummarySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type CardCatalogQuery = z.infer<typeof CardCatalogQuerySchema>;
export type CardSummary = z.infer<typeof CardSummarySchema>;
export type CardCatalogResponse = z.infer<typeof CardCatalogResponseSchema>;
