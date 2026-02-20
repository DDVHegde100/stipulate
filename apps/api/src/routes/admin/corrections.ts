import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import {
  approveMccCorrection,
  listPendingCorrections,
  rejectMccCorrection,
} from '../../repositories/merchant.repository.js';

const ReviewSchema = z.object({
  reviewed_by: z.string().min(1),
  notes: z.string().optional(),
});

export const correctionsHandler = new Hono<AppBindings>();

correctionsHandler.get('/', async (c) => {
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
  const rows = await listPendingCorrections(limit);
  return c.json({ data: { corrections: rows, count: rows.length }, requestId: c.get('requestId') });
});

correctionsHandler.post('/:id/approve', async (c) => {
  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') }, 422);
  }

  const row = await approveMccCorrection(c.req.param('id'), parsed.data.reviewed_by, parsed.data.notes);
  if (!row) throw new HTTPException(404, { message: 'Correction not found' });
  return c.json({ data: row, requestId: c.get('requestId') });
});

correctionsHandler.post('/:id/reject', async (c) => {
  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') }, 422);
  }

  const row = await rejectMccCorrection(c.req.param('id'), parsed.data.reviewed_by, parsed.data.notes);
  if (!row) throw new HTTPException(404, { message: 'Correction not found' });
  return c.json({ data: row, requestId: c.get('requestId') });
});
