import type { RawParsedBenefit } from '../types.js';

/** Confidence threshold below which human review is required. */
export const CONFIDENCE_REVIEW_THRESHOLD = 0.85;

/** Factors used to compute per-benefit confidence scores. */
export interface ConfidenceFactors {
  hasExplicitMultiplier: boolean;
  hasCategoryMatch: boolean;
  hasCapSpecified: boolean;
  hasExclusions: boolean;
  sourceLineClarity: number;
  categoryAmbiguity: number;
}

/** Score a single parsed benefit (0-1). */
export function scoreBenefitConfidence(
  benefit: RawParsedBenefit,
  sourceText: string,
): { confidence: number; factors: ConfidenceFactors; requiresReview: boolean } {
  const sourceLineClarity = scoreSourceLineClarity(benefit.description ?? benefit.name, sourceText);
  const categoryAmbiguity = scoreCategoryAmbiguity(benefit.category);

  const factors: ConfidenceFactors = {
    hasExplicitMultiplier: benefit.multiplier > 0,
    hasCategoryMatch: benefit.category !== 'other',
    hasCapSpecified: (benefit.caps?.length ?? 0) > 0,
    hasExclusions: (benefit.exclusions?.length ?? 0) > 0,
    sourceLineClarity,
    categoryAmbiguity,
  };

  let confidence = 0.5;
  if (factors.hasExplicitMultiplier) confidence += 0.2;
  if (factors.hasCategoryMatch) confidence += 0.15;
  if (factors.hasCapSpecified) confidence += 0.05;
  if (factors.hasExclusions) confidence += 0.03;
  confidence += sourceLineClarity * 0.15;
  confidence -= categoryAmbiguity * 0.1;

  confidence = Math.round(Math.min(1, Math.max(0, confidence)) * 1000) / 1000;

  return {
    confidence,
    factors,
    requiresReview: confidence < CONFIDENCE_REVIEW_THRESHOLD,
  };
}

/** Score all benefits and return aggregate stats. */
export function scoreParseResult(
  benefits: RawParsedBenefit[],
  sourceText: string,
): {
  scoredBenefits: Array<RawParsedBenefit & { confidence: number; requiresReview: boolean }>;
  averageConfidence: number;
  requiresHumanReview: boolean;
  lowConfidenceCount: number;
} {
  const scoredBenefits = benefits.map((benefit) => {
    const { confidence, requiresReview } = scoreBenefitConfidence(benefit, sourceText);
    return { ...benefit, confidence, requiresReview };
  });

  const averageConfidence =
    scoredBenefits.length === 0
      ? 0
      : Math.round(
          (scoredBenefits.reduce((s, b) => s + b.confidence, 0) / scoredBenefits.length) * 1000,
        ) / 1000;

  const lowConfidenceCount = scoredBenefits.filter((b) => b.requiresReview).length;

  return {
    scoredBenefits,
    averageConfidence,
    requiresHumanReview: lowConfidenceCount > 0 || averageConfidence < CONFIDENCE_REVIEW_THRESHOLD,
    lowConfidenceCount,
  };
}

function scoreSourceLineClarity(description: string, sourceText: string): number {
  const lower = description.toLowerCase();
  if (sourceText.toLowerCase().includes(lower.slice(0, 30))) return 1;
  if (/earn\s+\d+/i.test(description)) return 0.9;
  if (description.length > 20) return 0.7;
  return 0.4;
}

function scoreCategoryAmbiguity(category: string): number {
  if (category === 'other') return 0.8;
  if (category === 'travel') return 0.3;
  if (category === 'retail') return 0.4;
  return 0.1;
}

/** Build human-readable review reasons for flagged benefits. */
export function buildReviewReasons(
  scoredBenefits: Array<RawParsedBenefit & { confidence: number; requiresReview: boolean }>,
): string[] {
  return scoredBenefits
    .filter((b) => b.requiresReview)
    .map(
      (b) =>
        `"${b.name}" (${b.category}, ${b.multiplier}x) — confidence ${b.confidence} below threshold ${CONFIDENCE_REVIEW_THRESHOLD}`,
    );
}
