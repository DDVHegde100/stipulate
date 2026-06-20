const PLAID_HOSTS: Record<string, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

export function isPlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

function plaidHost(): string {
  const env = process.env.PLAID_ENV ?? 'sandbox';
  return PLAID_HOSTS[env] ?? PLAID_HOSTS.sandbox;
}

async function plaidRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${plaidHost()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Plaid API error: ${response.status} ${err}`);
  }

  return response.json() as Promise<T>;
}

/** Create a Plaid Link token for a consumer user. */
export async function createPlaidLinkToken(input: {
  consumerUserId: string;
}): Promise<{ linkToken: string; expiration: string }> {
  const result = await plaidRequest<{ link_token: string; expiration: string }>(
    '/link/token/create',
    {
      user: { client_user_id: input.consumerUserId },
      client_name: 'Stipulate',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    },
  );

  return {
    linkToken: result.link_token,
    expiration: result.expiration,
  };
}

/** Exchange a Link public token for an access token and item id. */
export async function exchangePlaidPublicToken(publicToken: string): Promise<{
  accessToken: string;
  itemId: string;
}> {
  const result = await plaidRequest<{
    access_token: string;
    item_id: string;
  }>('/item/public_token/exchange', {
    public_token: publicToken,
  });

  return {
    accessToken: result.access_token,
    itemId: result.item_id,
  };
}

export interface PlaidAccount {
  accountId: string;
  accountName: string;
  accountMask: string | null;
  accountType: string | null;
  accountSubtype: string | null;
}

/** Fetch linked accounts for a Plaid item. */
export async function fetchPlaidAccounts(accessToken: string): Promise<PlaidAccount[]> {
  const result = await plaidRequest<{
    accounts: Array<{
      account_id: string;
      name: string;
      mask: string | null;
      type: string;
      subtype: string | null;
    }>;
    item?: { institution_id?: string };
  }>('/accounts/get', {
    access_token: accessToken,
  });

  return result.accounts.map((account) => ({
    accountId: account.account_id,
    accountName: account.name,
    accountMask: account.mask,
    accountType: account.type,
    accountSubtype: account.subtype,
  }));
}

/** Fetch institution metadata for display and card mapping. */
export async function fetchPlaidInstitution(accessToken: string): Promise<{
  institutionId: string | null;
  institutionName: string | null;
}> {
  const item = await plaidRequest<{
    item: { institution_id?: string };
  }>('/item/get', {
    access_token: accessToken,
  });

  const institutionId = item.item.institution_id ?? null;
  if (!institutionId) {
    return { institutionId: null, institutionName: null };
  }

  const institution = await plaidRequest<{
    institution: { name: string };
  }>('/institutions/get_by_id', {
    institution_id: institutionId,
    country_codes: ['US'],
  });

  return {
    institutionId,
    institutionName: institution.institution.name,
  };
}
