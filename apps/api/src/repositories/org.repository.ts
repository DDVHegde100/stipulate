import { createHash, randomBytes } from 'node:crypto';
import { query } from '../lib/db.js';

export interface OrgRow {
  id: string;
  slug: string;
  name: string;
  plan: string;
  stripe_customer_id: string | null;
  monthly_request_limit: number | null;
}

export interface ApiKeyRow {
  id: string;
  org_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  org_plan: string;
  org_slug: string;
}

const PLAN_RATE_LIMITS: Record<string, number> = {
  free: 30,
  payg: 120,
  saas: 600,
  enterprise: 3000,
};

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const rawKey = `stip_${randomBytes(24).toString('base64url')}`;
  const prefix = rawKey.slice(0, 12);
  return { rawKey, prefix, hash: hashApiKey(rawKey) };
}

/** Look up API key by prefix + hash for authentication. */
export async function findApiKeyByHash(keyHash: string, prefix: string): Promise<ApiKeyRow | null> {
  const result = await query<ApiKeyRow & { scopes: unknown }>(
    `SELECT ak.id, ak.org_id, ak.key_hash, ak.key_prefix, ak.name,
            ak.scopes, ak.rate_limit_per_minute, ak.is_active,
            o.plan AS org_plan, o.slug AS org_slug
     FROM api_keys ak
     JOIN organizations o ON o.id = ak.org_id
     WHERE ak.key_prefix = $1 AND ak.key_hash = $2 AND ak.is_active = TRUE
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
     LIMIT 1`,
    [prefix, keyHash],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...row,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : JSON.parse(String(row.scopes ?? '[]')),
  };
}

/** Resolve org by slug. */
export async function findOrgBySlug(slug: string): Promise<OrgRow | null> {
  const result = await query<OrgRow>(
    `SELECT id, slug, name, plan, stripe_customer_id, monthly_request_limit
     FROM organizations WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

/** Effective rate limit for an org plan. */
export function rateLimitForPlan(plan: string, keyOverride?: number): number {
  if (keyOverride && keyOverride > 0) return keyOverride;
  return PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.free!;
}

/** Create org + API key (admin/bootstrap). */
export async function createOrgWithApiKey(input: {
  slug: string;
  name: string;
  plan?: string;
  keyName?: string;
  scopes?: string[];
}): Promise<{ org: OrgRow; rawKey: string; prefix: string }> {
  const orgResult = await query<OrgRow>(
    `INSERT INTO organizations (slug, name, plan)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, slug, name, plan, stripe_customer_id, monthly_request_limit`,
    [input.slug, input.name, input.plan ?? 'free'],
  );
  const org = orgResult.rows[0]!;

  const { rawKey, prefix, hash } = generateApiKey();
  await query(
    `INSERT INTO api_keys (org_id, key_hash, key_prefix, name, scopes, rate_limit_per_minute)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      org.id,
      hash,
      prefix,
      input.keyName ?? 'default',
      JSON.stringify(input.scopes ?? ['route:read', 'enrich:read']),
      rateLimitForPlan(org.plan),
    ],
  );

  return { org, rawKey, prefix };
}

/** Update last_used_at on key. */
export async function touchApiKey(keyId: string): Promise<void> {
  await query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [keyId]);
}
