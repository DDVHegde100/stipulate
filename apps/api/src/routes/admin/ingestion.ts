import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import {
  IngestionServiceError,
  ingestionService,
  type IngestionStatus,
} from '../../services/ingestion.service.js';

const CreateJobSchema = z.object({
  card_id: z.string().min(1),
  source_url: z.string().url(),
  source_format: z.enum(['pdf', 'html', 'markdown', 'plain_text']).optional(),
  priority: z.number().int().min(0).max(10).optional(),
});

const ReviewJobSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewed_by: z.string().min(1),
  notes: z.string().optional(),
});

export const ingestionHandler = new Hono<AppBindings>();

ingestionHandler.post('/jobs', async (c) => {
  const requestId = c.get('requestId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId },
      422,
    );
  }

  const job = await ingestionService.createIngestionJob({
    cardId: parsed.data.card_id,
    sourceUrl: parsed.data.source_url,
    sourceFormat: parsed.data.source_format,
    priority: parsed.data.priority,
  });

  return c.json({ data: job, requestId }, 201);
});

ingestionHandler.get('/jobs', async (c) => {
  const requestId = c.get('requestId');
  const status = c.req.query('status') as IngestionStatus | undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;

  const jobs = await ingestionService.listIngestionJobs({ status, limit });
  return c.json({ data: { jobs, count: jobs.length }, requestId });
});

ingestionHandler.get('/jobs/:id', async (c) => {
  const requestId = c.get('requestId');
  const job = await ingestionService.getIngestionJob(c.req.param('id'));

  if (!job) throw new HTTPException(404, { message: 'Ingestion job not found' });

  return c.json({ data: job, requestId });
});

ingestionHandler.post('/jobs/:id/review', async (c) => {
  const requestId = c.get('requestId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = ReviewJobSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId },
      422,
    );
  }

  try {
    const job = await ingestionService.reviewIngestionJob({
      id: c.req.param('id'),
      action: parsed.data.action,
      reviewedBy: parsed.data.reviewed_by,
      notes: parsed.data.notes,
    });
    return c.json({ data: job, requestId });
  } catch (error) {
    if (error instanceof IngestionServiceError) {
      throw new HTTPException(error.code === 'NOT_FOUND' ? 404 : 409, { message: error.message });
    }
    throw error;
  }
});

ingestionHandler.get('/queue', async (c) => {
  const requestId = c.get('requestId');
  const reviewJobs = await ingestionService.listIngestionJobs({ status: 'review' });
  const queuedJobs = await ingestionService.listIngestionJobs({ status: 'queued' });

  return c.json({
    data: {
      review: reviewJobs,
      queued: queuedJobs,
      review_count: reviewJobs.length,
      queued_count: queuedJobs.length,
    },
    requestId,
  });
});
