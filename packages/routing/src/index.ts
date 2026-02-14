export { ROUTING_MODEL_VERSION, routeTransaction, routeBatch } from './engine.js';
export type { CardBenefitBundle, RouteEngineOptions } from './engine.js';

export { buildRoutingFactors } from './explainability.js';
export { runRoutingBenchmark } from './benchmark/harness.js';
export type { BenchmarkResult } from './benchmark/harness.js';
export { generateRoutingScenarios } from './fixtures/scenarios.js';

export {
  checkRuleExclusions,
  findMatchingRule,
  collectExclusionHits,
  resolveSpendCategory,
  meetsMinSpend,
} from './exclusions.js';
export type { ExclusionCheckResult } from './exclusions.js';

export {
  evaluateCaps,
  emptyCapContext,
  buildCapContext,
} from './caps.js';
export type { CapSpendContext, CapEvaluation } from './caps.js';

export {
  scoreBenefitRule,
  compareScores,
  applyForeignTransactionFee,
  scoreMilesFallback,
} from './scoring.js';
export type { ScoreBreakdown } from './scoring.js';

export { DEFAULT_VALUATION_TABLE, DEMO_CARD_BUNDLES } from './fixtures.js';
