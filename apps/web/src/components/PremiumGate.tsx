'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, Heading, Text } from '@stipulate/ui';

import { fetchConsumerBillingStatus, type ConsumerBillingStatus } from '../lib/consumer-billing';

export function PremiumGate({
  feature,
  children,
}: {
  feature: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<ConsumerBillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchConsumerBillingStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Text tone="secondary">Checking subscription…</Text>;
  }

  if (status?.isPremium) {
    return <>{children}</>;
  }

  return (
    <Card className="p-8 text-center">
      <Heading as="h2" size="sm" className="mb-2">
        Consumer Premium required
      </Heading>
      <Text tone="secondary" className="mb-6">
        {feature} is included with Consumer Premium ($3.99/mo).
      </Text>
      <Link href="/app/settings">
        <Button size="sm">Upgrade in settings</Button>
      </Link>
    </Card>
  );
}
