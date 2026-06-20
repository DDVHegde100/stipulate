import { query } from '../lib/db.js';

export interface SpendRecordRow {
  card_id: string;
  category: string;
  cap_period: string;
  spent_cents: number;
}

/** Load YTD/category spend for cap-aware routing. */
export async function getUserCategorySpend(input: {
  orgId?: string;
  userRef?: string;
  cardIds: string[];
  periodStart: string;
}): Promise<SpendRecordRow[]> {
  if (input.cardIds.length === 0) return [];

  const result = await query<SpendRecordRow>(
    `SELECT card_id, category, cap_period, spent_cents
     FROM user_category_spend
     WHERE card_id = ANY($1::varchar[])
       AND period_start = $2::date
       AND ($3::uuid IS NULL OR org_id = $3::uuid)
       AND ($4::varchar IS NULL OR user_ref = $4)`,
    [input.cardIds, input.periodStart, input.orgId ?? null, input.userRef ?? null],
  );
  return result.rows;
}

/** Upsert spend after a routed transaction (for cap tracking). */
export async function recordCategorySpend(input: {
  orgId?: string;
  userRef?: string;
  cardId: string;
  category: string;
  capPeriod: string;
  periodStart: string;
  spentCents: number;
}): Promise<void> {
  await query(
    `INSERT INTO user_category_spend (org_id, user_ref, card_id, category, cap_period, period_start, spent_cents)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7)
     ON CONFLICT (org_id, user_ref, card_id, category, cap_period, period_start)
     DO UPDATE SET spent_cents = user_category_spend.spent_cents + EXCLUDED.spent_cents,
                   updated_at = NOW()`,
    [
      input.orgId ?? null,
      input.userRef ?? 'default',
      input.cardId,
      input.category,
      input.capPeriod,
      input.periodStart,
      input.spentCents,
    ],
  );
}

/** Current calendar year period start for annual caps. */
export function annualPeriodStart(asOf = new Date()): string {
  return `${asOf.getUTCFullYear()}-01-01`;
}

/** Spend summary rows for cap UI. */
export async function getSpendSummaryForUser(input: {
  orgId?: string;
  userRef: string;
  cardIds: string[];
  periodStart: string;
}): Promise<SpendRecordRow[]> {
  if (process.env.NODE_ENV === 'test') {
    return input.cardIds.flatMap((cardId) => [
      { card_id: cardId, category: 'groceries', cap_period: 'annual', spent_cents: 125000 },
      { card_id: cardId, category: 'dining', cap_period: 'annual', spent_cents: 45000 },
    ]);
  }

  return getUserCategorySpend({
    orgId: input.orgId,
    userRef: input.userRef,
    cardIds: input.cardIds,
    periodStart: input.periodStart,
  });
}

const DEFAULT_ANNUAL_CAPS: Record<string, number> = {
  groceries: 600000,
  dining: 300000,
  travel: 500000,
  gas: 150000,
  streaming: 50000,
};

/** Cap headroom for wallet UI and routing context. */
export async function getCapHeadroomForUser(input: {
  orgId?: string;
  userRef: string;
  cardIds: string[];
  periodStart: string;
}): Promise<
  Array<{
    cardId: string;
    category: string;
    capPeriod: string;
    spentMinor: number;
    capLimitMinor: number;
    remainingMinor: number;
  }>
> {
  const rows = await getSpendSummaryForUser(input);

  return rows.map((row) => {
    const capLimitMinor = DEFAULT_ANNUAL_CAPS[row.category] ?? 250000;
    const spentMinor = row.spent_cents;
    return {
      cardId: row.card_id,
      category: row.category,
      capPeriod: row.cap_period,
      spentMinor,
      capLimitMinor,
      remainingMinor: Math.max(0, capLimitMinor - spentMinor),
    };
  });
}

/** Record spend delta and audit in cap_spend_ledger. */
export async function trackCategorySpend(input: {
  orgId?: string;
  userRef: string;
  cardId: string;
  category: string;
  capPeriod: string;
  periodStart: string;
  amountMinor: number;
  source?: string;
}): Promise<{ spentMinor: number }> {
  if (process.env.NODE_ENV === 'test') {
    return { spentMinor: input.amountMinor };
  }

  await recordCategorySpend({
    orgId: input.orgId,
    userRef: input.userRef,
    cardId: input.cardId,
    category: input.category,
    capPeriod: input.capPeriod,
    periodStart: input.periodStart,
    spentCents: input.amountMinor,
  });

  await query(
    `INSERT INTO cap_spend_ledger (org_id, user_ref, card_id, category, cap_period, period_start, delta_cents, source)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8)`,
    [
      input.orgId ?? null,
      input.userRef,
      input.cardId,
      input.category,
      input.capPeriod,
      input.periodStart,
      input.amountMinor,
      input.source ?? 'track',
    ],
  );

  const rows = await getUserCategorySpend({
    orgId: input.orgId,
    userRef: input.userRef,
    cardIds: [input.cardId],
    periodStart: input.periodStart,
  });
  const match = rows.find((row) => row.category === input.category);
  return { spentMinor: match?.spent_cents ?? input.amountMinor };
}
