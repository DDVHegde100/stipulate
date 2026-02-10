import type { SpendingCategory } from '@stipulate/schema';

/** Visa/Mastercard MCC range → canonical spending category. */
export const MCC_CATEGORY_RANGES: Array<{
  mccStart: number;
  mccEnd: number;
  category: SpendingCategory;
  label: string;
}> = [
  { mccStart: 5812, mccEnd: 5814, category: 'dining', label: 'Restaurants & Bars' },
  { mccStart: 5411, mccEnd: 5411, category: 'groceries', label: 'Grocery Stores' },
  { mccStart: 3000, mccEnd: 3299, category: 'airfare', label: 'Airlines' },
  { mccStart: 4511, mccEnd: 4511, category: 'airfare', label: 'Air Carriers' },
  { mccStart: 7011, mccEnd: 7011, category: 'hotels', label: 'Hotels & Motels' },
  { mccStart: 4111, mccEnd: 4112, category: 'transit', label: 'Local/Suburban Transit' },
  { mccStart: 4121, mccEnd: 4121, category: 'transit', label: 'Taxicabs & Rideshare' },
  { mccStart: 5541, mccEnd: 5542, category: 'gas', label: 'Gas Stations' },
  { mccStart: 5542, mccEnd: 5542, category: 'gas', label: 'Automated Fuel Dispensers' },
  { mccStart: 4899, mccEnd: 4899, category: 'streaming', label: 'Cable/Streaming' },
  { mccStart: 7832, mccEnd: 7832, category: 'entertainment', label: 'Motion Picture Theaters' },
  { mccStart: 5912, mccEnd: 5912, category: 'healthcare', label: 'Drug Stores & Pharmacies' },
  { mccStart: 4900, mccEnd: 4900, category: 'utilities', label: 'Utilities' },
  { mccStart: 5300, mccEnd: 5399, category: 'retail', label: 'Wholesale/Retail' },
  { mccStart: 6010, mccEnd: 6051, category: 'cash_equivalent', label: 'Financial Institutions' },
  { mccStart: 8398, mccEnd: 8398, category: 'charity', label: 'Charitable Organizations' },
];

/** Resolve MCC code to spending category. */
export function categoryFromMcc(mcc: string | number): SpendingCategory {
  const code = typeof mcc === 'string' ? parseInt(mcc, 10) : mcc;
  if (Number.isNaN(code)) return 'other';

  for (const range of MCC_CATEGORY_RANGES) {
    if (code >= range.mccStart && code <= range.mccEnd) {
      return range.category;
    }
  }

  return 'other';
}

/** Map issuer-specific category labels that diverge from MCC standards. */
export const ISSUER_CATEGORY_OVERRIDES: Record<
  string,
  Record<string, SpendingCategory>
> = {
  amex: {
    'entertainment': 'entertainment',
    'telecommunications': 'streaming',
    'supermarkets': 'groceries',
    'us restaurants': 'dining',
    'airline tickets': 'airfare',
    'prepaid hotels': 'hotels',
    'transit including trains taxis rideshare': 'transit',
  },
  chase: {
    'chase dining': 'dining',
    'chase travel': 'travel',
    'lyft': 'transit',
    'doordash': 'dining',
    'peloton': 'entertainment',
  },
  citi: {
    'supermarkets': 'groceries',
    'dining': 'dining',
    'gas stations': 'gas',
    'american airlines': 'airfare',
  },
  'capital-one': {
    'dining': 'dining',
    'entertainment': 'entertainment',
    'grocery stores': 'groceries',
  },
};

/** Apply issuer-specific category override if present. */
export function applyIssuerCategoryOverride(
  issuer: string,
  rawCategory: string,
): SpendingCategory | null {
  const issuerKey = issuer.toLowerCase().replace(/\s+/g, '-');
  const overrides = ISSUER_CATEGORY_OVERRIDES[issuerKey];
  if (!overrides) return null;

  const key = rawCategory.toLowerCase().trim();
  return overrides[key] ?? null;
}

/** Validate category against MCC when both are known — flag mismatches. */
export function validateCategoryMccConsistency(
  category: SpendingCategory,
  mcc?: string,
): { consistent: boolean; expectedCategory?: SpendingCategory; note?: string } {
  if (!mcc) return { consistent: true };

  const expected = categoryFromMcc(mcc);
  if (expected === category) return { consistent: true };

  if (expected === 'other') return { consistent: true, note: 'MCC not in known ranges' };

  return {
    consistent: false,
    expectedCategory: expected,
    note: `Category "${category}" may not match MCC ${mcc} (expected "${expected}")`,
  };
}

/** Group MCC ranges by category for documentation and routing hints. */
export function getMccRangesByCategory(): Map<SpendingCategory, string[]> {
  const map = new Map<SpendingCategory, string[]>();

  for (const range of MCC_CATEGORY_RANGES) {
    const existing = map.get(range.category) ?? [];
    existing.push(`${range.mccStart}-${range.mccEnd} (${range.label})`);
    map.set(range.category, existing);
  }

  return map;
}
