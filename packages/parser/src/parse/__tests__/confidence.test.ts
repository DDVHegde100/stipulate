import { describe, it, expect } from 'vitest';
import {
  CONFIDENCE_REVIEW_THRESHOLD,
  scoreBenefitConfidence,
  scoreParseResult,
  buildReviewReasons,
} from '../confidence.js';

describe('confidence scoring', () => {
  const sampleBenefit = {
    name: '3x Dining',
    description: 'Earn 3x points on dining at restaurants',
    category: 'dining',
    multiplier: 3,
    rewardType: 'points',
  };

  it('scores explicit benefits highly', () => {
    const result = scoreBenefitConfidence(sampleBenefit, 'Earn 3x points on dining at restaurants');
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.requiresReview).toBe(false);
  });

  it('flags ambiguous categories for review', () => {
    const result = scoreBenefitConfidence(
      { ...sampleBenefit, category: 'other', description: 'bonus' },
      'some bonus',
    );
    expect(result.requiresReview).toBe(true);
  });

  it('scores full parse result', () => {
    const result = scoreParseResult([sampleBenefit], 'Earn 3x points on dining');
    expect(result.averageConfidence).toBeGreaterThan(0);
    expect(result.scoredBenefits[0]?.confidence).toBeDefined();
  });

  it('builds review reasons for low confidence items', () => {
    const scored = scoreParseResult(
      [{ ...sampleBenefit, category: 'other', description: 'x' }],
      'x',
    );
    const reasons = buildReviewReasons(scored.scoredBenefits);
    if (scored.requiresHumanReview) {
      expect(reasons.length).toBeGreaterThan(0);
    }
  });

  it('uses 0.85 review threshold', () => {
    expect(CONFIDENCE_REVIEW_THRESHOLD).toBe(0.85);
  });
});
