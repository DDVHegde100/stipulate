import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiUrl?: string; apiKey?: string } | undefined;

const API_BASE = extra?.apiUrl ?? 'http://localhost:3000/v1';
const API_KEY = extra?.apiKey ?? 'stip_dev_local_key_change_in_production';

function apiHeaders(consumerUserId?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  if (consumerUserId) headers['X-Consumer-User-Id'] = consumerUserId;
  return headers;
}

export async function createPlaidLinkToken(consumerUserId: string): Promise<{
  linkToken: string;
  mode: string;
  message?: string;
}> {
  const response = await fetch(`${API_BASE}/plaid/link-token`, {
    method: 'POST',
    headers: apiHeaders(consumerUserId),
    credentials: 'include',
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error('Failed to create Plaid link token');

  const json = (await response.json()) as {
    data: { linkToken: string; mode: string; message?: string };
  };
  return json.data;
}

export async function exchangePlaidPublicToken(input: {
  consumerUserId: string;
  publicToken: string;
  institutionName?: string;
}): Promise<{
  accountsLinked: number;
  suggestedCards: Array<{ accountName: string; cardId: string }>;
}> {
  const response = await fetch(`${API_BASE}/plaid/exchange`, {
    method: 'POST',
    headers: apiHeaders(input.consumerUserId),
    credentials: 'include',
    body: JSON.stringify({
      publicToken: input.publicToken,
      institutionName: input.institutionName,
    }),
  });
  if (!response.ok) throw new Error('Failed to link bank account');

  const json = (await response.json()) as {
    data: {
      accountsLinked: number;
      suggestedCards: Array<{ accountName: string; cardId: string }>;
    };
  };
  return json.data;
}

/** Stub bank connect when Plaid keys are unset or Link SDK unavailable. */
export async function connectBankStub(consumerUserId: string): Promise<{
  accountsLinked: number;
  suggestedCards: Array<{ accountName: string; cardId: string }>;
}> {
  await createPlaidLinkToken(consumerUserId);
  return exchangePlaidPublicToken({
    consumerUserId,
    publicToken: `public-mobile-${Date.now()}`,
    institutionName: 'Chase',
  });
}

export async function syncPlaidTransactions(consumerUserId: string): Promise<{
  imported: number;
  totalMinor: number;
}> {
  const response = await fetch(`${API_BASE}/plaid/sync-transactions`, {
    method: 'POST',
    headers: apiHeaders(consumerUserId),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to sync transactions');

  const json = (await response.json()) as {
    data: { imported: number; totalMinor: number };
  };
  return json.data;
}
