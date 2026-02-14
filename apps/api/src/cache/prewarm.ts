import { DEMO_CARD_BUNDLES, DEFAULT_VALUATION_TABLE } from '@stipulate/routing';
import { setCachedJson, getCachedJson } from '../lib/redis.js';
import { prefixedKey } from './keys.js';

const VALUATION_KEY = () => prefixedKey('valuation', 'default');
const PREWARM_MANIFEST_KEY = () => prefixedKey('prewarm', 'manifest');

const BENEFIT_INDEX_TTL = 86_400;
const VALUATION_TTL = 86_400;

export interface PrewarmManifest {
  warmedAt: string;
  cardBundleKeys: string[];
  valuationCached: boolean;
}

/** Preload demo benefit bundles and valuation table into Redis on startup. */
export async function prewarmRoutingCache(): Promise<PrewarmManifest> {
  const cardBundleKeys: string[] = [];

  for (const bundle of DEMO_CARD_BUNDLES) {
    const key = prefixedKey('benefits', bundle.cardId);
    await setCachedJson(key, bundle.rules, BENEFIT_INDEX_TTL);
    cardBundleKeys.push(key);
  }

  const allIds = DEMO_CARD_BUNDLES.map((b) => b.cardId).sort();
  const compositeKey = prefixedKey('benefits', 'index', allIds.join(','));
  await setCachedJson(compositeKey, DEMO_CARD_BUNDLES, BENEFIT_INDEX_TTL);
  cardBundleKeys.push(compositeKey);

  await setCachedJson(VALUATION_KEY(), DEFAULT_VALUATION_TABLE, VALUATION_TTL);

  const manifest: PrewarmManifest = {
    warmedAt: new Date().toISOString(),
    cardBundleKeys,
    valuationCached: true,
  };

  await setCachedJson(PREWARM_MANIFEST_KEY(), manifest, BENEFIT_INDEX_TTL);
  return manifest;
}

export async function getPrewarmManifest(): Promise<PrewarmManifest | null> {
  try {
    return await getCachedJson<PrewarmManifest>(PREWARM_MANIFEST_KEY());
  } catch {
    return null;
  }
}

export async function getCachedValuation<T>(): Promise<T | null> {
  try {
    return await getCachedJson<T>(VALUATION_KEY());
  } catch {
    return null;
  }
}
