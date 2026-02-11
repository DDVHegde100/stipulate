import type {
  BenefitCap,
  BenefitRule,
  Card,
  CardCatalog,
  Exclusion,
  SpendingCategory,
} from "@stipulate/schema";

/** Source document format for benefit guide extraction. */
export type SourceFormat = "pdf" | "html" | "markdown" | "plain_text";

/** Provenance metadata for extracted content. */
export interface SourceDocument {
  id: string;
  url?: string;
  format: SourceFormat;
  issuer: string;
  productName?: string;
  fetchedAt: string;
  checksum?: string;
}

/** Raw text block extracted from a source document. */
export interface ExtractedBlock {
  documentId: string;
  pageNumber?: number;
  sectionTitle?: string;
  content: string;
  blockType: "heading" | "paragraph" | "table" | "list" | "footnote";
  confidence: number;
}

/** Result of the extraction stage. */
export interface ExtractionResult {
  document: SourceDocument;
  blocks: ExtractedBlock[];
  rawText: string;
  warnings: string[];
  durationMs: number;
}

/** OpenAI-compatible chat message. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** OpenAI-compatible completion request. */
export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}

/** OpenAI-compatible completion response. */
export interface CompletionResponse {
  id: string;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: "stop" | "length" | "content_filter" | "error";
}

/** Client interface for LLM providers (OpenAI, Azure, local proxies). */
export interface LLMClient {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

/** Structured output from the LLM parse stage (pre-schema validation). */
export interface RawParsedBenefit {
  name: string;
  description?: string;
  category: string;
  multiplier: number;
  rewardType?: string;
  caps?: Array<{
    period: string;
    amountMinor: number;
    currency?: string;
    description?: string;
  }>;
  exclusions?: Array<{
    type: string;
    matcher: string;
    reason?: string;
  }>;
  requiresActivation?: boolean;
}

/** Output from the LLM parse stage. */
export interface ParseResult {
  documentId: string;
  cardId: string;
  rawBenefits: RawParsedBenefit[];
  unparsedSections: string[];
  llmModel: string;
  tokenUsage?: CompletionResponse['usage'];
  durationMs: number;
  averageConfidence?: number;
  requiresHumanReview?: boolean;
  reviewReasons?: string[];
}

/** Output from a normalization stage. */
export interface NormalizedBenefitRule extends BenefitRule {
  normalizationNotes: string[];
}

/** Full pipeline configuration. */
export interface PipelineConfig {
  issuer: string;
  cardId: string;
  productName: string;
  llmModel: string;
  sourceUrl?: string;
  skipExtraction?: boolean;
  dryRun?: boolean;
}

/** Pipeline stage identifiers. */
export type PipelineStage =
  | "extract"
  | "parse"
  | "normalize_categories"
  | "normalize_caps"
  | "normalize_exclusions"
  | "normalize_multipliers"
  | "validate"
  | "assemble";

/** Per-stage timing and status. */
export interface StageResult {
  stage: PipelineStage;
  success: boolean;
  durationMs: number;
  warnings: string[];
  error?: string;
}

/** Complete pipeline output. */
export interface PipelineResult {
  config: PipelineConfig;
  extraction?: ExtractionResult;
  parse?: ParseResult;
  normalizedRules: NormalizedBenefitRule[];
  catalog?: CardCatalog;
  stages: StageResult[];
  totalDurationMs: number;
  success: boolean;
}

/** Category normalization mapping entry. */
export interface CategoryMapping {
  raw: string;
  normalized: SpendingCategory;
  aliases: string[];
}

/** Cap normalization context. */
export interface CapNormalizationContext {
  issuer: string;
  defaultCurrency: string;
  statementCycleMonths: number;
}

/** Exclusion normalization pattern. */
export interface ExclusionPattern {
  type: Exclusion["type"];
  patterns: RegExp[];
  matcherTemplate: (match: RegExpMatchArray) => string;
  reason?: string;
}

/** PDF extraction options. */
export interface PdfExtractOptions {
  maxPages?: number;
  includeTables?: boolean;
  ocrFallback?: boolean;
}

/** Web extraction options. */
export interface WebExtractOptions {
  userAgent?: string;
  timeoutMs?: number;
  followRedirects?: boolean;
  stripNavigation?: boolean;
}

/** Fuzzy match score for merchant resolution (used by downstream MCC package). */
export interface FuzzyMatchResult {
  query: string;
  match: string;
  score: number;
}

export type { BenefitCap, BenefitRule, Card, CardCatalog, Exclusion };
