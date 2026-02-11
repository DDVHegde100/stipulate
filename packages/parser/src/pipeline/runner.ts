import {
  BenefitRuleSchema,
  CardCatalogSchema,
  CardSchema,
  type BenefitRule,
  type CardCatalog,
} from "@stipulate/schema";
import { blocksToPromptText } from "../extract/pdf.js";
import { extractFromHtmlString } from "../extract/web.js";
import { normalizeBenefitCategories } from "../normalize/categories.js";
import { normalizeBenefitCaps } from "../normalize/caps.js";
import { normalizeBenefitExclusions } from "../normalize/exclusions.js";
import { applyMultiplierStacking } from "../normalize/multiplier-stacking.js";
import {
  parseBenefitsWithLLM,
  rawBenefitsToRules,
  StubLLMClient,
} from "../parse/llm-parser.js";
import type {
  ExtractionResult,
  LLMClient,
  NormalizedBenefitRule,
  PipelineConfig,
  PipelineResult,
  RawParsedBenefit,
  StageResult,
} from "../types.js";

export interface PipelineRunnerOptions {
  llmClient?: LLMClient;
  sourceHtml?: string;
  sourceText?: string;
  onStageComplete?: (stage: StageResult) => void;
}

/** Orchestrates extract → parse → normalize → validate → assemble. */
export class BenefitParserPipeline {
  private readonly llmClient: LLMClient;

  constructor(private readonly options: PipelineRunnerOptions = {}) {
    this.llmClient = options.llmClient ?? new StubLLMClient();
  }

