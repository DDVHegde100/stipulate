import { query } from '../lib/db.js';

export interface ValuationProgramRow {
  program_id: string;
  name: string;
  issuer: string;
  cents_per_point: string;
  floor_cpp: string | null;
  ceiling_cpp: string | null;
}

export interface ValuationOverrideRow {
  id: string;
  org_id: string;
  program_id: string;
  cents_per_point: string;
  effective_from: string;
}

/** Load points programs from DB. */
export async function loadValuationPrograms(): Promise<ValuationProgramRow[]> {
  if (process.env.NODE_ENV === 'test') return [];

  const result = await query<ValuationProgramRow>(
    `SELECT id AS program_id, name, issuer,
            cents_per_point::text, floor_cpp::text, ceiling_cpp::text
     FROM points_programs
     ORDER BY issuer, name`,
  );
  return result.rows;
}

/** Org-specific CPP overrides. */
export async function listValuationOverrides(orgId: string): Promise<ValuationOverrideRow[]> {
  if (process.env.NODE_ENV === 'test') return [];

  const result = await query<ValuationOverrideRow>(
    `SELECT id, org_id::text, program_id, cents_per_point::text, effective_from::text
     FROM valuation_overrides
     WHERE org_id = $1::uuid
       AND (effective_to IS NULL OR effective_to > NOW())
     ORDER BY effective_from DESC`,
    [orgId],
  );
  return result.rows;
}

export async function upsertValuationOverride(input: {
  orgId: string;
  programId: string;
  centsPerPoint: number;
}): Promise<ValuationOverrideRow> {
  const result = await query<ValuationOverrideRow>(
    `INSERT INTO valuation_overrides (org_id, program_id, cents_per_point)
     VALUES ($1::uuid, $2, $3)
     RETURNING id, org_id::text, program_id, cents_per_point::text, effective_from::text`,
    [input.orgId, input.programId, input.centsPerPoint],
  );
  return result.rows[0]!;
}

/** Build override map for routing valuation merge. */
export async function loadOverrideMap(orgId?: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!orgId || process.env.NODE_ENV === 'test') return map;

  const rows = await listValuationOverrides(orgId);
  for (const row of rows) {
    map.set(row.program_id, parseFloat(row.cents_per_point));
  }
  return map;
}
