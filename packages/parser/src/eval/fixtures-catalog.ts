import type { EvalFixture } from './harness.js';
import { TOP25_FIXTURES } from './fixtures-top25.js';

export interface CatalogCardRef {
  id: string;
  issuer: string;
  productName: string;
}

/** Build a parser eval fixture from catalog metadata with generic earn text. */
export function buildFixtureFromCatalog(card: CatalogCardRef): EvalFixture {
  return {
    id: card.id.replace(/_/g, '-'),
    cardId: card.id,
    issuer: card.issuer,
    productName: card.productName,
    sourceText: [
      `${card.issuer} ${card.productName}`,
      'Earn 3x points on dining at restaurants worldwide.',
      'Earn 2x points on travel purchases including airfare and hotels.',
      'Earn 1x point on all other purchases.',
    ].join('\n'),
    expected: {
      categories: ['dining', 'travel', 'other'],
      minRules: 1,
      minConfidence: 0.6,
    },
  };
}

/** Build fixtures for catalog cards not already covered. */
export function buildFixturesForCards(
  cards: CatalogCardRef[],
  existingCardIds: Set<string>,
): EvalFixture[] {
  return cards
    .filter((card) => !existingCardIds.has(card.id))
    .map(buildFixtureFromCatalog);
}

/** Merge TOP25 with additional catalog cards up to target count. */
export function mergeCatalogFixtures(
  cards: CatalogCardRef[],
  targetCount: number,
  baseFixtures: EvalFixture[] = TOP25_FIXTURES,
): EvalFixture[] {
  const existing = new Set(baseFixtures.map((f) => f.cardId));
  const merged = [...baseFixtures];

  for (const card of cards) {
    if (merged.length >= targetCount) break;
    if (existing.has(card.id)) continue;
    merged.push(buildFixtureFromCatalog(card));
    existing.add(card.id);
  }

  return merged.slice(0, targetCount);
}
