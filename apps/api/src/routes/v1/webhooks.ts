import { z } from 'zod';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import {
  createWebhookSubscription,
  generateWebhookSecret,
  listWebhookSubscriptions,
  listWebhookDeliveriesForOrg,
  deactivateWebhookSubscription,
} from '../../repositories/webhook.repository.js';
import { recordAuditEvent } from '../../repositories/audit.repository.js';
import { processWebhookQueue } from '../../services/webhook-delivery.service.js';
import { requireScope } from '../../middleware/org-auth.js';
import { idempotency } from '../../middleware/idempotency.js';

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z
    .array(z.enum(['benefit.updated', 'benefit.version_published', '*']))
    .min(1)
    .default(['benefit.updated', 'benefit.version_published']),
});

export const webhooksHandler = new Hono<AppBindings>();

webhooksHandler.post('/', requireScope('webhooks:write'), idempotency, async (c) => {
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

  await recordAuditEvent({
    orgId,
    action: 'webhook.created',
    resourceType: 'webhook',
    resourceId: sub.id,
    metadata: { url: parsed.data.url, events: parsed.data.events },
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

webhooksHandler.get('/', requireScope('webhooks:write'), async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) {
    throw new HTTPException(403, { message: 'Org context required' });
  }

  const subs = await listWebhookSubscriptions(orgId);
  return c.json({ data: subs, requestId: c.get('requestId') });
});

webhooksHandler.get('/deliveries', requireScope('webhooks:write'), async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) {
    throw new HTTPException(403, { message: 'Org context required' });
  }

  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
  const deliveries = await listWebhookDeliveriesForOrg(orgId, limit);
  return c.json({ data: { deliveries }, requestId: c.get('requestId') });
});

webhooksHandler.delete('/:id', requireScope('webhooks:write'), async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) {
    throw new HTTPException(403, { message: 'Org context required' });
  }

  const ok = await deactivateWebhookSubscription(orgId, c.req.param('id'));
  if (!ok) throw new HTTPException(404, { message: 'Webhook subscription not found' });

  await recordAuditEvent({
    orgId,
    action: 'webhook.revoked',
    resourceType: 'webhook',
    resourceId: c.req.param('id'),
  });

  return c.json({ data: { revoked: true }, requestId: c.get('requestId') });
});

webhooksHandler.post('/deliver', requireScope('webhooks:write'), async (c) => {
  const result = await processWebhookQueue({ limit: 25 });
  return c.json({ data: result, requestId: c.get('requestId') });
});
