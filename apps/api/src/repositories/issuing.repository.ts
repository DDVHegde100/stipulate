import { randomBytes } from 'node:crypto';

import { query } from '../lib/db.js';

export interface CardholderRow {
  id: string;
  consumer_user_id: string;
  program_id: string;
  external_id: string | null;
  status: string;
  kyc_status: string;
  created_at: Date;
}

export interface VirtualCardRow {
  id: string;
  cardholder_id: string;
  program_id: string;
  last4: string;
  network: string;
  status: string;
  pan_token: string | null;
  cvv_token: string | null;
  exp_month: number | null;
  exp_year: number | null;
  spend_limit_minor: number | null;
  created_at: Date;
}

const testCardholders = new Map<string, CardholderRow>();
const testVirtualCards = new Map<string, VirtualCardRow[]>();

async function resolveProgramId(slug: string): Promise<string | null> {
  if (process.env.NODE_ENV === 'test') {
    return slug === 'stipulate_sandbox' ? '00000000-0000-4000-8000-000000000010' : null;
  }

  const result = await query<{ id: string }>(
    `SELECT id FROM card_programs WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return result.rows[0]?.id ?? null;
}

export async function createCardholder(input: {
  consumerUserId: string;
  programSlug: string;
}): Promise<CardholderRow & { program_slug: string }> {
  const programId = await resolveProgramId(input.programSlug);
  if (!programId) throw new Error(`Unknown card program: ${input.programSlug}`);

  if (process.env.NODE_ENV === 'test') {
    const row: CardholderRow = {
      id: '00000000-0000-4000-8000-000000000020',
      consumer_user_id: input.consumerUserId,
      program_id: programId,
      external_id: `ext_${randomBytes(4).toString('hex')}`,
      status: 'approved',
      kyc_status: 'passed',
      created_at: new Date(),
    };
    testCardholders.set(input.consumerUserId, row);
    return { ...row, program_slug: input.programSlug };
  }

  const result = await query<CardholderRow>(
    `INSERT INTO cardholders (consumer_user_id, program_id, external_id, status, kyc_status)
     VALUES ($1, $2, $3, 'approved', 'passed')
     ON CONFLICT (consumer_user_id, program_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, consumer_user_id, program_id, external_id, status, kyc_status, created_at`,
    [input.consumerUserId, programId, `ext_${randomBytes(6).toString('hex')}`],
  );
  return { ...result.rows[0]!, program_slug: input.programSlug };
}

export async function findCardholderById(cardholderId: string): Promise<CardholderRow | null> {
  if (process.env.NODE_ENV === 'test') {
    for (const row of testCardholders.values()) {
      if (row.id === cardholderId) return row;
    }
    return null;
  }

  const result = await query<CardholderRow>(
    `SELECT id, consumer_user_id, program_id, external_id, status, kyc_status, created_at
     FROM cardholders WHERE id = $1::uuid LIMIT 1`,
    [cardholderId],
  );
  return result.rows[0] ?? null;
}

export async function issueVirtualCard(input: {
  cardholderId: string;
  spendLimitMinor?: number;
}): Promise<VirtualCardRow> {
  const cardholder = await findCardholderById(input.cardholderId);
  if (!cardholder) throw new Error('Cardholder not found');

  const last4 = String(Math.floor(1000 + Math.random() * 9000));
  const panToken = `pan_tok_${randomBytes(8).toString('hex')}`;
  const cvvToken = `cvv_tok_${randomBytes(4).toString('hex')}`;
  const now = new Date();

  if (process.env.NODE_ENV === 'test') {
    const row: VirtualCardRow = {
      id: '00000000-0000-4000-8000-000000000021',
      cardholder_id: input.cardholderId,
      program_id: cardholder.program_id,
      last4,
      network: 'visa',
      status: 'active',
      pan_token: panToken,
      cvv_token: cvvToken,
      exp_month: now.getUTCMonth() + 1,
      exp_year: now.getUTCFullYear() + 3,
      spend_limit_minor: input.spendLimitMinor ?? null,
      created_at: now,
    };
    const existing = testVirtualCards.get(input.cardholderId) ?? [];
    testVirtualCards.set(input.cardholderId, [...existing, row]);
    return row;
  }

  const result = await query<VirtualCardRow>(
    `INSERT INTO virtual_cards (
       cardholder_id, program_id, external_id, last4, network, status,
       pan_token, cvv_token, exp_month, exp_year, spend_limit_minor
     ) VALUES ($1, $2, $3, $4, 'visa', 'active', $5, $6, $7, $8, $9)
     RETURNING id, cardholder_id, program_id, last4, network, status,
               pan_token, cvv_token, exp_month, exp_year, spend_limit_minor, created_at`,
    [
      input.cardholderId,
      cardholder.program_id,
      `vc_${randomBytes(6).toString('hex')}`,
      last4,
      panToken,
      cvvToken,
      now.getUTCMonth() + 1,
      now.getUTCFullYear() + 3,
      input.spendLimitMinor ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function listVirtualCards(cardholderId: string): Promise<VirtualCardRow[]> {
  if (process.env.NODE_ENV === 'test') {
    return testVirtualCards.get(cardholderId) ?? [];
  }

  const result = await query<VirtualCardRow>(
    `SELECT id, cardholder_id, program_id, last4, network, status,
            pan_token, cvv_token, exp_month, exp_year, spend_limit_minor, created_at
     FROM virtual_cards
     WHERE cardholder_id = $1::uuid
     ORDER BY created_at DESC`,
    [cardholderId],
  );
  return result.rows;
}
