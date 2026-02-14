import type { BenefitRule, Exclusion, MerchantEnrichment, Money, SpendingCategory } from '@stipulate/schema';
import { matchesExclusion } from '@stipulate/schema';

export interface ExclusionCheckResult {
  excluded: boolean;
  exclusion?: Exclusion;
  reason?: string;
}

/** Known fast-food merchants for exclusion matching. */
const FAST_FOOD_PATTERNS = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc', 'subway', 'chipotle', 'panda express',
];

function isFastFoodMerchant(merchantName: string): boolean {
  const lower = merchantName.toLowerCase();
  return FAST_FOOD_PATTERNS.some((p) => lower.includes(p));
}

/** Check all exclusions on a benefit rule against transaction context. */
export function checkRuleExclusions(
  rule: BenefitRule,
  merchantName: string,
  mcc?: string,
  category?: SpendingCategory,
): ExclusionCheckResult {
  for (const exclusion of rule.exclusions) {
    if (
      exclusion.type === 'merchant' &&
      exclusion.matcher === 'fast food' &&
      isFastFoodMerchant(merchantName)
    ) {
      return {
        excluded: true,
        exclusion,
        reason: exclusion.reason ?? 'Fast food excluded from dining category',
      };
    }

    if (matchesExclusion(exclusion, merchantName, mcc, category)) {
      return {
        excluded: true,
        exclusion,
        reason: exclusion.reason ?? `Excluded by ${exclusion.type}: ${exclusion.matcher}`,
      };
    }
  }
  return { excluded: false };
}

/** Categories that map to a broader benefit rule category. */
const CATEGORY_ALIASES: Record<string, SpendingCategory[]> = {
  airfare: ['travel', 'airfare', 'other'],
  hotels: ['travel', 'hotels', 'other'],
  travel: ['travel', 'airfare', 'hotels', 'other'],
  transit: ['transit', 'travel', 'other'],
  streaming: ['streaming', 'entertainment', 'other'],
  retail: ['retail', 'other'],
};

function ruleCategoriesFor(category: SpendingCategory): SpendingCategory[] {
  return CATEGORY_ALIASES[category] ?? [category, 'other'];
}

/** Find the best matching benefit rule for a spending category. */
export function findMatchingRule(
  rules: BenefitRule[],
  category: SpendingCategory,
  merchantName: string,
  mcc?: string,
): { rule: BenefitRule; excluded: ExclusionCheckResult } | null {
  const eligibleCategories = ruleCategoriesFor(category);
  const categoryRules = rules.filter((r) => eligibleCategories.includes(r.category));
  const sorted = [...categoryRules].sort((a, b) => {
    const aPriority = eligibleCategories.indexOf(a.category);
    const bPriority = eligibleCategories.indexOf(b.category);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.multiplier - a.multiplier;
  });

  for (const rule of sorted) {
    const exclusion = checkRuleExclusions(rule, merchantName, mcc, category);
    if (!exclusion.excluded) {
      return { rule, excluded: exclusion };
    }
  }

  const fallback = rules.find((r) => r.category === 'other');
  if (fallback) {
    const exclusion = checkRuleExclusions(fallback, merchantName, mcc, category);
    if (!exclusion.excluded) {
      return { rule: fallback, excluded: exclusion };
    }
  }

  return null;
}

/** Collect all exclusion hits across rules for explainability. */
export function collectExclusionHits(
  rules: BenefitRule[],
  merchantName: string,
  mcc?: string,
  category?: SpendingCategory,
): Array<{ ruleId: string; exclusion: Exclusion; reason: string }> {
  const hits: Array<{ ruleId: string; exclusion: Exclusion; reason: string }> = [];

  for (const rule of rules) {
    const result = checkRuleExclusions(rule, merchantName, mcc, category);
    if (result.excluded && result.exclusion) {
      hits.push({
        ruleId: rule.id,
        exclusion: result.exclusion,
        reason: result.reason ?? 'Excluded',
      });
    }
  }

  return hits;
}

/** Resolve effective spending category from enrichment with fallback. */
export function resolveSpendCategory(enrichment: MerchantEnrichment): SpendingCategory {
  return enrichment.category ?? 'other';
}

/** Check if transaction amount meets rule minimum spend. */
export function meetsMinSpend(rule: BenefitRule, amount: Money): boolean {
  if (!rule.minSpend) return true;
  return amount.amountMinor >= rule.minSpend.amountMinor;
}
