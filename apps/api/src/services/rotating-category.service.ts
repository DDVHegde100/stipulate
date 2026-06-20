import type { CardBenefitBundle } from '@stipulate/routing';
import { BenefitRuleSchema } from '@stipulate/schema';
import type { RotatingCategoryRow } from '../repositories/rotating-category.repository.js';

/** Apply user rotating-category selections to benefit bundles before routing. */
export function applyRotatingCategoryOverrides(
  bundles: CardBenefitBundle[],
  states: RotatingCategoryRow[],
  merchantCategory: string,
): CardBenefitBundle[] {
  if (states.length === 0) return bundles;

  const stateByCard = new Map(states.map((s) => [s.card_id, s]));

  return bundles.map((bundle) => {
    const state = stateByCard.get(bundle.cardId);
    if (!state || !state.activated || !state.active_category) return bundle;

    if (state.state_type === 'custom_cash_top') {
      const isTopCategory = state.active_category === merchantCategory;
      const boosted = BenefitRuleSchema.parse({
        id: `rotating-${bundle.cardId}-boost`,
        cardId: bundle.cardId,
        name: isTopCategory ? '5% top category' : '1% other purchases',
        category: isTopCategory ? merchantCategory : 'other',
        multiplier: isTopCategory ? 0.05 : 0.01,
        rewardType: 'cashback',
        caps: [],
        exclusions: [],
      });

      return {
        cardId: bundle.cardId,
        rules: [boosted, ...bundle.rules.filter((r) => r.category === 'other')],
      };
    }

    if (state.state_type === 'discover_quarter' || state.state_type === 'chase_quarter') {
      const isActiveQuarterCategory = state.active_category === merchantCategory;
      if (!isActiveQuarterCategory) return bundle;

      const quarterRule = BenefitRuleSchema.parse({
        id: `rotating-${bundle.cardId}-quarter`,
        cardId: bundle.cardId,
        name: '5% rotating category',
        category: merchantCategory,
        multiplier: 0.05,
        rewardType: 'cashback',
        caps: [],
        exclusions: [],
      });

      return {
        cardId: bundle.cardId,
        rules: [quarterRule, ...bundle.rules],
      };
    }

    return bundle;
  });
}
