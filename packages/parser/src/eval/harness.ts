import type { PipelineResult } from '../types.js';
import { runBenefitPipeline } from '../pipeline/runner.js';

export interface EvalFixture {
  id: string;
  cardId: string;
  issuer: string;
  productName: string;
  sourceText: string;
  expected: {
    categories: string[];
    minRules: number;
    minConfidence?: number;
    requiredMerchants?: string[];
    excludedMerchants?: string[];
  };
}

export interface EvalCaseResult {
  fixtureId: string;
  cardId: string;
  passed: boolean;
  score: number;
  categoryPrecision: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
  rulesExtracted: number;
  averageConfidence?: number;
}

export interface EvalReport {
  runAt: string;
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
  precision: number;
  recall: number;
  results: EvalCaseResult[];
}

/** Built-in golden fixtures for regression testing. */
export const GOLDEN_FIXTURES: EvalFixture[] = [
  {
    id: 'chase-sapphire-preferred',
    cardId: 'chase_sapphire_preferred',
    issuer: 'Chase',
    productName: 'Sapphire Preferred',
    sourceText: [
      'Chase Sapphire Preferred Benefit Guide',
      'Earn 3x points on dining at restaurants including eligible delivery services.',
      'Earn 2x points on travel purchased through Chase Travel.',
      'Earn 1x point on all other purchases.',
      'Excludes purchases at warehouse clubs.',
    ].join('\n'),
    expected: {
      categories: ['dining', 'travel', 'other'],
      minRules: 2,
      minConfidence: 0.7,
      excludedMerchants: ['warehouse'],
    },
  },
  {
    id: 'amex-gold',
    cardId: 'amex_gold',
    issuer: 'American Express',
    productName: 'Gold Card',
    sourceText: [
      'American Express Gold Card',
      'Earn 4x Membership Rewards points at restaurants worldwide.',
      'Earn 4x points at U.S. supermarkets on up to $25,000 per year in purchases.',
      'Fast food establishments may be excluded.',
      'Earn 1x point on other purchases.',
    ].join('\n'),
    expected: {
      categories: ['dining', 'groceries', 'other'],
      minRules: 2,
      minConfidence: 0.7,
    },
  },
  {
    id: 'capital-one-venture',
    cardId: 'capital_one_venture',
    issuer: 'Capital One',
    productName: 'Venture',
    sourceText: [
      'Capital One Venture Rewards',
      'Earn 2x miles on every purchase, every day.',
      'Earn 5x miles on hotels and rental cars booked through Capital One Travel.',
    ].join('\n'),
    expected: {
      categories: ['other', 'hotels', 'travel'],
      minRules: 1,
      minConfidence: 0.65,
    },
  },
  {
    id: 'citi-custom-cash',
    cardId: 'citi_custom_cash',
    issuer: 'Citi',
    productName: 'Custom Cash',
    sourceText: [
      'Citi Custom Cash Card',
      'Earn 5% cash back on purchases in your top eligible spend category each billing cycle.',
      'Capped at $500 in purchases per billing cycle.',
      'Earn 1% on all other purchases.',
    ].join('\n'),
    expected: {
      categories: ['other'],
      minRules: 1,
      minConfidence: 0.6,
    },
  },
  {
    id: 'discover-it',
    cardId: 'discover_it_cash_back',
    issuer: 'Discover',
    productName: 'it Cash Back',
    sourceText: [
      'Discover it Cash Back',
      'Earn 5% cash back on everyday purchases at different places each quarter.',
      'Earn unlimited 1% cash back on all other purchases.',
    ].join('\n'),
    expected: {
      categories: ['other'],
      minRules: 1,
      minConfidence: 0.6,
    },
  },
];

