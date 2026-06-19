import { randomUUID } from 'node:crypto';
import { query } from '../lib/db.js';

export type IngestionStatus =
  | 'queued'
  | 'extracting'
  | 'parsing'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'failed';

export interface IngestionJobRow {
  id: string;
  cardId: string;
  sourceUrl: string;
  sourceFormat: 'pdf' | 'html' | 'markdown' | 'plain_text';
  status: IngestionStatus;
  priority: number;
  contentHash?: string;
  extractionResult?: unknown;
  parseResult?: unknown;
  normalizedRules?: unknown;
  confidence?: number;
  requiresReview: boolean;
  reviewNotes?: string;
  reviewedBy?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const memoryStore = new Map<string, IngestionJobRow>();

function useMemory(): boolean {
  return process.env.NODE_ENV === 'test';
}

function rowToJob(row: Record<string, unknown>): IngestionJobRow {
  return {
    id: String(row.id),
    cardId: String(row.card_id ?? row.cardId),
    sourceUrl: String(row.source_url ?? row.sourceUrl),
    sourceFormat: (row.source_format ?? row.sourceFormat ?? 'html') as IngestionJobRow['sourceFormat'],
    status: String(row.status) as IngestionStatus,
    priority: Number(row.priority ?? 0),
    contentHash: row.content_hash ? String(row.content_hash) : row.contentHash ? String(row.contentHash) : undefined,
    extractionResult: row.extraction_result ?? row.extractionResult,
    parseResult: row.parse_result ?? row.parseResult,
    normalizedRules: row.normalized_rules ?? row.normalizedRules,
    confidence: row.confidence != null ? Number(row.confidence) : undefined,
    requiresReview: Boolean(row.requires_review ?? row.requiresReview),
    reviewNotes: row.review_notes ? String(row.review_notes) : row.reviewNotes ? String(row.reviewNotes) : undefined,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : row.reviewedBy ? String(row.reviewedBy) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : row.errorMessage ? String(row.errorMessage) : undefined,
    createdAt: String(row.created_at ?? row.createdAt),
    updatedAt: String(row.updated_at ?? row.updatedAt),
    completedAt: row.completed_at ? String(row.completed_at) : row.completedAt ? String(row.completedAt) : undefined,
  };
}

export async function insertIngestionJob(input: {
  cardId: string;
  sourceUrl: string;
  sourceFormat: IngestionJobRow['sourceFormat'];
  priority: number;
}): Promise<IngestionJobRow> {
  const now = new Date().toISOString();

  if (useMemory()) {
    const job: IngestionJobRow = {
      id: randomUUID(),
      cardId: input.cardId,
      sourceUrl: input.sourceUrl,
      sourceFormat: input.sourceFormat,
      status: 'queued',
      priority: input.priority,
      requiresReview: false,
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.set(job.id, job);
    await recordJobEvent(job.id, null, 'queued', 'Job created');
    return job;
  }

  const result = await query<{ id: string }>(
    `INSERT INTO ingestion_jobs (card_id, source_url, source_format, status, priority)
     VALUES ($1, $2, $3, 'queued', $4)
     RETURNING id`,
    [input.cardId, input.sourceUrl, input.sourceFormat, input.priority],
  );

  const id = result.rows[0]!.id;
  await recordJobEvent(id, null, 'queued', 'Job created');
  return (await getIngestionJobById(id))!;
}

export async function getIngestionJobById(id: string): Promise<IngestionJobRow | null> {
  if (useMemory()) return memoryStore.get(id) ?? null;

  const result = await query(
    `SELECT id, card_id, source_url, source_format, status, priority, content_hash,
            extraction_result, parse_result, normalized_rules, confidence::float,
            requires_review, review_notes, reviewed_by, error_message,
            created_at::text, updated_at::text, completed_at::text
     FROM ingestion_jobs WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? rowToJob(result.rows[0]) : null;
}

export async function listIngestionJobs(filter: {
  status?: IngestionStatus;
  limit?: number;
}): Promise<IngestionJobRow[]> {
  if (useMemory()) {
    let jobs = [...memoryStore.values()];
    if (filter.status) jobs = jobs.filter((j) => j.status === filter.status);
    jobs.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));
    return jobs.slice(0, filter.limit ?? 50);
  }

  const params: unknown[] = [filter.limit ?? 50];
  let where = '';
  if (filter.status) {
    params.push(filter.status);
    where = `WHERE status = $${params.length}`;
  }

  const result = await query(
    `SELECT id, card_id, source_url, source_format, status, priority, content_hash,
            extraction_result, parse_result, normalized_rules, confidence::float,
            requires_review, review_notes, reviewed_by, error_message,
            created_at::text, updated_at::text, completed_at::text
     FROM ingestion_jobs ${where}
     ORDER BY priority DESC, created_at ASC
     LIMIT $1`,
    params,
  );
  return result.rows.map(rowToJob);
}

export async function fetchQueuedJobs(limit = 10): Promise<IngestionJobRow[]> {
  return listIngestionJobs({ status: 'queued', limit });
}

/** Count ingestion jobs by status (for status page). */
export async function countJobsByStatus(status: IngestionStatus): Promise<number> {
  if (useMemory()) {
    return [...memoryStore.values()].filter((j) => j.status === status).length;
  }

  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ingestion_jobs WHERE status = $1`,
    [status],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function updateIngestionJob(
  id: string,
  patch: Partial<{
    status: IngestionStatus;
    contentHash: string;
    extractionResult: unknown;
    parseResult: unknown;
    normalizedRules: unknown;
    confidence: number;
    requiresReview: boolean;
    reviewNotes: string;
    reviewedBy: string;
    errorMessage: string;
    completedAt: string;
  }>,
): Promise<IngestionJobRow | null> {
  const existing = await getIngestionJobById(id);
  if (!existing) return null;

  const fromStatus = existing.status;
  const updated: IngestionJobRow = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (useMemory()) {
    memoryStore.set(id, updated);
    if (patch.status && patch.status !== fromStatus) {
      await recordJobEvent(id, fromStatus, patch.status, patch.errorMessage);
    }
    return updated;
  }

  await query(
    `UPDATE ingestion_jobs SET
       status = COALESCE($2, status),
       content_hash = COALESCE($3, content_hash),
       extraction_result = COALESCE($4, extraction_result),
       parse_result = COALESCE($5, parse_result),
       normalized_rules = COALESCE($6, normalized_rules),
       confidence = COALESCE($7, confidence),
       requires_review = COALESCE($8, requires_review),
       review_notes = COALESCE($9, review_notes),
       reviewed_by = COALESCE($10, reviewed_by),
       error_message = COALESCE($11, error_message),
       completed_at = COALESCE($12::timestamptz, completed_at),
       updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      patch.status ?? null,
      patch.contentHash ?? null,
      patch.extractionResult ? JSON.stringify(patch.extractionResult) : null,
      patch.parseResult ? JSON.stringify(patch.parseResult) : null,
      patch.normalizedRules ? JSON.stringify(patch.normalizedRules) : null,
      patch.confidence ?? null,
      patch.requiresReview ?? null,
      patch.reviewNotes ?? null,
      patch.reviewedBy ?? null,
      patch.errorMessage ?? null,
      patch.completedAt ?? null,
    ],
  );

  if (patch.status && patch.status !== fromStatus) {
    await recordJobEvent(id, fromStatus, patch.status, patch.errorMessage);
  }

  return getIngestionJobById(id);
}

export async function recordJobEvent(
  jobId: string,
  fromStatus: IngestionStatus | null,
  toStatus: IngestionStatus,
  message?: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (useMemory()) return;

  await query(
    `INSERT INTO ingestion_job_events (job_id, from_status, to_status, message, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [jobId, fromStatus, toStatus, message ?? null, JSON.stringify(metadata)],
  );
}

/** Reset in-memory store for tests. */
export function resetIngestionMemoryStore(): void {
  memoryStore.clear();
}
