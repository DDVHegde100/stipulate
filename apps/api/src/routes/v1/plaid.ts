import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';

export const plaidHandler = new Hono<AppBindings>();

/** Create a Plaid Link token (sandbox stub until Plaid keys configured). */
plaidHandler.post('/link-token', async (c) => {
  const configured = Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);

  if (!configured) {
    return c.json({
      data: {
        linkToken: `link-sandbox-stub-${Date.now()}`,
        expiration: new Date(Date.now() + 30 * 60_000).toISOString(),
        mode: 'stub',
        message: 'Configure PLAID_CLIENT_ID and PLAID_SECRET for live bank linking',
      },
      requestId: c.get('requestId'),
    });
  }

  return c.json({
    data: {
      linkToken: `link-production-pending-${Date.now()}`,
      expiration: new Date(Date.now() + 30 * 60_000).toISOString(),
      mode: 'pending',
      message: 'Plaid SDK integration pending in next release',
    },
    requestId: c.get('requestId'),
  });
});

/** Exchange public token for access token (stub). */
plaidHandler.post('/exchange', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { publicToken?: string };

  if (!body.publicToken) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'publicToken is required' },
        requestId: c.get('requestId'),
      },
      422,
    );
  }

  return c.json({
    data: {
      itemId: `item_stub_${body.publicToken.slice(-8)}`,
      institutionName: 'Stub Bank',
      accountsLinked: 0,
      mode: 'stub',
    },
    requestId: c.get('requestId'),
  });
});
