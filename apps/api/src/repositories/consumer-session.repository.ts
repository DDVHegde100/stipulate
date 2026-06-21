import { createHash, randomBytes } from 'node:crypto';

import { query } from '../lib/db.js';

export interface ConsumerSessionRow {
  id: string;
  consumer_user_id: string;
  token_hash: string;
  expires_at: Date;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const testSessions = new Map<string, ConsumerSessionRow>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Create a session and return the raw token (store hash only). */
export async function createConsumerSession(consumerUserId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  if (process.env.NODE_ENV === 'test') {
    const row: ConsumerSessionRow = {
      id: `session-${consumerUserId}`,
      consumer_user_id: consumerUserId,
      token_hash: hashToken(token),
      expires_at: expiresAt,
    };
    testSessions.set(hashToken(token), row);
    return { token, expiresAt };
  }

  await query(
    `INSERT INTO consumer_sessions (consumer_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [consumerUserId, hashToken(token), expiresAt.toISOString()],
  );

  return { token, expiresAt };
}

/** Resolve a session token to a consumer user id. */
export async function findConsumerUserIdBySessionToken(
  token: string,
): Promise<string | null> {
  const tokenHash = hashToken(token);

  if (process.env.NODE_ENV === 'test') {
    const row = testSessions.get(tokenHash);
    if (!row) return null;
    if (row.expires_at.getTime() < Date.now()) return null;
    return row.consumer_user_id;
  }

  const result = await query<{ consumer_user_id: string }>(
    `UPDATE consumer_sessions
     SET last_used_at = NOW()
     WHERE token_hash = $1 AND expires_at > NOW()
     RETURNING consumer_user_id`,
    [tokenHash],
  );

  return result.rows[0]?.consumer_user_id ?? null;
}

/** Revoke a session by token. */
export async function revokeConsumerSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  if (process.env.NODE_ENV === 'test') {
    testSessions.delete(tokenHash);
    return;
  }

  await query(`DELETE FROM consumer_sessions WHERE token_hash = $1`, [tokenHash]);
}

/** Revoke all sessions for a consumer user (e.g. on account deletion request). */
export async function revokeAllConsumerSessions(consumerUserId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    for (const [hash, row] of testSessions.entries()) {
      if (row.consumer_user_id === consumerUserId) {
        testSessions.delete(hash);
      }
    }
    return;
  }

  await query(`DELETE FROM consumer_sessions WHERE consumer_user_id = $1::uuid`, [consumerUserId]);
}
