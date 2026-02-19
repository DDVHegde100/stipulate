import { createHash } from 'node:crypto';
import {
  runBenefitPipeline,
  scoreParseResult,
  CONFIDENCE_REVIEW_THRESHOLD,
  StubLLMClient,
  createOpenAICompatibleClient,
} from '@stipulate/parser';
import type { NormalizedBenefitRule } from '@stipulate/parser';
import * as ingestionRepo from '../repositories/ingestion.repository.js';

const CARD_ISSUER_MAP: Record<string, { issuer: string; productName: string }> = {
  chase_sapphire_preferred: { issuer: 'Chase', productName: 'Sapphire Preferred' },
  amex_gold: { issuer: 'American Express', productName: 'Gold Card' },
  capital_one_venture: { issuer: 'Capital One', productName: 'Venture' },
};

/** Run extract → parse → normalize pipeline for a queued ingestion job. */
export async function processIngestionJob(jobId: string): Promise<void> {
  const job = await ingestionRepo.getIngestionJobById(jobId);
  if (!job || job.status !== 'queued') return;

  const meta = CARD_ISSUER_MAP[job.cardId] ?? {
    issuer: 'Unknown',
    productName: job.cardId,
  };

  try {
    await ingestionRepo.updateIngestionJob(jobId, { status: 'extracting' });

    const contentHash = createHash('sha256').update(job.sourceUrl).digest('hex').slice(0, 16);
    await ingestionRepo.updateIngestionJob(jobId, { contentHash, status: 'parsing' });

    const llmClient = process.env.OPENAI_API_KEY
      ? createOpenAICompatibleClient(
          process.env.OPENAI_API_KEY,
          process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
        )
      : new StubLLMClient();

    const result = await runBenefitPipeline(
      {
        cardId: job.cardId,
        issuer: meta.issuer,
        productName: meta.productName,
        sourceUrl: job.sourceUrl,
        llmModel: process.env.PARSER_LLM_MODEL ?? 'gpt-4o-mini',
        skipExtraction: false,
        dryRun: false,
      },
      { llmClient },
    );

    const sourceText = result.extraction?.rawText ?? '';
    const confidence = result.parse?.rawBenefits?.length
      ? scoreParseResult(result.parse.rawBenefits, sourceText).averageConfidence
      : result.success
        ? 0.88
        : 0.5;

    const threshold = parseFloat(process.env.PARSER_CONFIDENCE_THRESHOLD ?? String(CONFIDENCE_REVIEW_THRESHOLD));
    const requiresReview = confidence < threshold || !result.success;

    const normalizedRules: NormalizedBenefitRule[] = result.normalizedRules ?? [];

    await ingestionRepo.updateIngestionJob(jobId, {
      extractionResult: result.extraction,
      parseResult: result.parse,
      normalizedRules,
      confidence,
      requiresReview,
      status: requiresReview ? 'review' : 'approved',
    });

    if (!requiresReview) {
      const { publishIngestionBenefits } = await import('./benefit-publish.service.js');
      await publishIngestionBenefits(jobId);
    }
  } catch (error) {
    await ingestionRepo.updateIngestionJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Poll and process up to N queued jobs. */
export async function drainIngestionQueue(limit = 5): Promise<{ processed: number }> {
  const jobs = await ingestionRepo.fetchQueuedJobs(limit);
  for (const job of jobs) {
    await processIngestionJob(job.id);
  }
  return { processed: jobs.length };
}
