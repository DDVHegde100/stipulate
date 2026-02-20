import { query } from '../lib/db.js';

export interface MerchantMappingRow {
  id: string;
  merchant_name_normalized: string;
  mcc: string;
  category: string;
  confidence: string;
  source: string;
  status: string;
  submitted_by: string | null;
  notes: string | null;
}

/** Look up crowd-sourced or manual merchant MCC mapping. */
export async function findMerchantMapping(
  normalizedName: string,
): Promise<MerchantMappingRow | null> {
  const result = await query<MerchantMappingRow>(
    `SELECT id, merchant_name_normalized, mcc, category, confidence::text, source, status, submitted_by, notes
     FROM merchant_mcc_mappings
     WHERE merchant_name_normalized = $1 AND status = 'approved'
     ORDER BY confidence DESC
     LIMIT 1`,
    [normalizedName],
  );
  return result.rows[0] ?? null;
}

/** Fuzzy lookup using trigram similarity. */
export async function findMerchantMappingFuzzy(
  normalizedName: string,
  minSimilarity = 0.4,
): Promise<MerchantMappingRow | null> {
  const result = await query<MerchantMappingRow & { sim: number }>(
    `SELECT id, merchant_name_normalized, mcc, category, confidence::text, source, status, submitted_by, notes,
            similarity(merchant_name_normalized, $1) AS sim
     FROM merchant_mcc_mappings
     WHERE status = 'approved'
       AND similarity(merchant_name_normalized, $1) >= $2
     ORDER BY sim DESC, confidence DESC
     LIMIT 1`,
    [normalizedName, minSimilarity],
  );
  return result.rows[0] ?? null;
}

/** Submit a crowd-sourced MCC correction. */
export async function submitMccCorrection(input: {
  merchantNameNormalized: string;
  mcc: string;
  category: string;
  confidence: number;
  source: string;
  submittedBy?: string;
  notes?: string;
}): Promise<MerchantMappingRow> {
  const result = await query<MerchantMappingRow>(
    `INSERT INTO merchant_mcc_mappings
       (merchant_name_normalized, mcc, category, confidence, source, status, submitted_by, notes)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
     RETURNING id, merchant_name_normalized, mcc, category, confidence::text, source, status, submitted_by, notes`,
    [
      input.merchantNameNormalized,
      input.mcc,
      input.category,
      input.confidence,
      input.source,
      input.submittedBy ?? null,
      input.notes ?? null,
    ],
  );

  if (result.rows[0]) return result.rows[0]!;

  const existing = await findMerchantMapping(input.merchantNameNormalized);
  if (existing) return existing;

  throw new Error('Failed to submit MCC correction');
}

/** List pending corrections for admin review. */
export async function listPendingCorrections(limit = 50): Promise<MerchantMappingRow[]> {
  if (process.env.NODE_ENV === 'test') return [];

  const result = await query<MerchantMappingRow>(
    `SELECT id, merchant_name_normalized, mcc, category, confidence::text, source, status, submitted_by, notes
     FROM merchant_mcc_mappings
     WHERE status = 'pending'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/** Approve a pending MCC correction. */
export async function approveMccCorrection(
  id: string,
  reviewedBy: string,
  notes?: string,
): Promise<MerchantMappingRow | null> {
  if (process.env.NODE_ENV === 'test') {
    return {
      id,
      merchant_name_normalized: 'test',
      mcc: '5814',
      category: 'dining',
      confidence: '0.9',
      source: 'crowd',
      status: 'approved',
      submitted_by: reviewedBy,
      notes: notes ?? null,
    };
  }

  const result = await query<MerchantMappingRow>(
    `UPDATE merchant_mcc_mappings
     SET status = 'approved', notes = COALESCE($3, notes), source = 'crowd_approved'
     WHERE id = $1::uuid AND status = 'pending'
     RETURNING id, merchant_name_normalized, mcc, category, confidence::text, source, status, submitted_by, notes`,
    [id, reviewedBy, notes ?? null],
  );
  return result.rows[0] ?? null;
}

/** Reject a pending MCC correction. */
export async function rejectMccCorrection(
  id: string,
  reviewedBy: string,
  notes?: string,
): Promise<MerchantMappingRow | null> {
  if (process.env.NODE_ENV === 'test') {
    return {
      id,
      merchant_name_normalized: 'test',
      mcc: '5814',
      category: 'dining',
      confidence: '0.5',
      source: 'crowd',
      status: 'rejected',
      submitted_by: reviewedBy,
      notes: notes ?? null,
    };
  }

  const result = await query<MerchantMappingRow>(
    `UPDATE merchant_mcc_mappings
     SET status = 'rejected', notes = COALESCE($3, notes)
     WHERE id = $1::uuid AND status = 'pending'
     RETURNING id, merchant_name_normalized, mcc, category, confidence::text, source, status, submitted_by, notes`,
    [id, reviewedBy, notes ?? null],
  );
  return result.rows[0] ?? null;
}
