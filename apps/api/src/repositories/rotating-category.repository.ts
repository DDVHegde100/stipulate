import { query } from '../lib/db.js';
import type { RotatingCategoryStateType } from '@stipulate/schema';

export interface RotatingCategoryRow {
  id: string;
  consumer_user_id: string | null;
  org_id: string | null;
  user_ref: string;
  card_id: string;
  state_type: RotatingCategoryStateType;
  active_category: string | null;
  quarter_key: string | null;
  effective_from: Date;
  effective_to: Date | null;
  activated: boolean;
}

export function currentQuarterKey(date = new Date()): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

/** Upsert active rotating category state for a user/card. */
export async function upsertRotatingCategoryState(input: {
  orgId?: string;
  consumerUserId?: string;
  userRef?: string;
  cardId: string;
  stateType: RotatingCategoryStateType;
  activeCategory?: string;
  quarterKey?: string;
  activated?: boolean;
}): Promise<RotatingCategoryRow> {
  const userRef = input.userRef ?? 'default';
  const quarterKey = input.quarterKey ?? currentQuarterKey();

  if (process.env.NODE_ENV === 'test') {
    return {
      id: 'test-rotating-state',
      consumer_user_id: input.consumerUserId ?? null,
      org_id: input.orgId ?? null,
      user_ref: userRef,
      card_id: input.cardId,
      state_type: input.stateType,
      active_category: input.activeCategory ?? null,
      quarter_key: quarterKey,
      effective_from: new Date(),
      effective_to: null,
      activated: input.activated ?? true,
    };
  }

  await query(
    `UPDATE rotating_category_state
     SET effective_to = CURRENT_DATE, updated_at = NOW()
     WHERE card_id = $1
       AND user_ref = $2
       AND state_type = $3
       AND quarter_key = $4
       AND effective_to IS NULL
       AND ($5::uuid IS NULL OR org_id = $5)
       AND ($6::uuid IS NULL OR consumer_user_id = $6)`,
    [
      input.cardId,
      userRef,
      input.stateType,
      quarterKey,
      input.orgId ?? null,
      input.consumerUserId ?? null,
    ],
  );

  const result = await query<RotatingCategoryRow>(
    `INSERT INTO rotating_category_state (
       org_id, consumer_user_id, user_ref, card_id, state_type,
       active_category, quarter_key, activated, effective_from, effective_to
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, NULL)
     RETURNING *`,
    [
      input.orgId ?? null,
      input.consumerUserId ?? null,
      userRef,
      input.cardId,
      input.stateType,
      input.activeCategory ?? null,
      quarterKey,
      input.activated ?? true,
    ],
  );

  return result.rows[0]!;
}

/** List active rotating states for routing context. */
export async function listActiveRotatingStates(input: {
  orgId?: string;
  consumerUserId?: string;
  userRef?: string;
  cardIds: string[];
}): Promise<RotatingCategoryRow[]> {
  if (input.cardIds.length === 0) return [];

  if (process.env.NODE_ENV === 'test') {
    return [];
  }

  const result = await query<RotatingCategoryRow>(
    `SELECT *
     FROM rotating_category_state
     WHERE card_id = ANY($1::text[])
       AND effective_to IS NULL
       AND ($2::uuid IS NULL OR org_id = $2)
       AND ($3::uuid IS NULL OR consumer_user_id = $3)
       AND user_ref = $4
     ORDER BY updated_at DESC`,
    [input.cardIds, input.orgId ?? null, input.consumerUserId ?? null, input.userRef ?? 'default'],
  );

  return result.rows;
}
