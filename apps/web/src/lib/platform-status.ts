function statusBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');
}

export interface PlatformStatus {
  status: string;
  features: {
    receiptOcr: boolean;
    proxyPay: boolean;
    benefitWebhooks: boolean;
    stripeBilling: boolean;
  };
  integrations: {
    emailAlerts: boolean;
    pushAlerts: boolean;
    plaid: boolean;
  };
  monitoring: {
    routeSloOk: boolean;
    ingestionQueueOk: boolean;
    reviewQueueOk: boolean;
    stripe: {
      billing: boolean;
      liveMode: boolean;
      webhookConfigured: boolean;
      consumerPriceConfigured: boolean;
    };
  };
}

export async function fetchPlatformStatus(): Promise<PlatformStatus> {
  const response = await fetch(`${statusBase()}/status`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Status request failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    status: string;
    checks: PlatformStatus;
  };

  return {
    status: json.status,
    features: json.checks.features,
    integrations: json.checks.integrations,
    monitoring: json.checks.monitoring,
  };
}
