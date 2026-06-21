import { query } from '../lib/db.js';
import { findConsumerById } from '../repositories/consumer-user.repository.js';
import { findConsumerSubscription } from '../repositories/consumer-billing.repository.js';
import { listLinkedAccounts } from '../repositories/plaid.repository.js';
import { listIssuingAuthorizationsForConsumer } from '../repositories/issuing-authorization.repository.js';
import { revokeAllConsumerSessions } from '../repositories/consumer-session.repository.js';

export interface ConsumerExportBundle {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    timezone: string;
    walletCardIds: string[];
    notificationPrefs: { email: boolean; push: boolean };
  };
  subscription: {
    plan: string;
    status: string;
  };
  linkedAccounts: Array<{
    accountName: string | null;
    accountMask: string | null;
    mappedCardId: string | null;
  }>;
  recentAuthorizations: Array<{
    externalId: string;
    amountMinor: number;
    currency: string;
    merchantName: string | null;
    status: string;
    authorizedAt: string;
  }>;
  deletionRequest?: { scheduledFor: string; status: string };
}

const testDeletionRequests = new Map<string, { scheduledFor: string; status: string }>();

export function listTestConsumerDeletionsDue(): string[] {
  const now = Date.now();
  return [...testDeletionRequests.entries()]
    .filter(([, request]) => request.status === 'scheduled' && Date.parse(request.scheduledFor) <= now)
    .map(([consumerUserId]) => consumerUserId);
}

export function clearTestConsumerDeletion(consumerUserId: string): void {
  testDeletionRequests.delete(consumerUserId);
}

/** For tests: mark a scheduled deletion as due immediately. */
export function markTestConsumerDeletionDue(consumerUserId: string): void {
  const existing = testDeletionRequests.get(consumerUserId);
  if (!existing) return;
  testDeletionRequests.set(consumerUserId, {
    ...existing,
    scheduledFor: new Date(Date.now() - 60_000).toISOString(),
  });
}

/** Build a GDPR export bundle for a consumer user. */
export async function exportConsumerData(consumerUserId: string): Promise<ConsumerExportBundle> {
  const user = await findConsumerById(consumerUserId);
  if (!user) throw new Error('User not found');

  const subscription = await findConsumerSubscription(consumerUserId);
  const linkedAccounts = await listLinkedAccounts(consumerUserId);
  const authorizations = await listIssuingAuthorizationsForConsumer(consumerUserId, 25);

  let deletionRequest: { scheduledFor: string; status: string } | undefined;
  if (process.env.NODE_ENV === 'test') {
    deletionRequest = testDeletionRequests.get(consumerUserId);
  } else {
    const deletionResult = await query<{ scheduled_for: string; status: string }>(
      `SELECT scheduled_for::text, status FROM consumer_deletion_requests
       WHERE consumer_user_id = $1::uuid AND status = 'scheduled' LIMIT 1`,
      [consumerUserId],
    );
    deletionRequest = deletionResult.rows[0]
      ? {
          scheduledFor: deletionResult.rows[0].scheduled_for,
          status: deletionResult.rows[0].status,
        }
      : undefined;
  }

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      walletCardIds: user.wallet_card_ids,
      notificationPrefs: user.notification_prefs,
    },
    subscription: {
      plan: subscription?.subscription_plan ?? 'free',
      status: subscription?.subscription_status ?? 'inactive',
    },
    linkedAccounts: linkedAccounts.map((account) => ({
      accountName: account.account_name,
      accountMask: account.account_mask,
      mappedCardId: account.mapped_card_id,
    })),
    recentAuthorizations: authorizations.map((row) => ({
      externalId: row.external_id,
      amountMinor: row.amount_minor,
      currency: row.currency,
      merchantName: row.merchant_name,
      status: row.status,
      authorizedAt: row.authorized_at.toISOString(),
    })),
    deletionRequest,
  };
}

/** Schedule consumer account deletion after a 30-day grace period. */
export async function scheduleConsumerDeletion(
  consumerUserId: string,
): Promise<{ scheduledFor: string }> {
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + 30);

  if (process.env.NODE_ENV === 'test') {
    testDeletionRequests.set(consumerUserId, {
      scheduledFor: scheduledFor.toISOString(),
      status: 'scheduled',
    });
    await revokeAllConsumerSessions(consumerUserId);
    return { scheduledFor: scheduledFor.toISOString() };
  }

  await query(
    `INSERT INTO consumer_deletion_requests (consumer_user_id, scheduled_for)
     VALUES ($1::uuid, $2::timestamptz)
     ON CONFLICT (consumer_user_id) DO UPDATE SET
       scheduled_for = EXCLUDED.scheduled_for,
       status = 'scheduled',
       requested_at = NOW()`,
    [consumerUserId, scheduledFor.toISOString()],
  );

  await revokeAllConsumerSessions(consumerUserId);

  return { scheduledFor: scheduledFor.toISOString() };
}

/** Cancel a scheduled consumer account deletion. */
export async function cancelConsumerDeletion(consumerUserId: string): Promise<{ cancelled: boolean }> {
  if (process.env.NODE_ENV === 'test') {
    const existed = testDeletionRequests.delete(consumerUserId);
    return { cancelled: existed };
  }

  const result = await query(
    `UPDATE consumer_deletion_requests SET status = 'cancelled', completed_at = NOW()
     WHERE consumer_user_id = $1::uuid AND status = 'scheduled'`,
    [consumerUserId],
  );

  return { cancelled: (result.rowCount ?? 0) > 0 };
}

export async function getConsumerDeletionStatus(
  consumerUserId: string,
): Promise<{ scheduledFor: string; status: string } | null> {
  if (process.env.NODE_ENV === 'test') {
    return testDeletionRequests.get(consumerUserId) ?? null;
  }

  const result = await query<{ scheduled_for: string; status: string }>(
    `SELECT scheduled_for::text, status FROM consumer_deletion_requests
     WHERE consumer_user_id = $1::uuid AND status = 'scheduled' LIMIT 1`,
    [consumerUserId],
  );

  return result.rows[0]
    ? { scheduledFor: result.rows[0].scheduled_for, status: result.rows[0].status }
    : null;
}
