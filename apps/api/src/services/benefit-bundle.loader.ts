import {
  BenefitRuleSchema,
  type BenefitRule,
} from '@stipulate/schema';
import type { CardBenefitBundle } from '@stipulate/routing';
import { DEMO_CARD_BUNDLES } from '@stipulate/routing';
import type { BenefitRuleRow } from '../repositories/benefit.repository.js';
import * as benefitRepo from '../repositories/benefit.repository.js';

/** Convert DB benefit rule rows into a routing CardBenefitBundle. */
export function rowsToBenefitBundle(cardId: string, rows: BenefitRuleRow[]): CardBenefitBundle | null {
  if (rows.length === 0) return null;

  const rules: BenefitRule[] = rows.map((row) =>
    BenefitRuleSchema.parse({
      id: row.id,
      cardId: row.card_id,
      name: `${row.multiplier}x ${row.category}`,
      category: row.category,
      multiplier: parseFloat(row.multiplier),
      rewardType: row.reward_type,
      caps: row.cap_amount_cents
        ? [{
            id: `cap-${row.id}`,
            period: row.cap_period ?? 'annual',
            limit: { amountMinor: row.cap_amount_cents, currency: 'USD' },
          }]
        : [],
      exclusions: Array.isArray(row.exclusions) ? row.exclusions : [],
    }),
  );

  return { cardId, rules };
}

/** Load benefit bundles for specific card ids from Postgres. */
export async function loadCardBundlesFromDb(cardIds: string[]): Promise<CardBenefitBundle[]> {
  const asOf = new Date().toISOString().slice(0, 10);
  const bundles: CardBenefitBundle[] = [];

  for (const cardId of cardIds) {
    const card = await benefitRepo.findCardUuid(cardId);
    if (!card) continue;

    const rows = await benefitRepo.getBenefitRules(card.uuid, asOf);
    const bundle = rowsToBenefitBundle(cardId, rows);
    if (bundle) bundles.push(bundle);
  }

  return bundles;
}

/** Load all cards that have at least one benefit rule in Postgres. */
export async function loadAllCardBundlesFromDb(): Promise<CardBenefitBundle[]> {
  const cardIds = await benefitRepo.listCardsWithBenefitRules();
  return loadCardBundlesFromDb(cardIds);
}

/** Demo bundles for cards missing DB rules (dev/test fallback). */
export function getDemoFallbackBundles(cardIds: string[]): CardBenefitBundle[] {
  return cardIds
    .map((id) => DEMO_CARD_BUNDLES.find((b) => b.cardId === id))
    .filter((b): b is CardBenefitBundle => b !== undefined);
}
