import { describe, expect, it } from 'vitest';

import { DEMO_CARD_BUNDLES } from '@stipulate/routing';
import { applyRotatingCategoryOverrides } from '../services/rotating-category.service.js';

describe('applyRotatingCategoryOverrides', () => {
  it('boosts custom cash top category earn rate', () => {
    const bundle = DEMO_CARD_BUNDLES.find((b) => b.cardId === 'amex_gold')!;
    const states = [
      {
        id: '1',
        consumer_user_id: null,
        org_id: null,
        user_ref: 'default',
        card_id: 'citi_custom_cash',
        state_type: 'custom_cash_top' as const,
        active_category: 'dining',
        quarter_key: '2026-Q2',
        effective_from: new Date(),
        effective_to: null,
        activated: true,
      },
    ];

    const customCashBundle = {
      cardId: 'citi_custom_cash',
      rules: bundle.rules,
    };

    const adjusted = applyRotatingCategoryOverrides([customCashBundle], states, 'dining');
    expect(adjusted[0]?.rules[0]?.multiplier).toBe(0.05);
  });

  it('applies discover quarterly category boost when activated', () => {
    const bundle = DEMO_CARD_BUNDLES.find((b) => b.cardId === 'amex_gold')!;
    const states = [
      {
        id: '2',
        consumer_user_id: null,
        org_id: null,
        user_ref: 'default',
        card_id: 'discover_it',
        state_type: 'discover_quarter' as const,
        active_category: 'groceries',
        quarter_key: '2026-Q2',
        effective_from: new Date(),
        effective_to: null,
        activated: true,
      },
    ];

    const discoverBundle = {
      cardId: 'discover_it',
      rules: bundle.rules,
    };

    const adjusted = applyRotatingCategoryOverrides([discoverBundle], states, 'groceries');
    expect(adjusted[0]?.rules[0]?.multiplier).toBe(0.05);
    expect(adjusted[0]?.rules[0]?.category).toBe('groceries');
  });

  it('does not boost discover quarter category when merchant category differs', () => {
    const bundle = DEMO_CARD_BUNDLES.find((b) => b.cardId === 'amex_gold')!;
    const states = [
      {
        id: '3',
        consumer_user_id: null,
        org_id: null,
        user_ref: 'default',
        card_id: 'discover_it',
        state_type: 'discover_quarter' as const,
        active_category: 'groceries',
        quarter_key: '2026-Q2',
        effective_from: new Date(),
        effective_to: null,
        activated: true,
      },
    ];

    const discoverBundle = {
      cardId: 'discover_it',
      rules: bundle.rules,
    };

    const adjusted = applyRotatingCategoryOverrides([discoverBundle], states, 'dining');
    expect(adjusted[0]?.rules).toEqual(bundle.rules);
  });
});
