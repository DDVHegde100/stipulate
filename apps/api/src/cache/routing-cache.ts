import { createHash } from 'node:crypto';
import type { MerchantEnrichment } from '@stipulate/schema';
import { getCachedJson, setCachedJson } from '../lib/redis.js';

const ENRICH_TTL_SECONDS = 3600;

function cacheKey(normalizedName: string, mcc?: string, issuer?: string): string {
  const hash = createHash('sha256')
    .update(`${normalizedName}:${mcc ?? ''}:${issuer ?? ''}`)
    .digest('hex')
    .slice(0, 16);
  return `stipulate:enrich:${hash}`;
}

export async function getCachedEnrichment(
  normalizedName: string,
  mcc?: string,
  issuer?: string,
): Promise<MerchantEnrichment | null> {
  try {
    return await getCachedJson<MerchantEnrichment>(cacheKey(normalizedName, mcc, issuer));
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
    await setCachedJson(cacheKey(normalizedName, mcc, issuer), enrichment, ENRICH_TTL_SECONDS);
  } catch {
    // Cache write failures are non-fatal
  }
}

export function benefitIndexKey(cardIds: string[]): string {
  const hash = createHash('sha256').update(cardIds.sort().join(',')).digest('hex').slice(0, 12);
  return `stipulate:benefits:${hash}`;
}

const BENEFIT_INDEX_TTL = 300;

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
