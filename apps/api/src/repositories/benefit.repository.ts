import type pg from 'pg';
import { query } from '../lib/db.js';

export interface BenefitRuleRow {
  id: string;
  card_uuid: string;
  card_id: string;
  card_name: string;
  category: string;
  multiplier: string;
  reward_type: string;
  cap_amount_cents: number | null;
  cap_period: string | null;
  exclusions: unknown;
  effective_from: Date;
  effective_to: Date | null;
  source_url: string | null;
  confidence: string;
  version: number;
  raw_json: unknown;
}

export interface BenefitVersionRow {
  id: string;
  card_id: string;
  card_slug: string;
  card_name: string;
  version: number;
  snapshot: unknown;
  change_summary: string | null;
  created_at: Date;
}

export interface ChangelogRow {
  id: string;
  card_id: string;
  card_name: string;
  version: number;
  previous_version: number | null;
  change_summary: string;
  severity: string;
  changes: unknown;
  effective_from: Date | null;
  published_at: Date;
}

/** Resolve internal card UUID from public card_id slug. */
export async function findCardUuid(cardId: string): Promise<{
  uuid: string;
  name: string;
} | null> {
  const result = await query<{ id: string; name: string }>(
    `SELECT id, name FROM cards WHERE card_id = $1 AND is_active = TRUE LIMIT 1`,
    [cardId],
  );
  return result.rows[0] ? { uuid: result.rows[0].id, name: result.rows[0].name } : null;
}

/** Fetch benefit rules effective on a given date (or latest). */
export async function getBenefitRules(
  cardUuid: string,
  asOf: string,
): Promise<BenefitRuleRow[]> {
  const result = await query<BenefitRuleRow>(
    `SELECT
       br.id,
       br.card_id AS card_uuid,
       c.card_id,
       c.name AS card_name,
       br.category,
       br.multiplier::text,
       br.reward_type,
       br.cap_amount_cents,
       br.cap_period,
       br.exclusions,
       br.effective_from,
       br.effective_to,
       br.source_url,
       br.confidence::text,
       br.version,
       br.raw_json
     FROM benefit_rules br
     JOIN cards c ON c.id = br.card_id
     WHERE br.card_id = $1
       AND br.effective_from <= $2::date
       AND (br.effective_to IS NULL OR br.effective_to >= $2::date)
     ORDER BY br.category ASC`,
    [cardUuid, asOf],
  );
  return result.rows;
}

/** Fetch a specific benefit version snapshot. */
export async function getBenefitVersion(
  cardUuid: string,
  version: number,
): Promise<BenefitVersionRow | null> {
  const result = await query<BenefitVersionRow>(
    `SELECT
       bv.id,
       bv.card_id,
       c.card_id AS card_slug,
       c.name AS card_name,
       bv.version,
       bv.snapshot,
       bv.change_summary,
       bv.created_at
     FROM benefit_versions bv
     JOIN cards c ON c.id = bv.card_id
     WHERE bv.card_id = $1 AND bv.version = $2
     LIMIT 1`,
    [cardUuid, version],
  );
  return result.rows[0] ?? null;
}

/** Latest published version number for a card. */
export async function getLatestVersion(cardUuid: string): Promise<number> {
  const result = await query<{ max: number | null }>(
    `SELECT MAX(version) AS max FROM benefit_versions WHERE card_id = $1`,
    [cardUuid],
  );
  return result.rows[0]?.max ?? 1;
}

/** Paginated changelog across all cards. */
export async function listChangelog(options: {
  limit: number;
  cursor?: string;
  cardId?: string;
  since?: string;
}): Promise<{ rows: ChangelogRow[]; hasMore: boolean }> {
  const params: unknown[] = [options.limit + 1];
  let where = 'WHERE 1=1';

  if (options.cardId) {
    params.push(options.cardId);
    where += ` AND c.card_id = $${params.length}`;
  }

  if (options.since) {
    params.push(options.since);
    where += ` AND bv.created_at >= $${params.length}::timestamptz`;
  }

  if (options.cursor) {
    params.push(options.cursor);
    where += ` AND bv.created_at < $${params.length}::timestamptz`;
  }

  const result = await query<ChangelogRow>(
    `SELECT
       bv.id,
       c.card_id,
       c.name AS card_name,
       bv.version,
       LAG(bv.version) OVER (PARTITION BY bv.card_id ORDER BY bv.version) AS previous_version,
       COALESCE(bv.change_summary, 'Benefit update published') AS change_summary,
       COALESCE(bv.snapshot->>'severity', 'material') AS severity,
       COALESCE(bv.snapshot->'changes', '[]'::jsonb) AS changes,
       (bv.snapshot->>'effective_from')::date AS effective_from,
       bv.created_at AS published_at
     FROM benefit_versions bv
     JOIN cards c ON c.id = bv.card_id
     ${where}
     ORDER BY bv.created_at DESC
     LIMIT $1`,
    params,
  );

  const hasMore = result.rows.length > options.limit;
  const rows = hasMore ? result.rows.slice(0, options.limit) : result.rows;
  return { rows, hasMore };
}

/** Insert or replace benefit rules from ingestion publish. */
export async function upsertBenefitRules(
  client: pg.PoolClient,
  input: {
    cardUuid: string;
    rules: Array<{
      id: string;
      cardId: string;
      name: string;
      category: string;
      multiplier: number;
      rewardType: string;
      caps?: Array<{ period: string; limit: { amountMinor: number; currency: string } }>;
      exclusions?: unknown[];
    }>;
    sourceUrl: string;
    version: number;
  },
): Promise<void> {
  for (const rule of input.rules) {
    const cap = rule.caps?.[0];
    await client.query(
      `INSERT INTO benefit_rules
         (card_id, category, multiplier, reward_type, cap_amount_cents, cap_period, exclusions, source_url, confidence, version, raw_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        input.cardUuid,
        rule.category,
        rule.multiplier,
        rule.rewardType,
        cap?.limit.amountMinor ?? null,
        cap?.period ?? null,
        JSON.stringify(rule.exclusions ?? []),
        input.sourceUrl,
        0.9,
        input.version,
        JSON.stringify(rule),
      ],
    );
  }
}

/** Insert a new benefit version snapshot (used by ingestion pipeline). */
export async function publishBenefitVersion(
  client: pg.PoolClient,
  input: {
    cardUuid: string;
    version: number;
    snapshot: unknown;
    changeSummary: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO benefit_versions (card_id, version, snapshot, change_summary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (card_id, version) DO UPDATE SET
       snapshot = EXCLUDED.snapshot,
       change_summary = EXCLUDED.change_summary`,
    [input.cardUuid, input.version, JSON.stringify(input.snapshot), input.changeSummary],
  );
}
