import { Hono } from 'hono';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import { runScheduledReparse } from '../../services/reparse.service.js';
import * as reparseRepo from '../../repositories/reparse.repository.js';

const TriggerSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  concurrency: z.number().int().min(1).max(10).optional(),
});

export const reparseHandler = new Hono<AppBindings>();

reparseHandler.post('/trigger', async (c) => {
  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = TriggerSchema.safeParse(body);

  const result = await runScheduledReparse({
    limit: parsed.success ? parsed.data.limit : 50,
    concurrency: parsed.success ? parsed.data.concurrency : 3,
  });

  return c.json({
    data: {
      runId: result.runId,
      summary: result.summary,
      enqueued: result.enqueued,
    },
    requestId: c.get('requestId'),
  });
});

reparseHandler.get('/runs', async (c) => {
  const limit = Number(c.req.query('limit') ?? 20);
  const runs = await reparseRepo.listReparseRuns(Math.min(Math.max(limit, 1), 100));

  return c.json({
    data: {
      runs: runs.map((run) => ({
        id: run.id,
        startedAt: run.started_at.toISOString(),
        completedAt: run.completed_at?.toISOString() ?? null,
        cardsChecked: run.cards_checked,
        cardsChanged: run.cards_changed,
        cardsFailed: run.cards_failed,
        status: run.status,
      })),
    },
    requestId: c.get('requestId'),
  });
});
