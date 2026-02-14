import type { MerchantEnrichment } from '@stipulate/schema';
import { getCachedJson, setCachedJson } from '../lib/redis.js';
import { prefixedKey, hashKey } from './keys.js';

const ENRICH_TTL_SECONDS = 3600;
const BENEFIT_INDEX_TTL = 300;

function enrichCacheKey(normalizedName: string, mcc?: string, issuer?: string): string {
  return prefixedKey('enrich', hashKey(`${normalizedName}:${mcc ?? ''}:${issuer ?? ''}`));
}

export function benefitIndexKey(cardIds: string[]): string {
  return prefixedKey('benefits', hashKey(cardIds.sort().join(','), 12));
}

export async function getCachedEnrichment(
  normalizedName: string,
  mcc?: string,
  issuer?: string,
): Promise<MerchantEnrichment | null> {
  try {
    return await getCachedJson<MerchantEnrichment>(enrichCacheKey(normalizedName, mcc, issuer));
  } catch {
    return null;
  }
}

export async function setCachedEnrichment(
  normalizedName: string,
  enrichment: MerchantEnrichment,
  mcc?: string,
  issuer?: string,
): Promise<void> {
  try {
    await setCachedJson(enrichCacheKey(normalizedName, mcc, issuer), enrichment, ENRICH_TTL_SECONDS);
  } catch {
    // Cache write failures are non-fatal
  }
}

export async function getCachedBenefitIndex<T>(cardIds: string[]): Promise<T | null> {
  try {
    return await getCachedJson<T>(benefitIndexKey(cardIds));
  } catch {
    return null;
  }
}

export async function setCachedBenefitIndex<T>(cardIds: string[], data: T): Promise<void> {
  try {
    await setCachedJson(benefitIndexKey(cardIds), data, BENEFIT_INDEX_TTL);
  } catch {
    // non-fatal
  }
}
