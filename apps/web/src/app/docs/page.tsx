import { Footer, Heading, NavBar, Text } from '@stipulate/ui';

import { OpenApiEmbed } from '../../components/OpenApiEmbed';
import { apiV1Base } from '../../lib/demo-api';

export default function DocsPage() {
  const specUrl = `${apiV1Base()}/openapi`;

  return (
    <div className="relative min-h-screen bg-ink-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Text variant="overline" tone="secondary">
          Documentation
        </Text>
        <Heading as="h1" size="lg" className="mb-2">
          API reference
        </Heading>
        <Text tone="secondary" className="mb-8">
          OpenAPI 3.1 specification for all v1 endpoints.{' '}
          <a href={specUrl} className="text-accent-400 hover:underline">
            Download YAML
          </a>
        </Text>
        <OpenApiEmbed />
      </main>
      <Footer />
    </div>
  );
}