/** Evaluate a single fixture against pipeline output. */
export async function evaluateFixture(fixture: EvalFixture): Promise<EvalCaseResult> {
  const start = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  const result: PipelineResult = await runBenefitPipeline(
    {
      issuer: fixture.issuer,
      cardId: fixture.cardId,
      productName: fixture.productName,
      llmModel: 'gpt-4o-mini',
      skipExtraction: true,
    },
    { sourceText: fixture.sourceText },
  );

  const rules = result.normalizedRules;
  const categories = rules.map((r) => r.category);
  const rulesExtracted = rules.length;

  if (rulesExtracted < fixture.expected.minRules) {
    errors.push(`Expected ≥${fixture.expected.minRules} rules, got ${rulesExtracted}`);
  }

  for (const expectedCategory of fixture.expected.categories) {
    if (!categories.includes(expectedCategory as typeof categories[number])) {
      warnings.push(`Missing expected category: ${expectedCategory}`);
    }
  }

  const avgConfidence = result.parse?.averageConfidence;
  if (
    fixture.expected.minConfidence &&
    avgConfidence !== undefined &&
    avgConfidence < fixture.expected.minConfidence
  ) {
    errors.push(`Confidence ${avgConfidence} below threshold ${fixture.expected.minConfidence}`);
  }

  if (!result.success) {
    errors.push('Pipeline reported failure');
  }

  const categoryScore =
    fixture.expected.categories.filter((c) => categories.includes(c as typeof categories[number])).length /
    fixture.expected.categories.length;

  const ruleScore = Math.min(1, rulesExtracted / fixture.expected.minRules);
  const confidenceScore = avgConfidence ?? 0.8;
  const score = Math.round(((categoryScore * 0.4 + ruleScore * 0.4 + confidenceScore * 0.2) * 100)) / 100;

  return {
    fixtureId: fixture.id,
    cardId: fixture.cardId,
    passed: errors.length === 0 && score >= 0.6,
    score,
    categoryPrecision: categoryScore,
    errors,
    warnings,
    durationMs: Date.now() - start,
    rulesExtracted,
    averageConfidence: avgConfidence,
  };
}

/** Run full eval suite and produce regression report. */
export async function runEvalSuite(
  fixtures: EvalFixture[] = GOLDEN_FIXTURES,
): Promise<EvalReport> {
  const results: EvalCaseResult[] = [];

  for (const fixture of fixtures) {
    results.push(await evaluateFixture(fixture));
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const averageScore =
    results.length === 0
      ? 0
      : Math.round((results.reduce((s, r) => s + r.score, 0) / results.length) * 1000) / 1000;

  const totalExpected = fixtures.reduce((s, f) => s + f.expected.categories.length, 0);
  const totalMatched = results.reduce((s, r, i) => {
    const fixture = fixtures[i]!;
    return s + Math.round(r.categoryPrecision * fixture.expected.categories.length);
  }, 0);

  const categoryPrecision =
    results.length === 0
      ? 0
      : Math.round((results.reduce((s, r) => s + r.categoryPrecision, 0) / results.length) * 1000) / 1000;

  return {
    runAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    averageScore,
    precision: categoryPrecision,
    recall: totalExpected ? totalMatched / totalExpected : 0,
    results,
  };
}

/** CI gate — fails if pass rate or category precision below thresholds. */
export function assertEvalGate(
  report: EvalReport,
  options: {
    minPassRate?: number;
    minCategoryPrecision?: number;
    minCapPrecision?: number;
  } = {},
): void {
  const minPassRate = options.minPassRate ?? 0.8;
  const minCategoryPrecision = options.minCategoryPrecision ?? 0.9;
  const minCapPrecision = options.minCapPrecision ?? 0.85;

  const passRate = report.total ? report.passed / report.total : 0;
  if (passRate < minPassRate) {
    throw new Error(
      `Eval gate failed: ${report.passed}/${report.total} passed (${(passRate * 100).toFixed(0)}% < ${minPassRate * 100}%)`,
    );
  }

  if (report.precision < minCategoryPrecision) {
    throw new Error(
      `Category precision gate failed: ${(report.precision * 100).toFixed(0)}% < ${minCategoryPrecision * 100}%`,
    );
  }

  const capCases = report.results.filter((r) =>
    GOLDEN_FIXTURES.find((f) => f.id === r.fixtureId)?.sourceText.toLowerCase().includes('cap'),
  );
  if (capCases.length > 0) {
    const capPassRate = capCases.filter((r) => r.passed).length / capCases.length;
    if (capPassRate < minCapPrecision) {
      throw new Error(
        `Cap precision gate failed: ${(capPassRate * 100).toFixed(0)}% < ${minCapPrecision * 100}%`,
      );
    }
  }
}
