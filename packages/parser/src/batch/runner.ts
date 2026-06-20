/**
 * Batch benefit parsing from catalog entries or URLs.
 */
import { runBenefitPipeline } from '../pipeline/runner.js';
import { StubLLMClient } from '../parse/llm-parser.js';
import type { PipelineResult } from '../types.js';

export interface BatchParseTarget {
  cardId: string;
  issuer: string;
  productName: string;
  sourceText?: string;
  benefitGuideUrl?: string;
}

export interface BatchParseItemResult {
  cardId: string;
  success: boolean;
  rulesExtracted: number;
  error?: string;
  durationMs: number;
}

export interface BatchParseReport {
  runAt: string;
  total: number;
  succeeded: number;
  failed: number;
  results: BatchParseItemResult[];
}

function defaultSourceText(target: BatchParseTarget): string {
  if (target.sourceText) return target.sourceText;

  return [
    `${target.issuer} ${target.productName}`,
    target.benefitGuideUrl ? `Benefit guide: ${target.benefitGuideUrl}` : '',
    'Earn 3x points on dining at restaurants.',
    'Earn 2x points on travel purchases.',
    'Earn 1x point on all other purchases.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Parse benefit rules for multiple cards sequentially (dev/admin batch runner). */
export async function batchParseBenefits(
  targets: BatchParseTarget[],
  options: { dryRun?: boolean; llmClient?: StubLLMClient } = {},
): Promise<BatchParseReport> {
  const llmClient = options.llmClient ?? new StubLLMClient();
  const results: BatchParseItemResult[] = [];

  for (const target of targets) {
    const start = Date.now();
    try {
      const pipelineResult: PipelineResult = await runBenefitPipeline(
        {
          cardId: target.cardId,
          issuer: target.issuer,
          productName: target.productName,
          llmModel: 'stub',
          skipExtraction: true,
          dryRun: options.dryRun ?? true,
        },
        { llmClient, sourceText: defaultSourceText(target) },
      );

      const rules = pipelineResult.normalizedRules ?? [];
      results.push({
        cardId: target.cardId,
        success: rules.length > 0 && pipelineResult.success,
        rulesExtracted: rules.length,
        durationMs: Date.now() - start,
        error: rules.length === 0 ? 'No rules extracted' : undefined,
      });
    } catch (error) {
      results.push({
        cardId: target.cardId,
        success: false,
        rulesExtracted: 0,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Parse failed',
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;

  return {
    runAt: new Date().toISOString(),
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}
