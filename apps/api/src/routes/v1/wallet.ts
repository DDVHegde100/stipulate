import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import { UpsertRotatingCategoryStateSchema } from '@stipulate/schema';
import * as rotatingRepo from '../../repositories/rotating-category.repository.js';

export const walletHandler = new Hono<AppBindings>();

walletHandler.get('/category-state', async (c) => {
  const cardId = c.req.query('cardId');
  if (!cardId) {
    throw new HTTPException(400, { message: 'cardId query parameter is required' });
  }

  const rows = await rotatingRepo.listActiveRotatingStates({
    orgId: c.get('orgId'),
    userRef: c.req.query('userRef') ?? 'default',
    cardIds: [cardId],
  });

  const active = rows[0];
  return c.json({
    data: active
      ? {
          cardId: active.card_id,
          stateType: active.state_type,
          activeCategory: active.active_category,
          quarterKey: active.quarter_key,
          activated: active.activated,
          effectiveFrom: active.effective_from.toISOString().slice(0, 10),
        }
      : null,
    requestId: c.get('requestId'),
  });
});

walletHandler.post('/category-state', async (c) => {
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = UpsertRotatingCategoryStateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid category state payload',
          details: parsed.error.flatten(),
        },
        requestId: c.get('requestId'),
      },
      422,
    );
  }

  const row = await rotatingRepo.upsertRotatingCategoryState({
    orgId: c.get('orgId'),
    userRef: c.req.query('userRef') ?? 'default',
    cardId: parsed.data.cardId,
    stateType: parsed.data.stateType,
    activeCategory: parsed.data.activeCategory,
    quarterKey: parsed.data.quarterKey,
    activated: parsed.data.activated,
  });

  return c.json({
    data: {
      cardId: row.card_id,
      stateType: row.state_type,
      activeCategory: row.active_category,
      quarterKey: row.quarter_key,
      activated: row.activated,
      effectiveFrom: row.effective_from.toISOString().slice(0, 10),
    },
    requestId: c.get('requestId'),
  });
});
