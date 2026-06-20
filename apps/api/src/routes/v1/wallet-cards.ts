import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import * as walletRepo from '../../repositories/wallet.repository.js';

const AddWalletCardSchema = z.object({
  cardId: z.string().min(1),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const walletCardsHandler = new Hono<AppBindings>();

function resolveUserRef(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header('X-User-Ref') ?? c.req.header('X-Consumer-User-Id') ?? 'default';
}

walletCardsHandler.get('/cards', async (c) => {
  const userRef = resolveUserRef(c);
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

walletCardsHandler.post('/cards', async (c) => {
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

  const userRef = resolveUserRef(c);
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

walletCardsHandler.delete('/cards/:cardId', async (c) => {
  const userRef = resolveUserRef(c);
  const removed = await walletRepo.removeWalletCard(userRef, c.req.param('cardId'));

  if (!removed) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Wallet card not found' }, requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({ data: { removed: true }, requestId: c.get('requestId') });
});
