'use client';

import { Heading, Text, Card } from '@stipulate/ui';

export default function UsagePage() {
  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        Usage
      </Heading>
      <Card className="p-6">
        <Text tone="secondary">
          Detailed usage breakdown by endpoint and API key is available via GET /v1/usage. Connect your
          production key to view live metrics on the overview page.
        </Text>
      </Card>
    </div>
  );
}
