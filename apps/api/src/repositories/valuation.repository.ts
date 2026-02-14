import { query } from '../lib/db.js';

export interface ValuationProgramRow {
  program_id: string;
  name: string;
  issuer: string;
  cents_per_point: string;
  floor_cpp: string | null;
  ceiling_cpp: string | null;
}

/** Load latest points valuation snapshot from DB. */
export async function loadValuationPrograms(): Promise<ValuationProgramRow[]> {
  const result = await query<ValuationProgramRow>(
    `SELECT DISTINCT ON (pp.program_id)
       pp.program_id,
       pp.name,
       pp.issuer,
       pvs.cents_per_point::text,
       pvs.floor_cpp::text,
       pvs.ceiling_cpp::text
     FROM points_programs pp
     JOIN points_valuation_snapshots pvs ON pvs.program_id = pp.program_id
     ORDER BY pp.program_id, pvs.snapshot_date DESC`,
  );
  return result.rows;
}
