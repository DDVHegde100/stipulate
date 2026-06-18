import { z } from 'zod';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import {
  createWebhookSubscription,
  generateWebhookSecret,
  listWebhookSubscriptions,
  deactivateWebhookSubscription,
} from '../../repositories/webhook.repository.js';
import { processWebhookQueue } from '../../services/webhook-delivery.service.js';
import { requireScope } from '../../middleware/org-auth.js';

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z
    .array(z.enum(['benefit.updated', 'benefit.version_published', '*']))
    .min(1)
    .default(['benefit.updated', 'benefit.version_published']),
});

export const webhooksHandler = new Hono<AppBindings>();

webhooksHandler.use('*', requireScope('webhooks:write'));

webhooksHandler.post('/', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) {
    throw new HTTPException(403, { message: 'Org context required for webhooks' });
  }

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = CreateWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook subscription', details: parsed.error.flatten() },
        requestId: c.get('requestId'),
      },
      422,
    );
  }

  const secret = generateWebhookSecret();
  const sub = await createWebhookSubscription({
    orgId,
    url: parsed.data.url,
    events: parsed.data.events,
    secret,
  });

  return c.json(
    {
      data: {
        id: sub.id,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
        warning: 'Store the secret now — it will not be shown again',
      },
      requestId: c.get('requestId'),
    },
    201,
  );
});

webhooksHandler.get('/', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) {
    throw new HTTPException(403, { message: 'Org context required' });
  }

  const subs = await listWebhookSubscriptions(orgId);
  return c.json({ data: subs, requestId: c.get('requestId') });
});

webhooksHandler.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) {
    throw new HTTPException(403, { message: 'Org context required' });
  }

  const ok = await deactivateWebhookSubscription(orgId, c.req.param('id'));
  if (!ok) throw new HTTPException(404, { message: 'Webhook subscription not found' });

  return c.json({ data: { revoked: true }, requestId: c.get('requestId') });
});

webhooksHandler.post('/deliver', async (c) => {
  const result = await processWebhookQueue({ limit: 25 });
  return c.json({ data: result, requestId: c.get('requestId') });
});