  async run(config: PipelineConfig): Promise<PipelineResult> {
    const start = Date.now();
    const stages: StageResult[] = [];
    let extraction: ExtractionResult | undefined;
    let parseResult: PipelineResult["parse"];
    let normalizedRules: NormalizedBenefitRule[] = [];

    const recordStage = (stage: StageResult) => {
      stages.push(stage);
      this.options.onStageComplete?.(stage);
    };

    try {
      if (!config.skipExtraction) {
        const extractStage = await this.runExtract(config);
        recordStage(extractStage.stage);
        extraction = extractStage.extraction;
      }

      const text =
        this.options.sourceText ??
        extraction?.rawText ??
        "";

      if (!text && !config.dryRun) {
        throw new Error("No source text available for parsing");
      }

      const parseStage = await this.runParse(config, text, extraction?.document.id ?? "doc-1");
      recordStage(parseStage.stage);
      parseResult = parseStage.parse;

      let rawBenefits = parseResult?.rawBenefits ?? [];

      const categoryStage = this.runNormalizeCategories(rawBenefits);
      recordStage(categoryStage.stage);
      rawBenefits = categoryStage.benefits;

      const capsStage = this.runNormalizeCaps(rawBenefits, config);
      recordStage(capsStage.stage);
      rawBenefits = capsStage.benefits;

      const exclusionsStage = this.runNormalizeExclusions(rawBenefits, config);
      recordStage(exclusionsStage.stage);
      rawBenefits = exclusionsStage.benefits;

      const multipliersStage = this.runNormalizeMultipliers(rawBenefits, config, text);
      recordStage(multipliersStage.stage);
      rawBenefits = multipliersStage.benefits;

      const validateStage = this.runValidate(rawBenefits, config.cardId);
      recordStage(validateStage.stage);
      normalizedRules = validateStage.rules;

      const assembleStage = this.runAssemble(config, normalizedRules);
      recordStage(assembleStage.stage);

      return {
        config,
        extraction,
        parse: parseResult,
        normalizedRules,
        catalog: assembleStage.catalog,
        stages,
        totalDurationMs: Date.now() - start,
        success: stages.every((s) => s.success),
      };
    } catch (error) {
      recordStage({
        stage: "validate",
        success: false,
        durationMs: 0,
        warnings: [],
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        config,
        extraction,
        parse: parseResult,
        normalizedRules,
        stages,
        totalDurationMs: Date.now() - start,
        success: false,
      };
    }
  }

  private async runExtract(config: PipelineConfig): Promise<{
    extraction: ExtractionResult;
    stage: StageResult;
  }> {
    const start = Date.now();

    if (this.options.sourceHtml) {
      const extraction = extractFromHtmlString(this.options.sourceHtml, {
        id: `doc-${config.cardId}`,
        issuer: config.issuer,
        productName: config.productName,
        fetchedAt: new Date().toISOString(),
      });

      return {
        extraction,
        stage: {
          stage: "extract",
          success: true,
          durationMs: Date.now() - start,
          warnings: extraction.warnings,
        },
      };
    }

    if (config.sourceUrl) {
      const { extractFromWeb } = await import("../extract/web.js");
      const extraction = await extractFromWeb(config.sourceUrl, {
        id: `doc-${config.cardId}`,
        issuer: config.issuer,
        productName: config.productName,
        fetchedAt: new Date().toISOString(),
      });

      return {
        extraction,
        stage: {
          stage: "extract",
          success: true,
          durationMs: Date.now() - start,
          warnings: extraction.warnings,
        },
      };
    }

    const fallbackText = [
      `${config.issuer} ${config.productName}`,
      "Earn 3x points on dining at restaurants.",
      "Earn 2x points on travel purchases.",
      "Earn 1x point on all other purchases.",
    ].join("\n");

    const extraction: ExtractionResult = {
      document: {
        id: `doc-${config.cardId}`,
        issuer: config.issuer,
        productName: config.productName,
        format: "plain_text",
        fetchedAt: new Date().toISOString(),
      },
      blocks: [
        {
          documentId: `doc-${config.cardId}`,
          content: fallbackText,
          blockType: "paragraph",
          confidence: 0.5,
        },
      ],
      rawText: fallbackText,
      warnings: ["No source URL or HTML provided; used synthetic fallback text"],
      durationMs: Date.now() - start,
    };

    return {
      extraction,
      stage: {
        stage: "extract",
        success: true,
        durationMs: Date.now() - start,
        warnings: extraction.warnings,
      },
    };
  }

  private async runParse(
    config: PipelineConfig,
    text: string,
    documentId: string,
  ): Promise<{ parse: PipelineResult["parse"]; stage: StageResult }> {
    const start = Date.now();

    if (config.dryRun) {
      return {
        parse: undefined,
        stage: {
          stage: "parse",
          success: true,
          durationMs: Date.now() - start,
          warnings: ["Dry run: skipped LLM parse"],
        },
      };
    }

    const parse = await parseBenefitsWithLLM(this.llmClient, text, {
      documentId,
      cardId: config.cardId,
      model: config.llmModel,
    });

    return {
      parse,
      stage: {
        stage: "parse",
        success: parse.rawBenefits.length > 0,
        durationMs: Date.now() - start,
        warnings:
          parse.rawBenefits.length === 0
            ? ["LLM returned no benefit rules"]
            : [],
      },
    };
  }

  private runNormalizeCategories(
    benefits: RawParsedBenefit[],
  ): { benefits: RawParsedBenefit[]; stage: StageResult } {
    const start = Date.now();
    const { benefits: normalized, notes } = normalizeBenefitCategories(benefits);

    return {
      benefits: normalized,
      stage: {
        stage: "normalize_categories",
        success: true,
        durationMs: Date.now() - start,
        warnings: notes,
      },
    };
  }

  private runNormalizeCaps(
    benefits: RawParsedBenefit[],
    config: PipelineConfig,
  ): { benefits: RawParsedBenefit[]; stage: StageResult } {
    const start = Date.now();
    const { benefits: normalized, notes } = normalizeBenefitCaps(benefits, {
      issuer: config.issuer,
      defaultCurrency: "USD",
      statementCycleMonths: 1,
    });

    return {
      benefits: normalized,
      stage: {
        stage: "normalize_caps",
        success: true,
        durationMs: Date.now() - start,
        warnings: notes,
      },
    };
  }

  private runNormalizeExclusions(
    benefits: RawParsedBenefit[],
    config: PipelineConfig,
  ): { benefits: RawParsedBenefit[]; stage: StageResult } {
    const start = Date.now();
    const { benefits: normalized, notes } = normalizeBenefitExclusions(benefits, {
      issuer: config.issuer,
    });

    return {
      benefits: normalized,
      stage: {
        stage: "normalize_exclusions",
        success: true,
        durationMs: Date.now() - start,
        warnings: notes,
      },
    };
  }

  private runNormalizeMultipliers(
    benefits: RawParsedBenefit[],
    config: PipelineConfig,
    sourceText: string,
  ): { benefits: RawParsedBenefit[]; stage: StageResult } {
    const start = Date.now();
    const { benefits: normalized, stackingNotes } = applyMultiplierStacking(
      benefits,
      config.issuer,
      sourceText,
    );

    return {
      benefits: normalized,
      stage: {
        stage: "normalize_multipliers",
        success: true,
        durationMs: Date.now() - start,
        warnings: stackingNotes,
      },
    };
  }

  private runValidate(
    rawBenefits: RawParsedBenefit[],
    cardId: string,
  ): { rules: NormalizedBenefitRule[]; stage: StageResult } {
    const start = Date.now();
    const warnings: string[] = [];

    const rules = rawBenefitsToRules(rawBenefits, cardId).map((rule) => {
      const parsed = BenefitRuleSchema.safeParse(rule);
      if (!parsed.success) {
        warnings.push(`Validation failed for rule ${rule.id}: ${parsed.error.message}`);
      }
      return {
        ...rule,
        normalizationNotes: [],
      };
    });

    return {
      rules,
      stage: {
        stage: "validate",
        success: warnings.length === 0,
        durationMs: Date.now() - start,
        warnings,
      },
    };
  }

  private runAssemble(
    config: PipelineConfig,
    rules: NormalizedBenefitRule[],
  ): { catalog: CardCatalog; stage: StageResult } {
    const start = Date.now();

    const card = CardSchema.parse({
      id: config.cardId,
      issuer: config.issuer,
      productName: config.productName,
      network: inferNetwork(config.issuer),
      benefitRuleIds: rules.map((r) => r.id),
      benefitRules: rules,
      benefitGuideUrl: config.sourceUrl,
    });

    const catalog = CardCatalogSchema.parse({
      version: `pipeline-${new Date().toISOString().slice(0, 10)}`,
      generatedAt: new Date().toISOString(),
      issuer: config.issuer,
      cards: [card],
    });

    return {
      catalog,
      stage: {
        stage: "assemble",
        success: true,
        durationMs: Date.now() - start,
        warnings: [],
      },
    };
  }
}

function inferNetwork(issuer: string): "visa" | "mastercard" | "amex" | "discover" {
  const lower = issuer.toLowerCase();
  if (lower.includes("amex") || lower.includes("american express")) return "amex";
  if (lower.includes("discover")) return "discover";
  if (lower.includes("mastercard")) return "mastercard";
  return "visa";
}

/** Convenience function to run the full pipeline with default options. */
export async function runBenefitPipeline(
  config: PipelineConfig,
  options?: PipelineRunnerOptions,
): Promise<PipelineResult> {
  const pipeline = new BenefitParserPipeline(options);
  return pipeline.run(config);
}

/** Re-run normalization stages on existing rules (e.g. after schema migration). */
export function renormalizeRules(
  rules: BenefitRule[],
  issuer: string,
): NormalizedBenefitRule[] {
  const rawBenefits = rules.map((rule) => ({
    name: rule.name,
    description: rule.description,
    category: rule.category,
    multiplier: rule.multiplier,
    rewardType: rule.rewardType,
    caps: rule.caps.map((cap) => ({
      period: cap.period,
      amountMinor: cap.limit.amountMinor,
      currency: cap.limit.currency,
      description: cap.description,
    })),
    exclusions: rule.exclusions.map((ex) => ({
      type: ex.type,
      matcher: ex.matcher,
      reason: ex.reason,
    })),
    requiresActivation: rule.requiresActivation,
  }));

  let normalized = normalizeBenefitCategories(rawBenefits).benefits;
  normalized = normalizeBenefitCaps(normalized, {
    issuer,
    defaultCurrency: "USD",
    statementCycleMonths: 1,
  }).benefits;
  normalized = normalizeBenefitExclusions(normalized, { issuer }).benefits;

  return rawBenefitsToRules(normalized, rules[0]?.cardId ?? "unknown").map(
    (rule) => ({
      ...rule,
      normalizationNotes: [],
    }),
  );
}

/** Build LLM prompt text from extraction blocks. */
export function extractionToPrompt(extraction: ExtractionResult): string {
  return blocksToPromptText(extraction.blocks);
}
