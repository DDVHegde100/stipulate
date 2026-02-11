import {
  MerchantEnrichmentSchema,
  normalizeMerchantName,
  categoryFromMccDescription,
  type MerchantEnrichment,
  type SpendingCategory,
} from '@stipulate/schema';
import { applyIssuerOverride } from './overrides/issuer-overrides.js';
import { loadMccDatabase, findMccMatches, type MccEntry } from './resolver-core.js';
import {
  parseStatementDescriptor,
  looksLikeStatementDescriptor,
} from './descriptor/parser.js';

export {
  loadMccDatabase,
  findMccMatches,
  scoreMccMatch,
  tokenize,
  jaccardSimilarity,
  resolveMccCode,
  type MccEntry,
  type MccMatchResult,
  type ResolveOptions,
} from './resolver-core.js';

export interface ResolveMerchantInput {
  merchantName: string;
  rawDescriptor?: string;
  mcc?: string;
  issuer?: string;
  minScore?: number;
}

/** Resolve merchant with optional descriptor parsing and direct MCC hint. */
export function resolveMerchant(
  merchantName: string,
  options: { issuer?: string; minScore?: number; maxCandidates?: number; rawDescriptor?: string; mcc?: string } = {},
): MerchantEnrichment {
  let name = merchantName;
  let descriptorConfidence = 0;

  const raw = options.rawDescriptor ?? merchantName;
  if (looksLikeStatementDescriptor(raw)) {
    const parsed = parseStatementDescriptor(raw);
    name = parsed.merchantName;
    descriptorConfidence = parsed.confidence;
  }

  if (options.mcc) {
    const entry = loadMccDatabase().find((e) => e.mcc === options.mcc);
    if (entry) {
      return MerchantEnrichmentSchema.parse({
        merchantName: name,
        normalizedName: normalizeMerchantName(name),
        mcc: entry.mcc,
        mccDescription: entry.description,
        category: entry.category,
        confidence: Math.max(0.95, descriptorConfidence),
        source: 'mcc_db',
        overrideApplied: options.issuer
          ? applyIssuerOverride(options.issuer, name)?.overrideApplied
          : undefined,
      });
    }
  }

  const matches = findMccMatches(name, options);
  const best = matches[0];

  let mcc = best?.mcc;
  let mccDescription = best?.description;
  let category: SpendingCategory | undefined = best?.category;
  let confidence = Math.max(best?.score ?? 0, descriptorConfidence * 0.9);
  let source: MerchantEnrichment['source'] = best ? 'mcc_db' : 'unknown';

  if (options.issuer) {
    const override = applyIssuerOverride(options.issuer, name);
    if (override) {
      mcc = override.mcc ?? mcc;
      category = override.category ?? category;
      confidence = Math.max(confidence, 0.9);
      source = 'override';
    }
  }

  if (!category && mccDescription) {
    category = categoryFromMccDescription(mccDescription);
  }

  return MerchantEnrichmentSchema.parse({
    merchantName: name,
    normalizedName: normalizeMerchantName(name),
    mcc,
    mccDescription,
    category,
    confidence,
    source,
    mccCandidates: matches.slice(1).map((m) => ({
      mcc: m.mcc,
      description: m.description,
      score: m.score,
    })),
    overrideApplied:
      options.issuer && source === 'override'
        ? applyIssuerOverride(options.issuer, name)?.overrideApplied
        : undefined,
  });
}

/** Batch resolve multiple merchant names. */
export function resolveMerchants(
  merchantNames: string[],
  options: { issuer?: string; minScore?: number; maxCandidates?: number } = {},
): MerchantEnrichment[] {
  return merchantNames.map((name) => resolveMerchant(name, options));
}

/** Merge crowd-sourced correction into enrichment. */
export function applyCorrection(
  enrichment: MerchantEnrichment,
  correction: { mcc: string; category: string; confidence: number },
  mccEntry?: MccEntry,
): MerchantEnrichment {
  return MerchantEnrichmentSchema.parse({
    ...enrichment,
    mcc: correction.mcc,
    mccDescription: mccEntry?.description ?? enrichment.mccDescription,
    category: correction.category as SpendingCategory,
    confidence: Math.max(enrichment.confidence, correction.confidence),
    source: 'user',
  });
}
