import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

export type IngestionStatus =
  | 'queued'
  | 'extracting'
  | 'parsing'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'failed';

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

/** In-memory job store — replaced by Postgres in production path. */
const jobStore = new Map<string, IngestionJob>();

export interface CreateIngestionJobInput {
  cardId: string;
  sourceUrl: string;
  sourceFormat?: IngestionJob['sourceFormat'];
  priority?: number;
}

export async function createIngestionJob(input: CreateIngestionJobInput): Promise<IngestionJob> {
  const now = new Date().toISOString();
  const job: IngestionJob = {
    id: randomUUID(),
    cardId: input.cardId,
    sourceUrl: input.sourceUrl,
    sourceFormat: input.sourceFormat ?? inferFormat(input.sourceUrl),
    status: 'queued',
    priority: input.priority ?? 0,
    requiresReview: false,
    createdAt: now,
    updatedAt: now,
  };

  jobStore.set(job.id, job);

  // Defer pipeline so callers receive the queued job first
  setImmediate(() => {
    void processJobAsync(job.id);
  });

  return job;
}

export async function listIngestionJobs(filter: {
  status?: IngestionStatus;
  limit?: number;
}): Promise<IngestionJob[]> {
  let jobs = [...jobStore.values()];

  if (filter.status) {
    jobs = jobs.filter((j) => j.status === filter.status);
  }

  jobs.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

  return jobs.slice(0, filter.limit ?? 50);
}

export async function getIngestionJob(id: string): Promise<IngestionJob | null> {
  return jobStore.get(id) ?? null;
}

export async function reviewIngestionJob(input: {
  id: string;
  action: 'approve' | 'reject';
  reviewedBy: string;
  notes?: string;
}): Promise<IngestionJob> {
  const job = jobStore.get(input.id);
  if (!job) throw new IngestionServiceError('Job not found', 'NOT_FOUND');
  if (job.status !== 'review') {
    throw new IngestionServiceError(`Job is in status "${job.status}", expected "review"`, 'INVALID_STATE');
  }

  job.status = input.action === 'approve' ? 'approved' : 'rejected';
  job.reviewedBy = input.reviewedBy;
  job.reviewNotes = input.notes;
  job.updatedAt = new Date().toISOString();

  if (input.action === 'approve') {
    job.status = 'published';
    job.completedAt = new Date().toISOString();
  }

  jobStore.set(job.id, job);
  return job;
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

async function processJobAsync(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  try {
    job.status = 'extracting';
    job.updatedAt = new Date().toISOString();
    job.contentHash = createHash('sha256').update(job.sourceUrl).digest('hex').slice(0, 16);
    jobStore.set(jobId, job);

    await sleep(50);

    job.status = 'parsing';
    job.updatedAt = new Date().toISOString();
    jobStore.set(jobId, job);

    await sleep(50);

    // Simulate confidence scoring — flag for review if low
    const confidence = 0.72 + Math.random() * 0.25;
    job.confidence = Math.round(confidence * 1000) / 1000;
    job.requiresReview = confidence < 0.85;
    job.status = job.requiresReview ? 'review' : 'approved';
    job.updatedAt = new Date().toISOString();

    if (!job.requiresReview) {
      job.status = 'published';
      job.completedAt = new Date().toISOString();
    }

    jobStore.set(jobId, job);
  } catch (error) {
    job.status = 'failed';
    job.errorMessage = error instanceof Error ? error.message : String(error);
    job.updatedAt = new Date().toISOString();
    jobStore.set(jobId, job);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ingestionService = {
  createIngestionJob,
  listIngestionJobs,
  getIngestionJob,
  reviewIngestionJob,
};
