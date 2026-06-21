import { query } from '../lib/db.js';

export interface OrgPaymentMethodRow {
  id: string;
  org_id: string;
  stripe_payment_method_id: string;
  label: string | null;
  network: string | null;
  last4: string | null;
  is_default: boolean;
  consent_given_at: Date;
}

const testMethods = new Map<string, OrgPaymentMethodRow[]>();

export async function listOrgPaymentMethods(orgId: string): Promise<OrgPaymentMethodRow[]> {
  if (process.env.NODE_ENV === 'test') {
    return testMethods.get(orgId) ?? [];
  }

  const result = await query<OrgPaymentMethodRow>(
    `SELECT id, org_id::text, stripe_payment_method_id, label, network, last4, is_default, consent_given_at
     FROM org_payment_methods
     WHERE org_id = $1::uuid
     ORDER BY is_default DESC, created_at DESC`,
    [orgId],
  );
  return result.rows;
}

export async function addOrgPaymentMethod(input: {
  orgId: string;
  stripePaymentMethodId: string;
  label?: string;
  network?: string;
  last4?: string;
  setDefault?: boolean;
}): Promise<OrgPaymentMethodRow> {
  if (process.env.NODE_ENV === 'test') {
    const row: OrgPaymentMethodRow = {
      id: `pm-${input.stripePaymentMethodId.slice(-8)}`,
      org_id: input.orgId,
      stripe_payment_method_id: input.stripePaymentMethodId,
      label: input.label ?? null,
      network: input.network ?? 'visa',
      last4: input.last4 ?? '4242',
      is_default: input.setDefault ?? false,
      consent_given_at: new Date(),
    };
    const existing = testMethods.get(input.orgId) ?? [];
    if (input.setDefault) {
      for (const method of existing) method.is_default = false;
    }
    testMethods.set(input.orgId, [...existing.filter((m) => m.stripe_payment_method_id !== input.stripePaymentMethodId), row]);
    return row;
  }

  if (input.setDefault) {
    await query(`UPDATE org_payment_methods SET is_default = FALSE WHERE org_id = $1::uuid`, [input.orgId]);
  }

  const result = await query<OrgPaymentMethodRow>(
    `INSERT INTO org_payment_methods (org_id, stripe_payment_method_id, label, network, last4, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (org_id, stripe_payment_method_id) DO UPDATE SET
       label = COALESCE(EXCLUDED.label, org_payment_methods.label),
       network = COALESCE(EXCLUDED.network, org_payment_methods.network),
       last4 = COALESCE(EXCLUDED.last4, org_payment_methods.last4),
       is_default = EXCLUDED.is_default,
       updated_at = NOW()
     RETURNING id, org_id::text, stripe_payment_method_id, label, network, last4, is_default, consent_given_at`,
    [
      input.orgId,
      input.stripePaymentMethodId,
      input.label ?? null,
      input.network ?? null,
      input.last4 ?? null,
      input.setDefault ?? false,
    ],
  );
  return result.rows[0]!;
}

export async function removeOrgPaymentMethod(orgId: string, methodId: string): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') {
    const existing = testMethods.get(orgId) ?? [];
    const next = existing.filter((m) => m.id !== methodId);
    testMethods.set(orgId, next);
    return next.length !== existing.length;
  }

  const result = await query(
    `DELETE FROM org_payment_methods WHERE org_id = $1::uuid AND id = $2::uuid`,
    [orgId, methodId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getDefaultOrgPaymentMethod(orgId: string): Promise<OrgPaymentMethodRow | null> {
  const methods = await listOrgPaymentMethods(orgId);
  return methods.find((m) => m.is_default) ?? methods[0] ?? null;
}
