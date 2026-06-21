import { query } from '../lib/db.js';

export interface BillingSubscriptionRow {
  id: string;
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_subscription_item_id: string | null;
  stripe_price_id: string | null;
  plan: string;
  status: string;
}

const testSubscriptions = new Map<string, BillingSubscriptionRow>();

export function setTestBillingSubscription(orgId: string, row: BillingSubscriptionRow): void {
  if (process.env.NODE_ENV === 'test') {
    testSubscriptions.set(orgId, row);
  }
}

export async function findBillingSubscription(orgId: string): Promise<BillingSubscriptionRow | null> {
  if (process.env.NODE_ENV === 'test') {
    return testSubscriptions.get(orgId) ?? null;
  }

  const result = await query<BillingSubscriptionRow>(
    `SELECT id, org_id::text, stripe_customer_id, stripe_subscription_id,
            stripe_subscription_item_id, stripe_price_id, plan, status
     FROM billing_subscriptions WHERE org_id = $1::uuid LIMIT 1`,
    [orgId],
  );
  return result.rows[0] ?? null;
}

export async function upsertBillingSubscription(input: {
  orgId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  stripePriceId?: string;
  plan: string;
  status?: string;
}): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    testSubscriptions.set(input.orgId, {
      id: 'test-billing-sub',
      org_id: input.orgId,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      stripe_subscription_item_id: input.stripeSubscriptionItemId ?? null,
      stripe_price_id: input.stripePriceId ?? null,
      plan: input.plan,
      status: input.status ?? 'active',
    });
    return;
  }

  await query(
    `INSERT INTO billing_subscriptions (org_id, stripe_customer_id, stripe_subscription_id, stripe_subscription_item_id, stripe_price_id, plan, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (org_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, billing_subscriptions.stripe_subscription_id),
       stripe_subscription_item_id = COALESCE(EXCLUDED.stripe_subscription_item_id, billing_subscriptions.stripe_subscription_item_id),
       stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, billing_subscriptions.stripe_price_id),
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      input.orgId,
      input.stripeCustomerId,
      input.stripeSubscriptionId ?? null,
      input.stripeSubscriptionItemId ?? null,
      input.stripePriceId ?? null,
      input.plan,
      input.status ?? 'active',
    ],
  );

  await query(`UPDATE organizations SET stripe_customer_id = $2, plan = $3 WHERE id = $1::uuid`, [
    input.orgId,
    input.stripeCustomerId,
    input.plan,
  ]);
}

export async function recordStripeWebhookEvent(stripeEventId: string, eventType: string, payload: unknown): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') return true;

  const result = await query(
    `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [stripeEventId, eventType, JSON.stringify(payload)],
  );
  return (result.rowCount ?? 0) > 0;
}
