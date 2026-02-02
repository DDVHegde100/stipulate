import { z } from "zod";
import {
  BenefitPeriodSchema,
  ExclusionTypeSchema,
  MetadataSchema,
  MoneySchema,
  SpendingCategorySchema,
} from "./common.js";

/** Maximum reward or spend limit for a benefit within a period. */
export const BenefitCapSchema = z.object({
  id: z.string().min(1),
  period: BenefitPeriodSchema,
  limit: MoneySchema,
  /** When the cap resets (e.g. calendar year, statement cycle). */
  resetPolicy: z
    .enum(["calendar_year", "statement_cycle", "rolling", "none"])
    .default("calendar_year"),
  /** Human-readable description of the cap (e.g. "$150 annual dining credit"). */
  description: z.string().optional(),
  /** Whether unused cap balance carries forward. */
  carryForward: z.boolean().default(false),
});

/** Condition that disqualifies a transaction from earning a benefit. */
export const ExclusionSchema = z.object({
  id: z.string().min(1),
  type: ExclusionTypeSchema,
  /** Pattern or identifier to match (merchant name, MCC code, category slug, etc.). */
  matcher: z.string().min(1),
  /** Whether matcher is a regex; otherwise treated as case-insensitive substring. */
  isRegex: z.boolean().default(false),
  reason: z.string().optional(),
  /** Issuer-specific notes or citation from benefit guide. */
  sourceNote: z.string().optional(),
});

/** Reward earning rule attached to a card product. */
export const BenefitRuleSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: SpendingCategorySchema,
  /** Points or cents per dollar (e.g. 3x points = 3, 2% cashback = 0.02). */
  multiplier: z.number().nonnegative(),
  /** Whether multiplier is expressed as points-per-dollar vs cashback rate. */
  rewardType: z.enum(["points", "cashback", "miles"]).default("points"),
  caps: z.array(BenefitCapSchema).default([]),
  exclusions: z.array(ExclusionSchema).default([]),
  /** Minimum transaction amount to qualify. */
  minSpend: MoneySchema.optional(),
  /** Benefit activation window. */
  effectiveFrom: z.string().datetime({ offset: true }).optional(),
  effectiveTo: z.string().datetime({ offset: true }).optional(),
  /** Whether the benefit requires enrollment or activation. */
  requiresActivation: z.boolean().default(false),
  metadata: MetadataSchema.optional(),
});

export type BenefitCap = z.infer<typeof BenefitCapSchema>;
export type Exclusion = z.infer<typeof ExclusionSchema>;
export type BenefitRule = z.infer<typeof BenefitRuleSchema>;

/** Check whether a merchant name matches an exclusion rule. */
export function matchesExclusion(
  exclusion: Exclusion,
  merchantName: string,
  mcc?: string,
  category?: string,
): boolean {
  const normalizedMerchant = merchantName.toLowerCase().trim();

  switch (exclusion.type) {
    case "merchant": {
      if (exclusion.isRegex) {
        return new RegExp(exclusion.matcher, "i").test(merchantName);
      }
      return normalizedMerchant.includes(exclusion.matcher.toLowerCase());
    }
    case "mcc":
      return mcc !== undefined && mcc === exclusion.matcher;
    case "category":
      return category !== undefined && category === exclusion.matcher;
    case "channel":
    case "geography":
      return false;
    default:
      return false;
  }
}

/** Compute effective multiplier after applying caps (returns capped reward in minor units). */
export function computeCappedReward(
  rule: BenefitRule,
  spend: z.infer<typeof MoneySchema>,
  priorSpendInPeriodMinor = 0,
): number {
  const spendDecimal = spend.amountMinor / 100;
  let rewardMinor =
    rule.rewardType === "cashback"
      ? Math.round(spendDecimal * rule.multiplier * 100)
      : Math.round(spendDecimal * rule.multiplier);

  for (const cap of rule.caps) {
    const remainingCapMinor =
      cap.limit.amountMinor - priorSpendInPeriodMinor;
    if (remainingCapMinor <= 0) {
      return 0;
    }
    rewardMinor = Math.min(rewardMinor, remainingCapMinor);
  }

  return Math.max(0, rewardMinor);
}
