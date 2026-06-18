import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import {
  createApiKeyForOrg,
  listApiKeysForOrg,
  revokeApiKeyForOrg,
} from '../../repositories/org.repository.js';

const CreateKeySchema = z.object({
  name: z.string().min(1).max(64).default('default'),
  scopes: z
    .array(z.string())
    .default(['route:read', 'enrich:read', 'webhooks:write']),
});

export const keysHandler = new Hono<AppBindings>();

keysHandler.get('/', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const keys = await listApiKeysForOrg(orgId);
  return c.json({ data: keys, requestId: c.get('requestId') });
});

keysHandler.post('/', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = CreateKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const result = await createApiKeyForOrg(orgId, {
    name: parsed.data.name,
    scopes: parsed.data.scopes,
    plan: c.get('orgPlan') ?? 'free',
  });

  return c.json(
    {
      data: {
        id: result.id,
        prefix: result.prefix,
        name: parsed.data.name,
        apiKey: result.rawKey,
        warning: 'Store the API key now — it will not be shown again',
      },
      requestId: c.get('requestId'),
    },
    201,
  );
});

keysHandler.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const revoked = await revokeApiKeyForOrg(orgId, c.req.param('id'));
  if (!revoked) throw new HTTPException(404, { message: 'API key not found' });

  return c.json({ data: { revoked: true }, requestId: c.get('requestId') });
});
