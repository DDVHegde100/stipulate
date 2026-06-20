import { createHash } from 'node:crypto';
import {
  runBenefitPipeline,
  scoreParseResult,
  CONFIDENCE_REVIEW_THRESHOLD,
  StubLLMClient,
  createProductionLLMClient,
  scoreExtractionQuality,
  MIN_EXTRACTION_QUALITY,
} from '@stipulate/parser';
import type { NormalizedBenefitRule } from '@stipulate/parser';
import { createChildLogger } from '../lib/logger.js';
import * as ingestionRepo from '../repositories/ingestion.repository.js';
import { query } from '../lib/db.js';

const log = createChildLogger({ component: 'ingestion-pipeline' });

async function resolveCardMeta(cardId: string): Promise<{ issuer: string; productName: string }> {
  try {
    const result = await query<{ name: string; issuer_name: string | null }>(
      `SELECT c.name, i.name AS issuer_name
       FROM cards c
       LEFT JOIN issuers i ON i.id = c.issuer_id
       WHERE c.card_id = $1
       LIMIT 1`,
      [cardId],
    );

    const row = result.rows[0];
    if (row) {
      return {
        issuer: row.issuer_name ?? 'Unknown',
        productName: row.name,
      };
    }
  } catch {
    // fall through when DB unavailable
  }

  return { issuer: 'Unknown', productName: cardId };
}

/** Run extract → parse → normalize pipeline for a queued ingestion job. */
export async function processIngestionJob(jobId: string): Promise<void> {
  const job = await ingestionRepo.getIngestionJobById(jobId);
  if (!job || job.status !== 'queued') return;

  const meta = await resolveCardMeta(job.cardId);

  try {
    await ingestionRepo.updateIngestionJob(jobId, { status: 'extracting' });

    const llmClient = process.env.OPENAI_API_KEY
      ? createProductionLLMClient(
          process.env.OPENAI_API_KEY,
          process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
          (usage) => {
            log.info(
              {
                model: usage.model,
                tokens: usage.totalTokens,
                costUsd: usage.estimatedCostUsd.toFixed(6),
                jobId,
              },
              'LLM parse usage',
            );
          },
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

    const extractionQuality = result.extraction
      ? scoreExtractionQuality(result.extraction)
      : 0;

    if (extractionQuality < MIN_EXTRACTION_QUALITY) {
      await ingestionRepo.updateIngestionJob(jobId, {
        status: 'failed',
        errorMessage: `Extraction quality ${extractionQuality.toFixed(2)} below minimum ${MIN_EXTRACTION_QUALITY}`,
        extractionResult: result.extraction,
      });
      return;
    }

    const contentHash =
      result.extraction?.document.checksum ??
      createHash('sha256').update(result.extraction?.rawText ?? job.sourceUrl).digest('hex').slice(0, 16);

    await ingestionRepo.updateIngestionJob(jobId, { contentHash, status: 'parsing' });

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
