import Constants from 'expo-constants';

function statusBase(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  const apiUrl = extra?.apiUrl ?? 'http://localhost:3000/v1';
  return apiUrl.replace(/\/v1$/, '');
}

export interface PlatformStatus {
  status: string;
  features: {
    receiptOcr: boolean;
    proxyPay: boolean;
    benefitWebhooks: boolean;
    stripeBilling: boolean;
  };
}

export async function fetchPlatformStatus(): Promise<PlatformStatus> {
  const response = await fetch(`${statusBase()}/status`);
  if (!response.ok) {
    throw new Error(`Status request failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    status: string;
    checks: { features: PlatformStatus['features'] };
  };

  return {
    status: json.status,
    features: json.checks.features,
  };
}
