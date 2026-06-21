import { randomBytes } from 'node:crypto';

import { query } from '../lib/db.js';
import { findConsumerById } from './consumer-user.repository.js';
import {
  createStripeCardholder,
  createStripeVirtualCard,
  updateStripeVirtualCardStatus,
} from '../services/stripe-issuing.service.js';

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

async function resolveProgramById(programId: string): Promise<{ slug: string; processor: string } | null> {
  if (process.env.NODE_ENV === 'test') {
    return { slug: 'stipulate_sandbox', processor: 'sandbox' };
  }

  const result = await query<{ slug: string; processor: string }>(
    `SELECT slug, processor FROM card_programs WHERE id = $1::uuid LIMIT 1`,
    [programId],
  );
  return result.rows[0] ?? null;
}

export type IssuingMode = 'sandbox' | 'stripe';

export async function resolveIssuingMode(programSlug: string): Promise<IssuingMode> {
  if (process.env.NODE_ENV === 'test') return 'sandbox';
  if (!process.env.STRIPE_SECRET_KEY) return 'sandbox';
  const program = await query<{ processor: string }>(
    `SELECT processor FROM card_programs WHERE slug = $1 LIMIT 1`,
    [programSlug],
  );
  return program.rows[0]?.processor === 'stripe_issuing' ? 'stripe' : 'sandbox';
}

