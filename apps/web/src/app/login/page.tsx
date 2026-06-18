'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Container, Heading, Input, Logo, Text } from '@stipulate/ui';

import { storeApiKey } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (apiKey.length < 16) {
      setError('API key must be at least 16 characters');
      return;
    }
    storeApiKey(apiKey);
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4">
      <Container size="narrow">
        <Card className="mx-auto max-w-md p-8 space-y-6">
          <div className="flex justify-center">
            <Logo variant="full" />
          </div>
          <Heading as="h1" size="md" className="text-center">
            Sign in with API key
          </Heading>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="sk_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            {error && <Text tone="secondary">{error}</Text>}
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </Card>
      </Container>
    </div>
  );
}
