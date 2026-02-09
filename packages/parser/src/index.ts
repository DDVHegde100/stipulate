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
  parseCapFromText,
  normalizeBenefitCaps,
  extractCapsFromText,
  annualizeCapAmount,
  mergeDuplicateCaps,
  isValidBenefitPeriod,
} from "./normalize/caps.js";

export {
  EXCLUSION_PATTERNS,
  normalizeExclusionType,
  extractExclusionsFromText,
  normalizeBenefitExclusions,
  dedupeExclusions,
  isTransactionExcluded,
  parseExclusionFootnotes,
} from "./normalize/exclusions.js";

export {
  StubLLMClient,
  heuristicParse,
  parseBenefitsWithLLM,
  rawBenefitsToRules,
  createOpenAICompatibleClient,
} from "./parse/llm-parser.js";

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
