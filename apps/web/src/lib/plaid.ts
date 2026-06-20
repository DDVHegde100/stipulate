function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
}

function publicApiBase(): string {
  return apiBase().replace(/\/v1$/, '');
}

function apiKey(): string {
  return process.env.NEXT_PUBLIC_DEMO_API_KEY ?? 'stip_dev_local_key_change_in_production';
}

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey(),
  };
}

export interface PlaidLinkedAccount {
  accountId: string;
  accountName: string | null;
  accountMask: string | null;
  institutionName: string | null;
  mappedCardId: string | null;
  mappingConfidence: number | null;
}

export async function createPlaidLinkToken(): Promise<{
  linkToken: string;
  mode: string;
  message?: string;
}> {
  const response = await fetch(`${apiBase()}/plaid/link-token`, {
    method: 'POST',
    headers: apiHeaders(),
    credentials: 'include',
    body: JSON.stringify({}),
  });
  const json = (await response.json()) as {
    data: { linkToken: string; mode: string; message?: string };
    error?: { message: string };
  };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data;
}

export async function exchangePlaidPublicToken(input: {
  publicToken: string;
  institutionName?: string;
  consumerUserId?: string;
}): Promise<{
  itemId: string;
  accountsLinked: number;
  suggestedCards: Array<{ accountName: string; cardId: string; confidence: number }>;
}> {
  const headers = apiHeaders();
  if (input.consumerUserId) headers['X-Consumer-User-Id'] = input.consumerUserId;

  const response = await fetch(`${apiBase()}/plaid/exchange`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      publicToken: input.publicToken,
      institutionName: input.institutionName,
    }),
  });
  const json = (await response.json()) as {
    data: {
      itemId: string;
      accountsLinked: number;
      suggestedCards: Array<{ accountName: string; cardId: string; confidence: number }>;
    };
    error?: { message: string };
  };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data;
}

export async function fetchPlaidLinkedAccounts(consumerUserId?: string): Promise<PlaidLinkedAccount[]> {
  const headers = apiHeaders();
  delete headers['Content-Type'];
  if (consumerUserId) headers['X-Consumer-User-Id'] = consumerUserId;

  const response = await fetch(`${apiBase()}/plaid/accounts`, {
    headers,
    credentials: 'include',
  });
  if (!response.ok) return [];

  const json = (await response.json()) as { data: { accounts: PlaidLinkedAccount[] } };
  return json.data.accounts ?? [];
}

export async function refreshConsumerSession(): Promise<boolean> {
  const response = await fetch(`${publicApiBase()}/public/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return response.ok;
}

export async function logoutConsumerSession(): Promise<void> {
  await fetch(`${publicApiBase()}/public/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
