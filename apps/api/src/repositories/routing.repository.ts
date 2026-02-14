import { query } from '../lib/db.js';

/** Log a routing request for metering and analytics. */
export async function logRoutingRequest(input: {
  orgId?: string;
  requestId: string;
  mcc?: string;
  amountCents: number;
  cardCount: number;
  latencyMs: number;
  bestCardId?: string;
  merchantName?: string;
  category?: string;
}): Promise<void> {
  await query(
    `INSERT INTO routing_requests
       (org_id, request_id, mcc, amount_cents, card_count, latency_ms, best_card_id, merchant_name, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.orgId ?? null,
      input.requestId,
      input.mcc ?? null,
      input.amountCents,
      input.cardCount,
      input.latencyMs,
      input.bestCardId ?? null,
      input.merchantName ?? null,
      input.category ?? null,
    ],
  );
}

/** Count routing requests in the current billing period. */
export async function countRoutingRequests(
  orgId: string,
  since: string,
): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM routing_requests
     WHERE org_id = $1::uuid AND created_at >= $2::timestamptz`,
    [orgId, since],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}
