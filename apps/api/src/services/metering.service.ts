import { getUsageSummary, logUsageEvent, COST_PER_CALL_MICROS } from '../repositories/usage.repository.js';
import { findBillingSubscription } from '../repositories/billing.repository.js';

export interface MeteringContext {
  orgId?: string;
  apiKeyId?: string;
  requestId: string;
}

/** Record a billable API call. */
export async function recordApiUsage(
  eventType: 'route' | 'enrich' | 'batch_route',
  ctx: MeteringContext,
  options: {
    amountCents?: number;
    latencyMs?: number;
    status?: 'success' | 'error';
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  try {
    await logUsageEvent({
      orgId: ctx.orgId,
      apiKeyId: ctx.apiKeyId,
      eventType,
      requestId: ctx.requestId,
      amountCents: options.amountCents,
      latencyMs: options.latencyMs,
      status: options.status,
      metadata: options.metadata,
    });

    if (ctx.orgId) {
      const billing = await findBillingSubscription(ctx.orgId);
      if (billing?.stripe_customer_id && billing.plan === 'payg') {
        await reportStripeUsage(billing.stripe_customer_id, 1);
      }
    }
  } catch {
    // metering failures are non-fatal
  }
}

/** Check if org is within plan limits. SaaS/enterprise = unlimited. */
export async function checkPlanLimits(
  orgId: string,
  plan: string,
): Promise<{ allowed: boolean; reason?: string }> {
  if (plan === 'saas' || plan === 'enterprise') {
    return { allowed: true };
  }

  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  try {
    const summary = await getUsageSummary(orgId, since.toISOString());
    const freeLimit = plan === 'payg' ? 10_000 : 1_000;

    if (summary.totalCalls >= freeLimit) {
      return { allowed: false, reason: `Monthly limit of ${freeLimit} calls exceeded` };
    }
  } catch {
    return { allowed: true };
  }

  return { allowed: true };
}

/** Report usage to Stripe metered billing (when configured). */
export async function reportStripeUsage(
  stripeCustomerId: string,
  quantity: number,
): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID_METERED;

  if (!stripeKey || !priceId) return;

  try {
    const body = new URLSearchParams({
      quantity: String(quantity),
      timestamp: String(Math.floor(Date.now() / 1000)),
      action: 'increment',
    });

    await fetch(`https://api.stripe.com/v1/subscription_items/${priceId}/usage_records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  } catch {
    // Stripe reporting is best-effort
  }

  void stripeCustomerId;
}

export { COST_PER_CALL_MICROS };
