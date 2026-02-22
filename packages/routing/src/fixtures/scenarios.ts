import type { RouteRequest, SpendingCategory } from '@stipulate/schema';
import { DEMO_CARD_BUNDLES } from '../fixtures.js';

const MERCHANTS: Array<{ name: string; mcc: string; category: SpendingCategory }> = [
  { name: 'Starbucks', mcc: '5814', category: 'dining' },
  { name: 'Chipotle', mcc: '5814', category: 'dining' },
  { name: 'Whole Foods', mcc: '5411', category: 'groceries' },
  { name: 'Kroger', mcc: '5411', category: 'groceries' },
  { name: 'Delta Air Lines', mcc: '4511', category: 'airfare' },
  { name: 'United Airlines', mcc: '4511', category: 'airfare' },
  { name: 'Marriott', mcc: '7011', category: 'hotels' },
  { name: 'Shell', mcc: '5541', category: 'gas' },
  { name: 'Chevron', mcc: '5541', category: 'gas' },
  { name: 'Amazon', mcc: '5399', category: 'retail' },
  { name: 'Target', mcc: '5310', category: 'retail' },
  { name: 'Uber', mcc: '4121', category: 'transit' },
  { name: 'Lyft', mcc: '4121', category: 'transit' },
  { name: 'Netflix', mcc: '4899', category: 'streaming' },
  { name: 'AMC Theatres', mcc: '7832', category: 'entertainment' },
];

const CARD_SETS = [
  ['chase_sapphire_preferred', 'amex_gold'],
  ['chase_sapphire_preferred', 'amex_gold', 'capital_one_venture'],
  ['amex_gold'],
  ['chase_sapphire_preferred'],
  ['capital_one_venture', 'amex_gold'],
];

/** Generate N diverse routing scenarios for regression testing. */
export function generateRoutingScenarios(count = 500): Array<{
  id: string;
  request: RouteRequest;
  expectBestCard?: string;
}> {
  const scenarios: Array<{ id: string; request: RouteRequest; expectBestCard?: string }> = [];

  for (let i = 0; i < count; i++) {
    const merchant = MERCHANTS[i % MERCHANTS.length]!;
    const cards = CARD_SETS[i % CARD_SETS.length]!;
    const amountMinor = 500 + ((i * 137) % 50000);

    scenarios.push({
      id: `scenario-${String(i).padStart(4, '0')}`,
      request: {
        merchantName: merchant.name,
        mcc: merchant.mcc,
        amount: { amountMinor, currency: 'USD' },
        userCardIds: cards,
        channel: i % 3 === 0 ? 'online' : 'in_store',
        isInternational: i % 17 === 0,
        preferences: { optimizeFor: 'max_reward', excludeCardIds: [] },
        trackSpend: false,
      },
    });
  }

  return scenarios;
}

export { DEMO_CARD_BUNDLES, MERCHANTS, CARD_SETS };
