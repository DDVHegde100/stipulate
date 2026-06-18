'use client';

import { Heading, Text, Card } from '@stipulate/ui';

export default function KeysPage() {
  return (
    <div className="space-y-6">
      <Heading as="h1" size="lg">
        API keys
      </Heading>
      <Card className="p-6 space-y-3">
        <Text tone="secondary">
          Manage organization API keys via the admin bootstrap script or POST /admin/orgs/:slug/keys.
        </Text>
        <Text variant="body-sm" tone="secondary">
          Keys are scoped to route, enrich, and webhook permissions. Rotate keys regularly in production.
        </Text>
      </Card>
    </div>
  );
}
