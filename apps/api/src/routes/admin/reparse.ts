import { Hono } from 'hono';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import { runScheduledReparse } from '../../services/reparse.service.js';

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
