import Link from 'next/link';
import { Footer, Heading, NavBar, Text } from '@stipulate/ui';

import { SdkDocsPanel } from '../../../components/SdkDocsPanel';

export default function SdkDocsPage() {
  return (
    <div className="relative min-h-screen bg-ink-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Text variant="overline" tone="secondary">
          Documentation
        </Text>
        <Heading as="h1" size="lg" className="mb-2">
          SDK reference
        </Heading>
        <Text tone="secondary" className="mb-8">
          Typed clients for TypeScript and Python. See also the{' '}
          <Link href="/docs" className="text-accent-400 hover:underline">
            OpenAPI reference
          </Link>
          .
        </Text>
        <SdkDocsPanel />
      </main>
      <Footer />
    </div>
  );
}
