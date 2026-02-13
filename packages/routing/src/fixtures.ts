import type { BenefitRule, PointsValuationTable } from '@stipulate/schema';
import { BenefitRuleSchema } from '@stipulate/schema';
import type { CardBenefitBundle } from './engine.js';

/** Default points valuation table for routing when DB unavailable. */
export const DEFAULT_VALUATION_TABLE: PointsValuationTable = {
  version: '2026.06-default',
  updatedAt: new Date().toISOString(),
  defaultCpp: 1.0,
  programs: [
    { id: 'chase_ur', name: 'Chase Ultimate Rewards', issuer: 'Chase', centsPerPoint: 1.25, floorCpp: 1.0, ceilingCpp: 2.0, transferPartners: ['hyatt', 'united', 'southwest'], poolsAcrossCards: true },
    { id: 'amex_mr', name: 'Amex Membership Rewards', issuer: 'Amex', centsPerPoint: 1.6, floorCpp: 1.0, ceilingCpp: 2.0, transferPartners: ['delta', 'hilton', 'marriott'], poolsAcrossCards: true },
    { id: 'citi_thankyou', name: 'Citi ThankYou Points', issuer: 'Citi', centsPerPoint: 1.1, floorCpp: 0.8, ceilingCpp: 1.6, transferPartners: ['turkish', 'jetblue'], poolsAcrossCards: true },
    { id: 'capital_one_miles', name: 'Capital One Miles', issuer: 'Capital One', centsPerPoint: 1.0, floorCpp: 0.8, ceilingCpp: 1.4, transferPartners: ['turkish', 'air canada'], poolsAcrossCards: true },
    { id: 'discover_cashback', name: 'Discover Cashback', issuer: 'Discover', centsPerPoint: 1.0, floorCpp: 1.0, ceilingCpp: 1.0, transferPartners: [], poolsAcrossCards: false },
  ],
};

/** Demo card bundles for tests and fallback routing. */
export const DEMO_CARD_BUNDLES: CardBenefitBundle[] = [
  {
    cardId: 'chase_sapphire_preferred',
    rules: [
      BenefitRuleSchema.parse({ id: 'rule-csp-dining', cardId: 'chase_sapphire_preferred', name: '3x Dining', category: 'dining', multiplier: 3, rewardType: 'points', caps: [], exclusions: [] }),
      BenefitRuleSchema.parse({ id: 'rule-csp-travel', cardId: 'chase_sapphire_preferred', name: '2x Travel', category: 'travel', multiplier: 2, rewardType: 'points', caps: [], exclusions: [] }),
      BenefitRuleSchema.parse({ id: 'rule-csp-other', cardId: 'chase_sapphire_preferred', name: '1x Base', category: 'other', multiplier: 1, rewardType: 'points', caps: [], exclusions: [] }),
    ],
  },
  {
    cardId: 'amex_gold',
    rules: [
      BenefitRuleSchema.parse({
        id: 'rule-amex-dining', cardId: 'amex_gold', name: '4x Dining', category: 'dining', multiplier: 4, rewardType: 'points', caps: [],
        exclusions: [{ id: 'ex-ff', type: 'merchant', matcher: 'fast food' }],
      }),
      BenefitRuleSchema.parse({
        id: 'rule-amex-grocery', cardId: 'amex_gold', name: '4x Groceries', category: 'groceries', multiplier: 4, rewardType: 'points',
        caps: [{ id: 'cap-grocery', period: 'annual', limit: { amountMinor: 2500000, currency: 'USD' }, description: '$25K annual cap' }],
        exclusions: [],
      }),
      BenefitRuleSchema.parse({ id: 'rule-amex-other', cardId: 'amex_gold', name: '1x Base', category: 'other', multiplier: 1, rewardType: 'points', caps: [], exclusions: [] }),
    ],
  },
  {
    cardId: 'capital_one_venture',
    rules: [
      BenefitRuleSchema.parse({ id: 'rule-c1-travel', cardId: 'capital_one_venture', name: '5x Portal Travel', category: 'travel', multiplier: 5, rewardType: 'miles', caps: [], exclusions: [] }),
      BenefitRuleSchema.parse({ id: 'rule-c1-other', cardId: 'capital_one_venture', name: '2x Everything', category: 'other', multiplier: 2, rewardType: 'miles', caps: [], exclusions: [] }),
    ],
  },
];

/** Get demo bundle by card id. */
export function getDemoBundle(cardId: string): BenefitRule[] {
  return DEMO_CARD_BUNDLES.find((b) => b.cardId === cardId)?.rules ?? [];
}
