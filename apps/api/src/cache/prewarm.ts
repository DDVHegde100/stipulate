import { DEFAULT_VALUATION_TABLE, DEMO_CARD_BUNDLES } from '@stipulate/routing';
import { setCachedJson, getCachedJson } from '../lib/redis.js';
import { prefixedKey } from './keys.js';
import {
  loadAllCardBundlesFromDb,
  loadCardBundlesFromDb,
} from '../services/benefit-bundle.loader.js';
import { benefitIndexKey } from './routing-cache.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger({ component: 'cache:prewarm' });

const BENEFIT_INDEX_TTL = 86_400;
const VALUATION_TTL = 86_400;

const VALUATION_KEY = () => prefixedKey('valuation', 'default');
const PREWARM_MANIFEST_KEY = () => prefixedKey('prewarm', 'manifest');

export interface PrewarmManifest {
  warmedAt: string;
  source: 'database' | 'demo';
  cardCount: number;
  cardBundleKeys: string[];
  valuationCached: boolean;
}

async function cacheBundle(cardId: string, bundle: unknown): Promise<string> {
  const key = prefixedKey('benefits', cardId);
  await setCachedJson(key, bundle, BENEFIT_INDEX_TTL);
  return key;
}

/** Preload benefit bundles and valuation table into Redis on startup. */
export async function prewarmRoutingCache(): Promise<PrewarmManifest> {
  const cardBundleKeys: string[] = [];
  let dbBundles = await loadAllCardBundlesFromDb();
  let source: PrewarmManifest['source'] = 'database';

  if (dbBundles.length === 0) {
    log.warn('No benefit rules in database; prewarming demo bundles');
    source = 'demo';
    dbBundles = DEMO_CARD_BUNDLES;
  }

  for (const bundle of dbBundles) {
    cardBundleKeys.push(await cacheBundle(bundle.cardId, bundle));
  }

  if (dbBundles.length > 0) {
    const compositeKey = benefitIndexKey(dbBundles.map((b) => b.cardId));
    await setCachedJson(compositeKey, dbBundles, BENEFIT_INDEX_TTL);
    cardBundleKeys.push(compositeKey);
  }

  await setCachedJson(VALUATION_KEY(), DEFAULT_VALUATION_TABLE, VALUATION_TTL);

  const manifest: PrewarmManifest = {
    warmedAt: new Date().toISOString(),
    source,
    cardCount: dbBundles.length,
    cardBundleKeys,
    valuationCached: true,
  };

  await setCachedJson(PREWARM_MANIFEST_KEY(), manifest, BENEFIT_INDEX_TTL);
  log.info({ source, cardCount: dbBundles.length }, 'Routing cache prewarmed');
  return manifest;
}

/** Prewarm cache for a specific set of card ids (e.g. after benefit publish). */
export async function prewarmCardBundles(cardIds: string[]): Promise<number> {
  const bundles = await loadCardBundlesFromDb(cardIds);
  for (const bundle of bundles) {
    await cacheBundle(bundle.cardId, bundle);
  }
  if (bundles.length > 0) {
    await setCachedJson(benefitIndexKey(cardIds), bundles, BENEFIT_INDEX_TTL);
  }
  return bundles.length;
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
