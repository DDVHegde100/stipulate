import { z } from 'zod';
import { SpendingCategorySchema } from './common.js';

/**
 * Canonical structured output from the LLM benefit parser.
 * Maps directly to issuer fine-print fields after normalization.
 */
export const ParsedBenefitSchema = z.object({
  card_id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, 'card_id must be lowercase snake_case'),
  category: SpendingCategorySchema,
  multiplier: z.number().nonnegative(),
  cap: z.number().nonnegative().nullable().default(null),
  cap_period: z
    .enum(['annual', 'quarterly', 'monthly', 'per_transaction', 'lifetime', 'none'])
    .nullable()
    .default(null),
  exclusions: z.array(z.string().min(1)).default([]),
  effective_date: z.string().date(),
  source_url: z.string().url(),
  confidence: z.number().min(0).max(1),
  /** Raw issuer wording before normalization (audit trail). */
  raw_category_label: z.string().optional(),
  /** Whether benefit requires cardholder activation. */
  requires_activation: z.boolean().default(false),
  /** Reward expression: points-per-dollar, cashback rate, or miles. */
  reward_type: z.enum(['points', 'cashback', 'miles']).default('points'),
});

/** Versioned bundle of parsed benefits for a single card. */
export const ParsedBenefitBundleSchema = z.object({
  card_id: z.string().min(1),
  version: z.number().int().positive(),
  parsed_at: z.string().datetime({ offset: true }),
  source_url: z.string().url(),
  content_hash: z.string().min(8),
  benefits: z.array(ParsedBenefitSchema).min(1),
  parser_model: z.string().optional(),
  average_confidence: z.number().min(0).max(1),
});

/** Diff entry when benefits change between versions. */
export const BenefitChangeSchema = z.object({
  card_id: z.string().min(1),
  field: z.string().min(1),
  category: SpendingCategorySchema.optional(),
  old_value: z.unknown(),
  new_value: z.unknown(),
  detected_at: z.string().datetime({ offset: true }),
  severity: z.enum(['breaking', 'material', 'minor']).default('material'),
});

export type ParsedBenefit = z.infer<typeof ParsedBenefitSchema>;
export type ParsedBenefitBundle = z.infer<typeof ParsedBenefitBundleSchema>;
export type BenefitChange = z.infer<typeof BenefitChangeSchema>;

/** Convert a ParsedBenefit into a partial BenefitRule-compatible shape. */
export function parsedBenefitToRuleFields(parsed: ParsedBenefit): {
  cardId: string;
  category: ParsedBenefit['category'];
  multiplier: number;
  rewardType: ParsedBenefit['reward_type'];
  requiresActivation: boolean;
  effectiveFrom: string;
  exclusions: Array<{ id: string; type: 'merchant' | 'category'; matcher: string }>;
} {
  return {
    cardId: parsed.card_id,
    category: parsed.category,
    multiplier: parsed.multiplier,
    rewardType: parsed.reward_type,
    requiresActivation: parsed.requires_activation,
    effectiveFrom: `${parsed.effective_date}T00:00:00.000Z`,
    exclusions: parsed.exclusions.map((ex, i) => ({
      id: `${parsed.card_id}_ex_${i}`,
      type: 'merchant' as const,
      matcher: ex,
    })),
  };
}

/** Compute average confidence across a bundle. */
export function computeBundleConfidence(benefits: ParsedBenefit[]): number {
  if (benefits.length === 0) return 0;
  const sum = benefits.reduce((acc, b) => acc + b.confidence, 0);
  return Math.round((sum / benefits.length) * 1000) / 1000;
}

/** Detect material changes between two benefit bundles. */
export function diffBenefitBundles(
  oldBundle: ParsedBenefitBundle,
  newBundle: ParsedBenefitBundle,
): BenefitChange[] {
  const changes: BenefitChange[] = [];
  const detectedAt = new Date().toISOString();

  const oldByCategory = new Map(oldBundle.benefits.map((b) => [b.category, b]));
  const newByCategory = new Map(newBundle.benefits.map((b) => [b.category, b]));

  for (const [category, newBenefit] of newByCategory) {
    const oldBenefit = oldByCategory.get(category);
    if (!oldBenefit) {
      changes.push({
        card_id: newBundle.card_id,
        field: 'category_added',
        category,
        old_value: null,
        new_value: newBenefit.multiplier,
        detected_at: detectedAt,
        severity: 'material',
      });
      continue;
    }

    if (oldBenefit.multiplier !== newBenefit.multiplier) {
      changes.push({
        card_id: newBundle.card_id,
        field: 'multiplier',
        category,
        old_value: oldBenefit.multiplier,
        new_value: newBenefit.multiplier,
        detected_at: detectedAt,
        severity: 'breaking',
      });
    }

    if (oldBenefit.cap !== newBenefit.cap) {
      changes.push({
        card_id: newBundle.card_id,
        field: 'cap',
        category,
        old_value: oldBenefit.cap,
        new_value: newBenefit.cap,
        detected_at: detectedAt,
        severity: 'material',
      });
    }

    const oldExcl = [...oldBenefit.exclusions].sort().join('|');
    const newExcl = [...newBenefit.exclusions].sort().join('|');
    if (oldExcl !== newExcl) {
      changes.push({
        card_id: newBundle.card_id,
        field: 'exclusions',
        category,
        old_value: oldBenefit.exclusions,
        new_value: newBenefit.exclusions,
        detected_at: detectedAt,
        severity: 'minor',
      });
    }
  }

  for (const [category] of oldByCategory) {
    if (!newByCategory.has(category)) {
      changes.push({
        card_id: newBundle.card_id,
        field: 'category_removed',
        category,
        old_value: oldByCategory.get(category)?.multiplier ?? null,
        new_value: null,
        detected_at: detectedAt,
        severity: 'breaking',
      });
    }
  }

  return changes;
}
