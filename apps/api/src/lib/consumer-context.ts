import type { Context } from 'hono';

import { findConsumerUserIdBySessionToken } from '../repositories/consumer-session.repository.js';

const SESSION_COOKIE = 'stipulate_session';

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}

/** Resolve consumer user from header or session cookie. */
export async function resolveConsumerUserId(c: Context): Promise<string | null> {
  const header =
    c.req.header('X-Consumer-User-Id') ??
    c.req.header('X-User-Id') ??
    c.req.header('X-User-Ref') ??
    c.req.query('userRef');

  if (header) return header;

  const cookies = parseCookies(c.req.header('Cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  return findConsumerUserIdBySessionToken(token);
}

export { SESSION_COOKIE };
