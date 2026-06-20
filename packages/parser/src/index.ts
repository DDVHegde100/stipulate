export type {
  SourceFormat,
  SourceDocument,
  ExtractedBlock,
  ExtractionResult,
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  LLMClient,
  RawParsedBenefit,
  ParseResult,
  NormalizedBenefitRule,
  PipelineConfig,
  PipelineStage,
  StageResult,
  PipelineResult,
  CategoryMapping,
  CapNormalizationContext,
  ExclusionPattern,
  PdfExtractOptions,
  WebExtractOptions,
  FuzzyMatchResult,
} from "./types.js";

export {
  extractFromPdf,
  extractFromPdfFile,
  groupBlocksBySection,
  blocksToPromptText,
} from "./extract/pdf.js";

export {
  parsePdfBuffer,
  pdfTextToBlocks,
  extractPdfContent,
} from "./extract/pdf-parser.js";

export {
  runExtractionPipeline,
  scoreExtractionQuality,
  extractFromSourceUrl,
  hashExtractionContent,
  MIN_EXTRACTION_QUALITY,
  type ExtractSource,
  type ExtractPipelineOptions,
} from "./extract/pipeline.js";

export {
  normalizeMarkdown,
  markdownToBlocks,
  markdownToPlainText,
  extractMarkdownFrontmatter,
} from "./extract/markdown.js";

export {
  extractFromWeb,
  extractFromHtmlString,
} from "./extract/web.js";

export {
  CATEGORY_MAPPINGS,
  normalizeCategory,
  normalizeBenefitCategories,
  inferCategoryFromDescription,
  validateBenefitCategories,
} from "./normalize/categories.js";

export {
  MCC_CATEGORY_RANGES,
  categoryFromMcc,
  ISSUER_CATEGORY_OVERRIDES,
  applyIssuerCategoryOverride,
  validateCategoryMccConsistency,
  getMccRangesByCategory,
} from "./normalize/mcc-categories.js";

export {
  normalizeCapPeriod,
  parseCapPeriodFromText,
  parseCapFromText,
  normalizeBenefitCaps,
  extractCapsFromText,
  annualizeCapAmount,
  mergeDuplicateCaps,
  isValidBenefitPeriod,
  computeCapTrackerState,
  capPeriodBounds,
  type CapTrackerState,
  type ParsedCapRule,
} from "./normalize/caps.js";

export {
  EXCLUSION_PATTERNS,
  FAST_FOOD_MERCHANTS,
  DINING_EXCLUSION_POLICIES,
  normalizeExclusionType,
  parseMerchantListExclusions,
  applyIssuerDiningExclusions,
  disambiguateDiningMerchant,
  extractExclusionsFromText,
  normalizeBenefitExclusions,
  dedupeExclusions,
  isTransactionExcluded,
  parseExclusionFootnotes,
} from "./normalize/exclusions.js";

export {
  DEFAULT_STACKING_RULES,
  detectPortalBonus,
  detectLimitedTimeOffer,
  detectAnniversaryBonus,
  extractMultiplierLayers,
  computeStackedMultiplier,
  applyMultiplierStacking,
  benefitRulesToLayers,
  type MultiplierLayerType,
  type MultiplierLayer,
  type StackedMultiplierResult,
} from "./normalize/multiplier-stacking.js";

export {
  StubLLMClient,
  heuristicParse,
  parseBenefitsWithLLM,
  rawBenefitsToRules,
  createOpenAICompatibleClient,
} from "./parse/llm-parser.js";

export {
  OpenAILLMClient,
  createProductionLLMClient,
  type OpenAILLMClientOptions,
} from "./parse/openai-client.js";

export {
  CONFIDENCE_REVIEW_THRESHOLD,
  scoreBenefitConfidence,
  scoreParseResult,
  buildReviewReasons,
  type ConfidenceFactors,
} from "./parse/confidence.js";

export {
  BenefitParserPipeline,
  runBenefitPipeline,
  renormalizeRules,
  extractionToPrompt,
  type PipelineRunnerOptions,
} from "./pipeline/runner.js";

export {
  hashContent,
  hasContentChanged,
  fetchAndHash,
  reparseCard,
  ReparseScheduler,
  summarizeReparseBatch,
  type ReparseTarget,
  type ReparseJobResult,
  type ReparseSchedulerOptions,
} from "./scheduler/reparse.js";

export {
  GOLDEN_FIXTURES,
  evaluateFixture,
  runEvalSuite,
  assertEvalGate,
  type EvalFixture,
  type EvalCaseResult,
  type EvalReport,
} from "./eval/harness.js";

export { EXTENDED_FIXTURES } from "./eval/fixtures-extended.js";
export { TOP25_FIXTURES } from "./eval/fixtures-top25.js";
export {
  batchParseBenefits,
  type BatchParseTarget,
  type BatchParseItemResult,
  type BatchParseReport,
} from "./batch/runner.js";
