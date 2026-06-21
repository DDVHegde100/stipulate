import { query } from '../lib/db.js';

export interface ConsumerSubscriptionRow {
  consumer_user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plan: string;
  subscription_status: string;
}

const testSubscriptions = new Map<string, ConsumerSubscriptionRow>();

export async function findConsumerSubscription(consumerUserId: string): Promise<ConsumerSubscriptionRow | null> {
  if (process.env.NODE_ENV === 'test') {
    return testSubscriptions.get(consumerUserId) ?? null;
  }

  const result = await query<ConsumerSubscriptionRow>(
    `SELECT id::text AS consumer_user_id, stripe_customer_id, stripe_subscription_id,
            subscription_plan, subscription_status
     FROM consumer_users WHERE id = $1::uuid LIMIT 1`,
    [consumerUserId],
  );
  return result.rows[0] ?? null;
}

export async function upsertConsumerSubscription(input: {
  consumerUserId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  plan?: string;
  status?: string;
}): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    testSubscriptions.set(input.consumerUserId, {
      consumer_user_id: input.consumerUserId,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      subscription_plan: input.plan ?? 'consumer_premium',
      subscription_status: input.status ?? 'active',
    });
    return;
  }

  await query(
    `UPDATE consumer_users SET
       stripe_customer_id = $2,
       stripe_subscription_id = COALESCE($3, stripe_subscription_id),
       subscription_plan = $4,
       subscription_status = $5,
       updated_at = NOW()
     WHERE id = $1::uuid`,
    [
      input.consumerUserId,
      input.stripeCustomerId,
      input.stripeSubscriptionId ?? null,
      input.plan ?? 'consumer_premium',
      input.status ?? 'active',
    ],
  );
}

export async function cancelConsumerSubscriptionByCustomerId(stripeCustomerId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    for (const [userId, row] of testSubscriptions.entries()) {
      if (row.stripe_customer_id === stripeCustomerId) {
        testSubscriptions.set(userId, {
          ...row,
          subscription_plan: 'free',
          subscription_status: 'canceled',
        });
      }
    }
    return;
  }

  await query(
    `UPDATE consumer_users SET
       subscription_plan = 'free',
       subscription_status = 'canceled',
       updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [stripeCustomerId],
  );
}
