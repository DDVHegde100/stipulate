import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings } from '../app.js';
import { loadEnv } from '../config/env.js';
import { findApiKeyByHash, hashApiKey, touchApiKey } from '../repositories/org.repository.js';

export const API_KEY_HEADER = 'x-api-key';

/**
 * Validates API key — org-scoped DB keys with fallback to env API_KEY.
 */
export const orgAuth = createMiddleware<AppBindings>(async (c, next) => {
  const env = loadEnv();
  const providedKey = c.req.header(API_KEY_HEADER);

  if (!providedKey) {
    if (!env.API_KEY && env.NODE_ENV !== 'production') {
      c.set('authenticated', false);
      await next();
      return;
    }
    throw new HTTPException(401, { message: 'Missing API key' });
  }

  const prefix = providedKey.slice(0, 12);
  const keyHash = hashApiKey(providedKey);

  try {
    const apiKey = await findApiKeyByHash(keyHash, prefix);
    if (apiKey) {
      c.set('authenticated', true);
      c.set('orgId', apiKey.org_id);
      c.set('orgPlan', apiKey.org_plan);
      c.set('apiKeyId', apiKey.id);
      c.set('scopes', apiKey.scopes);
      c.set('rateLimitPerMinute', apiKey.rate_limit_per_minute);
      touchApiKey(apiKey.id).catch(() => {});
      await next();
      return;
    }
  } catch {
    // DB unavailable — fall through to env key
  }

  if (env.API_KEY && timingSafeEqual(providedKey, env.API_KEY)) {
    c.set('authenticated', true);
    c.set('orgId', '00000000-0000-4000-8000-000000000001');
    c.set('orgPlan', 'saas');
    c.set('scopes', ['route:read', 'enrich:read', 'admin:read']);
    c.set('rateLimitPerMinute', 600);
    await next();
    return;
  }

  throw new HTTPException(403, { message: 'Invalid API key' });
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function requireScope(scope: string) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const scopes = c.get('scopes') ?? [];
    if (!scopes.includes(scope) && !scopes.includes('*')) {
      throw new HTTPException(403, { message: `Missing scope: ${scope}` });
    }
    await next();
  });
}
