import { query } from '../lib/db.js';

const COST_PER_CALL_MICROS = 1000; // $0.001 per call

export interface UsageEventInput {
  orgId?: string;
  apiKeyId?: string;
  eventType: 'route' | 'enrich' | 'batch_route';
  requestId: string;
  amountCents?: number;
  latencyMs?: number;
  status?: 'success' | 'error';
  metadata?: Record<string, unknown>;
}

/** Log a billable API usage event. */
export async function logUsageEvent(input: UsageEventInput): Promise<void> {
  await query(
    `INSERT INTO usage_events (org_id, api_key_id, event_type, request_id, amount_cents, cost_micros, latency_ms, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.orgId ?? null,
      input.apiKeyId ?? null,
      input.eventType,
      input.requestId,
      input.amountCents ?? 0,
      COST_PER_CALL_MICROS,
      input.latencyMs ?? null,
      input.status ?? 'success',
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

/** Aggregate usage for billing period. */
export async function getUsageSummary(
  orgId: string,
  since: string,
): Promise<{ totalCalls: number; totalCostMicros: number; byType: Record<string, number> }> {
  const result = await query<{ event_type: string; count: string; cost: string }>(
    `SELECT event_type, COUNT(*)::text AS count, SUM(cost_micros)::text AS cost
     FROM usage_events
     WHERE org_id = $1::uuid AND created_at >= $2::timestamptz AND status = 'success'
     GROUP BY event_type`,
    [orgId, since],
  );

  let totalCalls = 0;
  let totalCostMicros = 0;
  const byType: Record<string, number> = {};

  for (const row of result.rows) {
    const count = parseInt(row.count, 10);
    totalCalls += count;
    totalCostMicros += parseInt(row.cost, 10);
    byType[row.event_type] = count;
  }

  return { totalCalls, totalCostMicros, byType };
}

export { COST_PER_CALL_MICROS };
