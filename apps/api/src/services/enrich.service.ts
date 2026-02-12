import {
  EnrichRequestSchema,
  EnrichResponseSchema,
  MccCorrectionRequestSchema,
  normalizeMerchantName,
  type EnrichRequest,
  type EnrichResponse,
  type MccCorrectionRequest,
} from '@stipulate/schema';
import {
  resolveMerchant,
  applyCorrection,
  resolveMccCode,
  looksLikeStatementDescriptor,
  enrichFromReceiptOcr,
} from '@stipulate/mcc';
import * as merchantRepo from '../repositories/merchant.repository.js';
import { getCachedEnrichment, setCachedEnrichment } from '../cache/routing-cache.js';

export class EnrichServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_REQUEST' | 'RECEIPT_PARSE_FAILED' | 'INTERNAL',
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'EnrichServiceError';
  }
}

export async function enrichMerchant(
  request: EnrichRequest,
  requestId: string,
): Promise<EnrichResponse> {
  const parsed = EnrichRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new EnrichServiceError('Invalid enrich request', 'INVALID_REQUEST', {
      issues: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;

  if (payload.receiptOcrText) {
    const { receipt, enrichment } = enrichFromReceiptOcr(payload.receiptOcrText, {
      issuer: payload.issuer,
    });
    if (!enrichment) {
      throw new EnrichServiceError('Could not extract merchant from receipt OCR text', 'RECEIPT_PARSE_FAILED', {
        parseNotes: receipt.parseNotes,
      });
    }
    return EnrichResponseSchema.parse({
      requestId,
      enrichment,
      descriptorParsed: false,
      receiptParsed: true,
      cached: false,
      enrichedAt: new Date().toISOString(),
    });
  }

  const normalized = normalizeMerchantName(payload.merchantName);

  if (process.env.NODE_ENV !== 'test') {
    const cached = await getCachedEnrichment(normalized, payload.mcc, payload.issuer);
    if (cached) {
      return EnrichResponseSchema.parse({
        requestId,
        enrichment: cached,
        descriptorParsed: looksLikeStatementDescriptor(payload.rawDescriptor ?? payload.merchantName),
        receiptParsed: false,
        cached: true,
        enrichedAt: new Date().toISOString(),
      });
    }
  }

  let enrichment = resolveMerchant(payload.merchantName, {
    mcc: payload.mcc,
    issuer: payload.issuer,
    rawDescriptor: payload.rawDescriptor,
  });

  if (process.env.NODE_ENV !== 'test') {
    const dbMapping =
      (await merchantRepo.findMerchantMapping(normalized)) ??
      (await merchantRepo.findMerchantMappingFuzzy(normalized));

    if (dbMapping) {
      enrichment = applyCorrection(
        enrichment,
        {
          mcc: dbMapping.mcc,
          category: dbMapping.category,
          confidence: parseFloat(dbMapping.confidence),
        },
        resolveMccCode(dbMapping.mcc),
      );
    }

    await setCachedEnrichment(normalized, enrichment, payload.mcc, payload.issuer);
  }

  return EnrichResponseSchema.parse({
    requestId,
    enrichment,
    descriptorParsed: looksLikeStatementDescriptor(payload.rawDescriptor ?? payload.merchantName),
    receiptParsed: false,
    cached: false,
    enrichedAt: new Date().toISOString(),
  });
}

export async function submitCorrection(
  request: MccCorrectionRequest,
): Promise<{ id: string; merchantNameNormalized: string; mcc: string; category: string; status: string; createdAt: string }> {
  const parsed = MccCorrectionRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new EnrichServiceError('Invalid correction request', 'INVALID_REQUEST', {
      issues: parsed.error.flatten(),
    });
  }

  const normalized = normalizeMerchantName(parsed.data.merchantName);
  const row = await merchantRepo.submitMccCorrection({
    merchantNameNormalized: normalized,
    mcc: parsed.data.mcc,
    category: parsed.data.category,
    confidence: parsed.data.confidence,
    source: parsed.data.source,
    notes: parsed.data.notes,
  });

  return {
    id: row.id,
    merchantNameNormalized: row.merchant_name_normalized,
    mcc: row.mcc,
    category: row.category,
    status: row.status,
    createdAt: new Date().toISOString(),
  };
}

export { EnrichRequestSchema, EnrichResponseSchema, MccCorrectionRequestSchema };
