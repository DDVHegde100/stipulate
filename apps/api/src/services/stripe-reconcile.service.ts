import { findBillingSubscription } from '../repositories/billing.repository.js';
import { getUsageSummary } from '../repositories/usage.repository.js';

export interface UsageDriftRow {
  orgId: string;
  localCalls: number;
  stripeCalls: number;
  delta: number;
}

export async function fetchStripeUsageTotal(
  subscriptionItemId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return 0;

  const params = new URLSearchParams({
    starting: String(Math.floor(periodStart.getTime() / 1000)),
    ending: String(Math.floor(periodEnd.getTime() / 1000)),
  });

  const response = await fetch(
    `https://api.stripe.com/v1/subscription_items/${subscriptionItemId}/usage_record_summaries?${params}`,
    {
      headers: { Authorization: `Bearer ${stripeKey}` },
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Stripe usage summary failed: ${response.status} ${err}`);
  }

  const json = (await response.json()) as { data?: Array<{ total_usage?: number }> };
  return (json.data ?? []).reduce((sum, row) => sum + (row.total_usage ?? 0), 0);
}

export async function compareOrgUsageDrift(input: {
  orgId: string;
  periodStart: Date;
  periodEnd?: Date;
}): Promise<UsageDriftRow | null> {
  const billing = await findBillingSubscription(input.orgId);
  if (!billing?.stripe_subscription_item_id || billing.plan !== 'payg') {
    return null;
  }

  const local = await getUsageSummary(input.orgId, input.periodStart.toISOString());
  const stripeCalls = await fetchStripeUsageTotal(
    billing.stripe_subscription_item_id,
    input.periodStart,
    input.periodEnd ?? new Date(),
  );

  return {
    orgId: input.orgId,
    localCalls: local.totalCalls,
    stripeCalls,
    delta: local.totalCalls - stripeCalls,
  };
}
