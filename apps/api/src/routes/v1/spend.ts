import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import { getSpendSummaryForUser, annualPeriodStart } from '../../repositories/spend.repository.js';

const SpendQuerySchema = z.object({
  user_ref: z.string().min(1).default('default'),
  card_ids: z.string().optional(),
});

export const spendHandler = new Hono<AppBindings>();

spendHandler.get('/summary', async (c) => {
  const orgId = c.get('orgId');
  const parsed = SpendQuerySchema.safeParse({
    user_ref: c.req.query('user_ref'),
    card_ids: c.req.query('card_ids'),
  });

  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const cardIds = parsed.data.card_ids
    ? parsed.data.card_ids.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

  if (cardIds.length === 0) {
    throw new HTTPException(400, { message: 'card_ids query param is required' });
  }

  const periodStart = annualPeriodStart();
  const rows = await getSpendSummaryForUser({
    orgId,
    userRef: parsed.data.user_ref,
    cardIds,
    periodStart,
  });

  return c.json({
    data: {
      userRef: parsed.data.user_ref,
      periodStart,
      caps: rows.map((row) => ({
        cardId: row.card_id,
        category: row.category,
        capPeriod: row.cap_period,
        spentMinor: row.spent_cents,
      })),
    },
    requestId: c.get('requestId'),
  });
});
