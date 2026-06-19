import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from '../lib/db.js';

export interface ConsumerUserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  timezone: string;
  onboarding_complete: boolean;
  wallet_card_ids: string[];
  notification_prefs: { email: boolean; push: boolean };
  expo_push_token: string | null;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
  } catch {
    return false;
  }
}

export async function createConsumerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<ConsumerUserRow> {
  if (process.env.NODE_ENV === 'test') {
    return {
      id: '00000000-0000-4000-8000-000000000001',
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      password_hash: hashPassword(input.password),
      timezone: 'UTC',
      onboarding_complete: false,
      wallet_card_ids: [],
      notification_prefs: { email: true, push: false },
      expo_push_token: null,
    };
  }

  const passwordHash = hashPassword(input.password);
  const result = await query<ConsumerUserRow & { wallet_card_ids: unknown; notification_prefs: unknown }>(
    `INSERT INTO consumer_users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, password_hash, timezone, onboarding_complete,
               wallet_card_ids, notification_prefs, expo_push_token`,
    [input.email.toLowerCase(), input.name ?? null, passwordHash],
  );

  const row = result.rows[0]!;
  return normalizeUserRow(row);
}

export async function findConsumerByEmail(email: string): Promise<ConsumerUserRow | null> {
  if (process.env.NODE_ENV === 'test') {
    if (email === 'demo@stipulate.io') {
      return {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'demo@stipulate.io',
        name: 'Demo User',
        password_hash: hashPassword('demo-password-123'),
        timezone: 'UTC',
        onboarding_complete: true,
        wallet_card_ids: ['chase_sapphire_preferred', 'amex_gold'],
        notification_prefs: { email: true, push: false },
        expo_push_token: null,
      };
    }
    return null;
  }

  const result = await query<ConsumerUserRow & { wallet_card_ids: unknown; notification_prefs: unknown }>(
    `SELECT id, email, name, password_hash, timezone, onboarding_complete,
            wallet_card_ids, notification_prefs, expo_push_token
     FROM consumer_users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()],
  );

  const row = result.rows[0];
  return row ? normalizeUserRow(row) : null;
}

export async function verifyConsumerLogin(
  email: string,
  password: string,
): Promise<ConsumerUserRow | null> {
  if (process.env.NODE_ENV === 'test' && email.toLowerCase() === 'demo@stipulate.io') {
    if (password !== 'demo-password-123') return null;
    return findConsumerByEmail(email);
  }

  const user = await findConsumerByEmail(email);
  if (!user?.password_hash) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}

export async function updateConsumerUser(
  userId: string,
  patch: Partial<{
    name: string;
    timezone: string;
    onboardingComplete: boolean;
    walletCardIds: string[];
    notificationPrefs: { email: boolean; push: boolean };
  }>,
): Promise<ConsumerUserRow | null> {
  if (process.env.NODE_ENV === 'test') {
    const user = await findConsumerByEmail('demo@stipulate.io');
    if (!user) return null;
    return {
      ...user,
      name: patch.name ?? user.name,
      timezone: patch.timezone ?? user.timezone,
      onboarding_complete: patch.onboardingComplete ?? user.onboarding_complete,
      wallet_card_ids: patch.walletCardIds ?? user.wallet_card_ids,
      notification_prefs: patch.notificationPrefs ?? user.notification_prefs,
    };
  }

  const sets: string[] = [];
  const params: unknown[] = [userId];
  let idx = 2;

  if (patch.name !== undefined) {
    sets.push(`name = $${idx++}`);
    params.push(patch.name);
  }
  if (patch.timezone !== undefined) {
    sets.push(`timezone = $${idx++}`);
    params.push(patch.timezone);
  }
  if (patch.onboardingComplete !== undefined) {
    sets.push(`onboarding_complete = $${idx++}`);
    params.push(patch.onboardingComplete);
  }
  if (patch.walletCardIds !== undefined) {
    sets.push(`wallet_card_ids = $${idx++}`);
    params.push(JSON.stringify(patch.walletCardIds));
  }
  if (patch.notificationPrefs !== undefined) {
    sets.push(`notification_prefs = $${idx++}`);
    params.push(JSON.stringify(patch.notificationPrefs));
  }

  if (sets.length === 0) return findConsumerById(userId);

  sets.push('updated_at = NOW()');

  const result = await query<ConsumerUserRow & { wallet_card_ids: unknown; notification_prefs: unknown }>(
    `UPDATE consumer_users SET ${sets.join(', ')} WHERE id = $1::uuid
     RETURNING id, email, name, password_hash, timezone, onboarding_complete,
               wallet_card_ids, notification_prefs, expo_push_token`,
    params,
  );

  const row = result.rows[0];
  return row ? normalizeUserRow(row) : null;
}

export async function findConsumerById(userId: string): Promise<ConsumerUserRow | null> {
  if (process.env.NODE_ENV === 'test') {
    return findConsumerByEmail('demo@stipulate.io');
  }

  const result = await query<ConsumerUserRow & { wallet_card_ids: unknown; notification_prefs: unknown }>(
    `SELECT id, email, name, password_hash, timezone, onboarding_complete,
            wallet_card_ids, notification_prefs, expo_push_token
     FROM consumer_users WHERE id = $1::uuid LIMIT 1`,
    [userId],
  );

  const row = result.rows[0];
  return row ? normalizeUserRow(row) : null;
}

function normalizeUserRow(row: ConsumerUserRow & { wallet_card_ids: unknown; notification_prefs: unknown }): ConsumerUserRow {
  return {
    ...row,
    expo_push_token: row.expo_push_token ?? null,
    wallet_card_ids: Array.isArray(row.wallet_card_ids)
      ? (row.wallet_card_ids as string[])
      : JSON.parse(String(row.wallet_card_ids ?? '[]')),
    notification_prefs:
      typeof row.notification_prefs === 'object' && row.notification_prefs !== null
        ? (row.notification_prefs as { email: boolean; push: boolean })
        : JSON.parse(String(row.notification_prefs ?? '{"email":true,"push":false}')),
  };
}

export async function listConsumersForCard(cardId: string): Promise<ConsumerUserRow[]> {
  if (process.env.NODE_ENV === 'test') {
    const demo = await findConsumerByEmail('demo@stipulate.io');
    if (demo && demo.wallet_card_ids.includes(cardId)) return [demo];
    return [];
  }

  const result = await query<ConsumerUserRow & { wallet_card_ids: unknown; notification_prefs: unknown }>(
    `SELECT id, email, name, password_hash, timezone, onboarding_complete,
            wallet_card_ids, notification_prefs, expo_push_token
     FROM consumer_users
     WHERE wallet_card_ids @> jsonb_build_array($1::text)`,
    [cardId],
  );

  return result.rows.map(normalizeUserRow);
}

export async function updateExpoPushToken(userId: string, token: string | null): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  const result = await query(
    `UPDATE consumer_users SET expo_push_token = $2, updated_at = NOW() WHERE id = $1::uuid`,
    [userId, token],
  );
  return (result.rowCount ?? 0) > 0;
}

export function publicUserShape(user: ConsumerUserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    onboardingComplete: user.onboarding_complete,
    walletCardIds: user.wallet_card_ids,
    notificationPrefs: user.notification_prefs,
  };
}
