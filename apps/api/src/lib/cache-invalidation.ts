import { deleteCachedJson } from './redis.js';
import { benefitIndexKey } from '../cache/routing-cache.js';

/** Invalidate Redis benefit index cache for given card IDs. */
export async function invalidateBenefitIndex(cardIds: string[]): Promise<void> {
  if (process.env.NODE_ENV === 'test' || cardIds.length === 0) return;

  try {
    await deleteCachedJson(benefitIndexKey(cardIds));
    for (const cardId of cardIds) {
      await deleteCachedJson(`stipulate:benefits:${cardId}`);
    }
  } catch {
    // non-fatal
  }
}
