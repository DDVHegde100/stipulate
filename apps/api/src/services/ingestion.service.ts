import type { IngestionStatus } from '../repositories/ingestion.repository.js';
import * as ingestionRepo from '../repositories/ingestion.repository.js';
import { publishIngestionBenefits } from './benefit-publish.service.js';

export type { IngestionStatus };

export interface IngestionJob {
  id: string;
  cardId: string;
  sourceUrl: string;
  sourceFormat: 'pdf' | 'html' | 'markdown' | 'plain_text';
  status: IngestionStatus;
  priority: number;
  contentHash?: string;
  confidence?: number;
  requiresReview: boolean;
  reviewNotes?: string;
  reviewedBy?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateIngestionJobInput {
  cardId: string;
  sourceUrl: string;
  sourceFormat?: IngestionJob['sourceFormat'];
  priority?: number;
}

function toJob(row: ingestionRepo.IngestionJobRow): IngestionJob {
  return {
    id: row.id,
    cardId: row.cardId,
    sourceUrl: row.sourceUrl,
    sourceFormat: row.sourceFormat,
    status: row.status,
    priority: row.priority,
    contentHash: row.contentHash,
    confidence: row.confidence,
    requiresReview: row.requiresReview,
    reviewNotes: row.reviewNotes,
    reviewedBy: row.reviewedBy,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export async function createIngestionJob(input: CreateIngestionJobInput): Promise<IngestionJob> {
  const job = await ingestionRepo.insertIngestionJob({
    cardId: input.cardId,
    sourceUrl: input.sourceUrl,
    sourceFormat: input.sourceFormat ?? inferFormat(input.sourceUrl),
    priority: input.priority ?? 0,
  });

  if (process.env.SQS_PARSER_JOBS_QUEUE && process.env.NODE_ENV !== 'test') {
    const { publishIngestionJobMessage } = await import('../lib/sqs.js');
    await publishIngestionJobMessage({ jobId: job.id, cardId: job.cardId }).catch(() => {});
  } else {
    setImmediate(() => {
      void import('./ingestion-pipeline.service.js').then(({ processIngestionJob }) =>
        processIngestionJob(job.id),
      );
    });
  }

  return toJob(job);
}

export async function listIngestionJobs(filter: {
  status?: IngestionStatus;
  limit?: number;
}): Promise<IngestionJob[]> {
  const rows = await ingestionRepo.listIngestionJobs(filter);
  return rows.map(toJob);
}

export async function getIngestionJob(id: string): Promise<IngestionJob | null> {
  const row = await ingestionRepo.getIngestionJobById(id);
  return row ? toJob(row) : null;
}

export async function reviewIngestionJob(input: {
  id: string;
  action: 'approve' | 'reject';
  reviewedBy: string;
  notes?: string;
}): Promise<IngestionJob> {
  const job = await ingestionRepo.getIngestionJobById(input.id);
  if (!job) throw new IngestionServiceError('Job not found', 'NOT_FOUND');
  if (job.status !== 'review') {
    throw new IngestionServiceError(`Job is in status "${job.status}", expected "review"`, 'INVALID_STATE');
  }

  if (input.action === 'reject') {
    const updated = await ingestionRepo.updateIngestionJob(input.id, {
      status: 'rejected',
      reviewedBy: input.reviewedBy,
      reviewNotes: input.notes,
    });
    return toJob(updated!);
  }

  await ingestionRepo.updateIngestionJob(input.id, {
    status: 'approved',
    reviewedBy: input.reviewedBy,
    reviewNotes: input.notes,
  });

  await publishIngestionBenefits(input.id);
  const published = await ingestionRepo.getIngestionJobById(input.id);
  return toJob(published!);
}

export class IngestionServiceError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'INVALID_STATE' | 'VALIDATION_ERROR',
  ) {
    super(message);
    this.name = 'IngestionServiceError';
  }
}

function inferFormat(url: string): IngestionJob['sourceFormat'] {
  if (url.endsWith('.pdf')) return 'pdf';
  if (url.endsWith('.md')) return 'markdown';
  return 'html';
}

export const ingestionService = {
  createIngestionJob,
  listIngestionJobs,
  getIngestionJob,
  reviewIngestionJob,
};
