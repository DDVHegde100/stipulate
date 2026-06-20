import type { Context } from 'hono';

import { loadEnv } from '../config/env.js';
import { SESSION_COOKIE } from './consumer-context.js';

export function setSessionCookie(c: Context, token: string, expiresAt: Date): void {
  const env = loadEnv();
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';

  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  );
}

export function clearSessionCookie(c: Context): void {
  const env = loadEnv();
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';

  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
}
