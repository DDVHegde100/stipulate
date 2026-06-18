import { query } from '../lib/db.js';

export interface BillingSubscriptionRow {
  id: string;
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
}

export async function findBillingSubscription(orgId: string): Promise<BillingSubscriptionRow | null> {
  if (process.env.NODE_ENV === 'test') return null;

  const result = await query<BillingSubscriptionRow>(
    `SELECT id, org_id::text, stripe_customer_id, stripe_subscription_id, plan, status
     FROM billing_subscriptions WHERE org_id = $1::uuid LIMIT 1`,
    [orgId],
  );
  return result.rows[0] ?? null;
}

export async function upsertBillingSubscription(input: {
  orgId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  plan: string;
  status?: string;
}): Promise<void> {
  await query(
    `INSERT INTO billing_subscriptions (org_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (org_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, billing_subscriptions.stripe_subscription_id),
       stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, billing_subscriptions.stripe_price_id),
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      input.orgId,
      input.stripeCustomerId,
      input.stripeSubscriptionId ?? null,
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
