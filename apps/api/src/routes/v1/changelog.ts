import { Hono } from 'hono';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import { benefitService } from '../../services/benefit.service.js';

const ChangelogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  card_id: z.string().optional(),
});

export const changelogHandler = new Hono<AppBindings>();

changelogHandler.get('/', async (c) => {
  const requestId = c.get('requestId');

  const parsed = ChangelogQuerySchema.safeParse({
    limit: c.req.query('limit'),
    cursor: c.req.query('cursor'),
    card_id: c.req.query('card_id'),
  });

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: parsed.error.flatten() },
        requestId,
      },
      422,
    );
  }

  const result = await benefitService.getChangelog({
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
    cardId: parsed.data.card_id,
  });

  return c.json({ data: result, requestId });
});
