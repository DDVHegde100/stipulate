import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiUrl?: string; apiKey?: string } | undefined;

const API_BASE = extra?.apiUrl ?? 'http://localhost:3000/v1';
const API_KEY = extra?.apiKey ?? 'stip_dev_local_key_change_in_production';

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };
}

export interface ProxyPayResult {
  requestId: string;
  routing: {
    bestCardId: string;
    estimatedRewardMinor: number;
  };
  paymentIntent: {
    id: string;
    status: 'requires_confirmation' | 'processing' | 'succeeded';
    mode?: 'sandbox' | 'stripe';
  };
}

export async function proxyPayPurchase(input: {
  merchantName: string;
  mcc: string;
  amountMinor: number;
  userCardIds: string[];
  paymentMethodToken?: string;
}): Promise<ProxyPayResult> {
  const response = await fetch(`${API_BASE}/proxy-pay`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      merchantName: input.merchantName,
      mcc: input.mcc,
      amount: { amountMinor: input.amountMinor, currency: 'USD' },
      userCardIds: input.userCardIds,
      paymentMethodToken: input.paymentMethodToken,
    }),
  });

  const json = (await response.json()) as {
    data: ProxyPayResult;
    error?: { message: string };
  };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data;
}

export async function listVaultedPaymentMethods(): Promise<
  Array<{ id: string; paymentMethodId: string; last4: string | null; isDefault: boolean }>
> {
  const response = await fetch(`${API_BASE}/billing/payment-methods`, {
    headers: apiHeaders(),
  });
  if (!response.ok) return [];

  const json = (await response.json()) as {
    data: {
      paymentMethods: Array<{
        id: string;
        paymentMethodId: string;
        last4: string | null;
        isDefault: boolean;
      }>;
    };
  };
  return json.data.paymentMethods ?? [];
}
