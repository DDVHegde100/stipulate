function flag(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/** Resolved feature flags from environment. */
export function getFeatureFlags() {
  return {
    receiptOcr: flag(process.env.FEATURE_RECEIPT_OCR, true),
    proxyPay: flag(process.env.FEATURE_PROXY_PAY, false),
    benefitWebhooks: flag(process.env.FEATURE_BENEFIT_WEBHOOKS, true),
    stripeBilling: Boolean(process.env.STRIPE_SECRET_KEY),
    sentry: Boolean(process.env.SENTRY_DSN),
    posthog: Boolean(process.env.POSTHOG_API_KEY),
  };
}

export type FeatureFlags = ReturnType<typeof getFeatureFlags>;
