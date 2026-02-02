import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../app.js';
import { loadEnv } from '../config/env.js';

export const API_KEY_HEADER = 'x-api-key';

/**
 * Validates API key authentication for protected routes.
 *
 * In development and test environments, requests without a key are allowed
 * when no API_KEY is configured. In production, a valid key is always required.
 */
export const auth = createMiddleware<AppBindings>(async (c, next) => {
  const env = loadEnv();
  const providedKey = c.req.header(API_KEY_HEADER);

  if (!env.API_KEY) {
    if (env.NODE_ENV === 'production') {
      throw new HTTPException(500, {
        message: 'Server authentication is misconfigured',
      });
    }

    c.set('authenticated', false);
    await next();
    return;
  }

  if (!providedKey) {
    throw new HTTPException(401, {
      message: 'Missing API key',
    });
  }

  if (!timingSafeEqual(providedKey, env.API_KEY)) {
    throw new HTTPException(403, {
      message: 'Invalid API key',
    });
  }

  c.set('authenticated', true);
  await next();
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

export function isAuthenticated(c: { get: (key: 'authenticated') => boolean }): boolean {
  return c.get('authenticated') === true;
}
