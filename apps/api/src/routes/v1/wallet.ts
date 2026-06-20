import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import { UpsertRotatingCategoryStateSchema } from '@stipulate/schema';
import * as rotatingRepo from '../../repositories/rotating-category.repository.js';
import * as walletRepo from '../../repositories/wallet.repository.js';

const AddWalletCardSchema = z.object({
  cardId: z.string().min(1),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const walletHandler = new Hono<AppBindings>();

function resolveConsumerUserId(c: {
  req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined };
}): string {
  return (
    c.req.header('X-Consumer-User-Id') ??
    c.req.header('X-User-Ref') ??
    c.req.query('userRef') ??
    'default'
  );
}

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

walletHandler.get('/cards', async (c) => {
  const userRef = resolveConsumerUserId(c);
  const rows = await walletRepo.listWalletCards(userRef);

  return c.json({
    data: {
      cards: rows.map((row) => ({
        cardId: row.card_id,
        label: row.label ?? row.card_id,
        isPrimary: row.is_primary,
        addedAt: row.added_at.toISOString(),
      })),
    },
    requestId: c.get('requestId'),
  });
});

walletHandler.post('/cards', async (c) => {
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = AddWalletCardSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        requestId: c.get('requestId'),
      },
      422,
    );
  }

  const userRef = resolveConsumerUserId(c);
  const row = await walletRepo.addWalletCard({
    consumerUserId: userRef,
    cardId: parsed.data.cardId,
    label: parsed.data.label,
    isPrimary: parsed.data.isPrimary,
  });

  return c.json(
    {
      data: {
        cardId: row.card_id,
        label: row.label ?? row.card_id,
        isPrimary: row.is_primary,
        addedAt: row.added_at.toISOString(),
      },
      requestId: c.get('requestId'),
    },
    201,
  );
});

walletHandler.delete('/cards/:cardId', async (c) => {
  const userRef = resolveConsumerUserId(c);
  const removed = await walletRepo.removeWalletCard(userRef, c.req.param('cardId'));

  if (!removed) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Wallet card not found' }, requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({ data: { removed: true }, requestId: c.get('requestId') });
});
