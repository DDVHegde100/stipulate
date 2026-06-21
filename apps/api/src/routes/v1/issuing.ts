import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import { CreateCardholderSchema, IssueVirtualCardSchema, OrderPhysicalCardSchema, UpdateVirtualCardStatusSchema } from '@stipulate/schema';
import { resolveConsumerUserId } from '../../lib/consumer-context.js';
import * as issuingRepo from '../../repositories/issuing.repository.js';
import * as authRepo from '../../repositories/issuing-authorization.repository.js';

export const issuingHandler = new Hono<AppBindings>();

issuingHandler.post('/cardholders', async (c) => {
  const consumerUserId = await resolveConsumerUserId(c);
  if (!consumerUserId) throw new HTTPException(401, { message: 'Authentication required' });

  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = CreateCardholderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const cardholder = await issuingRepo.createCardholder({
    consumerUserId,
    programSlug: parsed.data.programSlug,
  });

  return c.json(
    {
      data: {
        id: cardholder.id,
        consumerUserId: cardholder.consumer_user_id,
        programSlug: cardholder.program_slug,
        status: cardholder.status,
        kycStatus: cardholder.kyc_status,
        createdAt: cardholder.created_at.toISOString(),
        mode: cardholder.mode,
      },
      requestId: c.get('requestId'),
    },
    201,
  );
});

issuingHandler.post('/cards/virtual', async (c) => {
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = IssueVirtualCardSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const card = await issuingRepo.issueVirtualCard({
    cardholderId: parsed.data.cardholderId,
    spendLimitMinor: parsed.data.spendLimitMinor,
  });

  return c.json(
    {
      data: {
        id: card.id,
        cardholderId: card.cardholder_id,
        last4: card.last4,
        network: card.network,
        status: card.status,
        panToken: card.pan_token,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        spendLimitMinor: card.spend_limit_minor,
        mode: card.mode,
      },
      requestId: c.get('requestId'),
    },
    201,
  );
});

issuingHandler.get('/cards/virtual', async (c) => {
  const cardholderId = c.req.query('cardholderId');
  if (!cardholderId) {
    throw new HTTPException(400, { message: 'cardholderId query parameter is required' });
  }

  const cards = await issuingRepo.listVirtualCards(cardholderId);
  return c.json({
    data: {
      cards: cards.map((card) => ({
        id: card.id,
        cardholderId: card.cardholder_id,
        last4: card.last4,
        network: card.network,
        status: card.status,
        expMonth: card.exp_month,
        expYear: card.exp_year,
      })),
    },
    requestId: c.get('requestId'),
  });
});

issuingHandler.patch('/cards/virtual/:id/status', async (c) => {
  const cardId = c.req.param('id');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = UpdateVirtualCardStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const card = await issuingRepo.updateVirtualCardStatus({
    cardId,
    status: parsed.data.status,
  });
  if (!card) throw new HTTPException(404, { message: 'Virtual card not found' });

  return c.json({
    data: {
      id: card.id,
      cardholderId: card.cardholder_id,
      last4: card.last4,
      network: card.network,
      status: card.status,
      mode: card.mode,
    },
    requestId: c.get('requestId'),
  });
});

issuingHandler.post('/cards/physical/order', async (c) => {
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = OrderPhysicalCardSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  try {
    const order = await issuingRepo.orderPhysicalCard({
      cardholderId: parsed.data.cardholderId,
      shippingAddress: parsed.data.shippingAddress,
    });

    return c.json(
      {
        data: {
          id: order.id,
          cardholderId: order.cardholder_id,
          status: order.status,
          trackingNumber: order.tracking_number,
          createdAt: order.created_at.toISOString(),
        },
        requestId: c.get('requestId'),
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Cardholder not found') {
      throw new HTTPException(404, { message: error.message });
    }
    throw error;
  }
});

issuingHandler.get('/cards/physical/orders', async (c) => {
  const cardholderId = c.req.query('cardholderId');
  if (!cardholderId) {
    throw new HTTPException(400, { message: 'cardholderId query parameter is required' });
  }

  const orders = await issuingRepo.listPhysicalCardOrders(cardholderId);
  return c.json({
    data: {
      orders: orders.map((order) => ({
        id: order.id,
        cardholderId: order.cardholder_id,
        status: order.status,
        trackingNumber: order.tracking_number,
        createdAt: order.created_at.toISOString(),
      })),
    },
    requestId: c.get('requestId'),
  });
});

issuingHandler.get('/authorizations', async (c) => {
  const cardholderId = c.req.query('cardholderId');
  const virtualCardId = c.req.query('virtualCardId');
  if (!cardholderId && !virtualCardId) {
    throw new HTTPException(400, {
      message: 'cardholderId or virtualCardId query parameter is required',
    });
  }

  const limit = Number(c.req.query('limit') ?? '50');
  const authorizations = await authRepo.listIssuingAuthorizations({
    cardholderId: cardholderId ?? undefined,
    virtualCardId: virtualCardId ?? undefined,
    limit: Number.isFinite(limit) ? limit : 50,
  });

  return c.json({
    data: {
      authorizations: authorizations.map((row) => ({
        id: row.id,
        virtualCardId: row.virtual_card_id,
        cardExternalId: row.card_external_id,
        externalId: row.external_id,
        amountMinor: row.amount_minor,
        currency: row.currency,
        merchantName: row.merchant_name,
        merchantCategoryCode: row.merchant_category_code,
        status: row.status,
        authorizedAt: row.authorized_at.toISOString(),
      })),
    },
    requestId: c.get('requestId'),
  });
});