export async function createCardholder(input: {
  consumerUserId: string;
  programSlug: string;
}): Promise<CardholderRow & { program_slug: string; mode: IssuingMode }> {
  const programId = await resolveProgramId(input.programSlug);
  if (!programId) throw new Error(`Unknown card program: ${input.programSlug}`);
  const mode = await resolveIssuingMode(input.programSlug);

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
    return { ...row, program_slug: input.programSlug, mode: 'sandbox' };
  }

  let externalId = `ext_${randomBytes(6).toString('hex')}`;
  if (mode === 'stripe') {
    const consumer = await findConsumerById(input.consumerUserId);
    const stripeHolder = await createStripeCardholder({
      name: consumer?.name ?? consumer?.email ?? 'Stipulate Cardholder',
      email: consumer?.email,
      metadata: { consumer_user_id: input.consumerUserId, program_slug: input.programSlug },
    });
    externalId = stripeHolder.id;
  }

  const result = await query<CardholderRow>(
    `INSERT INTO cardholders (consumer_user_id, program_id, external_id, status, kyc_status)
     VALUES ($1, $2, $3, 'approved', 'passed')
     ON CONFLICT (consumer_user_id, program_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, consumer_user_id, program_id, external_id, status, kyc_status, created_at`,
    [input.consumerUserId, programId, externalId],
  );
  return { ...result.rows[0]!, program_slug: input.programSlug, mode };
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
}): Promise<VirtualCardRow & { mode: IssuingMode }> {
  const cardholder = await findCardholderById(input.cardholderId);
  if (!cardholder) throw new Error('Cardholder not found');

  const program = await resolveProgramById(cardholder.program_id);
  const mode = program ? await resolveIssuingMode(program.slug) : 'sandbox';

  let last4 = String(Math.floor(1000 + Math.random() * 9000));
  let panToken = `pan_tok_${randomBytes(8).toString('hex')}`;
  const cvvToken = `cvv_tok_${randomBytes(4).toString('hex')}`;
  const now = new Date();
  let network = 'visa';
  let externalId = `vc_${randomBytes(6).toString('hex')}`;
  let expMonth = now.getUTCMonth() + 1;
  let expYear = now.getUTCFullYear() + 3;

  if (mode === 'stripe' && cardholder.external_id?.startsWith('ich_')) {
    const stripeCard = await createStripeVirtualCard({ cardholderId: cardholder.external_id });
    externalId = stripeCard.id;
    last4 = stripeCard.last4;
    network = stripeCard.brand;
    expMonth = stripeCard.exp_month;
    expYear = stripeCard.exp_year;
    panToken = `stripe_card_${stripeCard.id}`;
  }

  if (process.env.NODE_ENV === 'test') {
    const row: VirtualCardRow = {
      id: '00000000-0000-4000-8000-000000000021',
      cardholder_id: input.cardholderId,
      program_id: cardholder.program_id,
      last4,
      network,
      status: 'active',
      pan_token: panToken,
      cvv_token: cvvToken,
      exp_month: expMonth,
      exp_year: expYear,
      spend_limit_minor: input.spendLimitMinor ?? null,
      created_at: now,
    };
    const existing = testVirtualCards.get(input.cardholderId) ?? [];
    testVirtualCards.set(input.cardholderId, [...existing, row]);
    return { ...row, mode: 'sandbox' };
  }

  const result = await query<VirtualCardRow>(
    `INSERT INTO virtual_cards (
       cardholder_id, program_id, external_id, last4, network, status,
       pan_token, cvv_token, exp_month, exp_year, spend_limit_minor
     ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10)
     RETURNING id, cardholder_id, program_id, last4, network, status,
               pan_token, cvv_token, exp_month, exp_year, spend_limit_minor, created_at`,
    [
      input.cardholderId,
      cardholder.program_id,
      externalId,
      last4,
      network,
      panToken,
      cvvToken,
      expMonth,
      expYear,
      input.spendLimitMinor ?? null,
    ],
  );
  return { ...result.rows[0]!, mode };
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

export async function updateVirtualCardStatus(input: {
  cardId: string;
  status: 'active' | 'frozen' | 'closed';
}): Promise<(VirtualCardRow & { mode: IssuingMode }) | null> {
  if (process.env.NODE_ENV === 'test') {
    for (const cards of testVirtualCards.values()) {
      const card = cards.find((c) => c.id === input.cardId);
      if (card) {
        card.status = input.status;
        return { ...card, mode: 'sandbox' };
      }
    }
    return null;
  }

  const existing = await query<VirtualCardRow & { external_id: string | null }>(
    `SELECT id, cardholder_id, program_id, external_id, last4, network, status,
            pan_token, cvv_token, exp_month, exp_year, spend_limit_minor, created_at
     FROM virtual_cards WHERE id = $1::uuid LIMIT 1`,
    [input.cardId],
  );
  const current = existing.rows[0];
  if (!current) return null;

  const program = await resolveProgramById(current.program_id);
  const mode = program ? await resolveIssuingMode(program.slug) : 'sandbox';

  if (mode === 'stripe' && current.external_id?.startsWith('ic_')) {
    const stripeStatus =
      input.status === 'active' ? 'active' : input.status === 'frozen' ? 'inactive' : 'canceled';
    await updateStripeVirtualCardStatus({ stripeCardId: current.external_id, status: stripeStatus });
  }

  const result = await query<VirtualCardRow>(
    `UPDATE virtual_cards SET status = $2, updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, cardholder_id, program_id, last4, network, status,
               pan_token, cvv_token, exp_month, exp_year, spend_limit_minor, created_at`,
    [input.cardId, input.status],
  );
  const row = result.rows[0];
  return row ? { ...row, mode } : null;
}

export interface PhysicalCardOrderRow {
  id: string;
  cardholder_id: string;
  status: string;
  tracking_number: string | null;
  created_at: Date;
}

const testPhysicalOrders = new Map<string, PhysicalCardOrderRow[]>();

export async function orderPhysicalCard(input: {
  cardholderId: string;
  shippingAddress: Record<string, string>;
}): Promise<PhysicalCardOrderRow> {
  const cardholder = await findCardholderById(input.cardholderId);
  if (!cardholder) throw new Error('Cardholder not found');

  if (process.env.NODE_ENV === 'test') {
    const order: PhysicalCardOrderRow = {
      id: '00000000-0000-4000-8000-000000000030',
      cardholder_id: input.cardholderId,
      status: 'submitted',
      tracking_number: null,
      created_at: new Date(),
    };
    const existing = testPhysicalOrders.get(input.cardholderId) ?? [];
    testPhysicalOrders.set(input.cardholderId, [order, ...existing]);
    return order;
  }

  const result = await query<PhysicalCardOrderRow>(
    `INSERT INTO physical_card_orders (cardholder_id, program_id, status, shipping_address)
     VALUES ($1, $2, 'submitted', $3::jsonb)
     RETURNING id, cardholder_id, status, tracking_number, created_at`,
    [input.cardholderId, cardholder.program_id, JSON.stringify(input.shippingAddress)],
  );
  return result.rows[0]!;
}

export async function listPhysicalCardOrders(cardholderId: string): Promise<PhysicalCardOrderRow[]> {
  if (process.env.NODE_ENV === 'test') {
    return (testPhysicalOrders.get(cardholderId) ?? []).slice().sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
  }

  const result = await query<PhysicalCardOrderRow>(
    `SELECT id, cardholder_id, status, tracking_number, created_at
     FROM physical_card_orders
     WHERE cardholder_id = $1::uuid
     ORDER BY created_at DESC`,
    [cardholderId],
  );
  return result.rows;
}

export async function updatePhysicalCardOrderStatus(input: {
  orderId: string;
  status: 'pending' | 'submitted' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
}): Promise<PhysicalCardOrderRow | null> {
  if (process.env.NODE_ENV === 'test') {
    for (const orders of testPhysicalOrders.values()) {
      const order = orders.find((entry) => entry.id === input.orderId);
      if (order) {
        order.status = input.status;
        if (input.trackingNumber) order.tracking_number = input.trackingNumber;
        return order;
      }
    }
    return null;
  }

  const result = await query<PhysicalCardOrderRow>(
    `UPDATE physical_card_orders
     SET status = $2,
         tracking_number = COALESCE($3, tracking_number),
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, cardholder_id, status, tracking_number, created_at`,
    [input.orderId, input.status, input.trackingNumber ?? null],
  );
  return result.rows[0] ?? null;
}
