'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Heading, Text } from '@stipulate/ui';

import { apiFetch } from '../../../lib/auth';

interface SubscriptionSummary {
  plan: string;
  status: string;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);

  useEffect(() => {
    void apiFetch<SubscriptionSummary>('/billing/subscription').then(setSubscription).catch(() => {});
  }, []);

  async function openCheckout() {
    const session = await apiFetch<{ url: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        plan: 'payg',
        success_url: `${window.location.origin}/dashboard/billing?success=1`,
        cancel_url: `${window.location.origin}/dashboard/billing`,
      }),
    });
    window.location.href = session.url;
  }

  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        Billing
      </Heading>
      <Card className="p-6 space-y-4">
        <Text variant="overline" tone="secondary">
          Current plan
        </Text>
        <p className="text-2xl font-semibold capitalize text-white">{subscription?.plan ?? 'free'}</p>
        <Text tone="secondary">Status: {subscription?.status ?? 'active'}</Text>
        <div className="flex gap-3">
          <Button onClick={() => void openCheckout()}>Upgrade to PAYG</Button>
        </div>
      </Card>
    </div>
  );
}
