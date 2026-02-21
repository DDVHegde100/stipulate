import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import { createOrgWithApiKey, findOrgBySlug } from '../../repositories/org.repository.js';
import { query } from '../../lib/db.js';

const CreateOrgSchema = z.object({
  slug: z.string().min(2).max(64),
  name: z.string().min(1),
  plan: z.enum(['free', 'payg', 'saas', 'enterprise']).default('free'),
});

const CreateKeySchema = z.object({
  name: z.string().min(1).default('default'),
  scopes: z.array(z.string()).default(['route:read', 'enrich:read']),
});

export const orgsHandler = new Hono<AppBindings>();

orgsHandler.post('/', async (c) => {
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') }, 422);
  }

  const result = await createOrgWithApiKey({
    slug: parsed.data.slug,
    name: parsed.data.name,
    plan: parsed.data.plan,
    scopes: ['route:read', 'enrich:read', 'webhooks:write'],
  });

  return c.json({
    data: {
      org: result.org,
      apiKey: result.rawKey,
      warning: 'Store the API key now — it will not be shown again',
    },
    requestId: c.get('requestId'),
  }, 201);
});

orgsHandler.get('/:slug', async (c) => {
  const org = await findOrgBySlug(c.req.param('slug'));
  if (!org) throw new HTTPException(404, { message: 'Org not found' });
  return c.json({ data: org, requestId: c.get('requestId') });
});

orgsHandler.post('/:slug/keys', async (c) => {
  const org = await findOrgBySlug(c.req.param('slug'));
  if (!org) throw new HTTPException(404, { message: 'Org not found' });

  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = CreateKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') }, 422);
  }

  const result = await createOrgWithApiKey({
    slug: org.slug,
    name: org.name,
    plan: org.plan,
    keyName: parsed.data.name,
    scopes: parsed.data.scopes,
  });

  return c.json({
    data: { apiKey: result.rawKey, prefix: result.prefix },
    requestId: c.get('requestId'),
  }, 201);
});

orgsHandler.get('/:slug/keys', async (c) => {
  const org = await findOrgBySlug(c.req.param('slug'));
  if (!org) throw new HTTPException(404, { message: 'Org not found' });

  const result = await query<{ id: string; key_prefix: string; name: string; scopes: unknown; is_active: boolean; last_used_at: string | null }>(
    `SELECT id, key_prefix, name, scopes, is_active, last_used_at::text
     FROM api_keys WHERE org_id = $1::uuid ORDER BY created_at DESC`,
    [org.id],
  );

  return c.json({
    data: result.rows.map((row) => ({
      id: row.id,
      prefix: row.key_prefix,
      name: row.name,
      scopes: row.scopes,
      is_active: row.is_active,
      last_used_at: row.last_used_at,
    })),
    requestId: c.get('requestId'),
  });
});
