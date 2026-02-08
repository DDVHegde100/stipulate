import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { timingSafeEqual } from 'node:crypto';

import { loadEnv } from '../config/env.js';
import type { AppBindings } from '../app.js';

/** Admin API key middleware — separate from public API keys. */
export const adminAuth = createMiddleware<AppBindings>(async (c, next) => {
  const env = loadEnv();
  const adminKey = process.env.ADMIN_API_KEY ?? env.API_KEY;

  if (!adminKey) {
    throw new HTTPException(503, { message: 'Admin API not configured' });
  }

  const provided =
    c.req.header('X-Admin-Key') ??
    c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') ??
    c.req.header('X-API-Key');

  if (!provided || !safeCompare(provided, adminKey)) {
    throw new HTTPException(403, { message: 'Invalid admin credentials' });
  }

  await next();
});

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
