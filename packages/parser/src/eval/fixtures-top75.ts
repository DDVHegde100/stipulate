import { mergeCatalogFixtures, type CatalogCardRef } from './fixtures-catalog.js';
import { TOP25_FIXTURES } from './fixtures-top25.js';

/** First 75 cards from catalog-full.json (loaded at seed/runtime). */
export function buildTop75Fixtures(cards: CatalogCardRef[]) {
  return mergeCatalogFixtures(cards, 75, TOP25_FIXTURES);
}

/** First 150 cards from catalog-full.json (loaded at seed/runtime). */
export function buildTop150Fixtures(cards: CatalogCardRef[]) {
  return mergeCatalogFixtures(cards, 150, TOP25_FIXTURES);
}

export { TOP25_FIXTURES };
