import { Heading, Text } from '@stipulate/ui';

import { ApiPlayground } from '../../components/ApiPlayground';

export default function ConsolePage() {
  return (
    <div className="min-h-screen bg-ink-950 py-10">
      <div className="mx-auto max-w-6xl px-4 space-y-6">
        <div>
          <Text variant="overline" tone="secondary">
            Developer tools
          </Text>
          <Heading as="h1" size="lg">
            API console
          </Heading>
        </div>
        <ApiPlayground />
      </div>
    </div>
  );
}
