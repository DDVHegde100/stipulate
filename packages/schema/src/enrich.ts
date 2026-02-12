import { z } from 'zod';
import { MerchantEnrichmentSchema } from './merchant.js';

/** Request body for POST /v1/enrich. */
export const EnrichRequestSchema = z.object({
  merchantName: z.string().min(1).max(512),
  rawDescriptor: z.string().max(512).optional(),
  mcc: z.string().regex(/^\d{4}$/).optional(),
  issuer: z.string().max(128).optional(),
  receiptOcrText: z.string().max(8192).optional(),
});

/** Response wrapper for enrich endpoint. */
export const EnrichResponseSchema = z.object({
  requestId: z.string().min(1),
  enrichment: MerchantEnrichmentSchema,
  descriptorParsed: z.boolean().default(false),
  receiptParsed: z.boolean().default(false),
  cached: z.boolean().default(false),
  enrichedAt: z.string().datetime({ offset: true }),
});

/** Crowd-sourced MCC correction submission. */
export const MccCorrectionRequestSchema = z.object({
  merchantName: z.string().min(1).max(512),
  mcc: z.string().regex(/^\d{4}$/),
  category: z.string().min(1).max(64),
  confidence: z.number().min(0).max(1).default(0.85),
  source: z.enum(['user', 'integrator', 'admin']).default('user'),
  notes: z.string().max(512).optional(),
});

export const MccCorrectionResponseSchema = z.object({
  id: z.string().uuid(),
  merchantNameNormalized: z.string(),
  mcc: z.string(),
  category: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  createdAt: z.string().datetime({ offset: true }),
});

export type EnrichRequest = z.infer<typeof EnrichRequestSchema>;
export type EnrichResponse = z.infer<typeof EnrichResponseSchema>;
export type MccCorrectionRequest = z.infer<typeof MccCorrectionRequestSchema>;
export type MccCorrectionResponse = z.infer<typeof MccCorrectionResponseSchema>;
