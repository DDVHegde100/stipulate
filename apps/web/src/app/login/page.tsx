'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Container, Heading, Input, Logo, Text } from '@stipulate/ui';

import { login as consumerLogin } from '../../lib/consumer-auth';
import { storeApiKey } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'consumer' | 'developer'>('consumer');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isDeveloper = mode === 'developer';

  async function handleConsumerSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await consumerLogin({ email, password });
      router.push(user.onboardingComplete ? '/app/wallet' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleDeveloperSubmit(event: React.FormEvent) {
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
        <Card className="mx-auto max-w-md space-y-6 p-8">
          <div className="flex justify-center">
            <Logo variant="full" />
          </div>
          <Heading as="h1" size="md" className="text-center">
            {isDeveloper ? 'Sign in with API key' : 'Welcome back'}
          </Heading>

          <div className="flex rounded-xl border border-glass-border p-1">
            <button
              type="button"
              onClick={() => setMode('consumer')}
              className={`flex-1 rounded-lg py-2 text-center text-sm transition-colors ${
                !isDeveloper ? 'bg-glass-surface text-white' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Consumer
            </button>
            <button
              type="button"
              onClick={() => setMode('developer')}
              className={`flex-1 rounded-lg py-2 text-center text-sm transition-colors ${
                isDeveloper ? 'bg-glass-surface text-white' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Developer
            </button>
          </div>

          {isDeveloper ? (
            <form onSubmit={handleDeveloperSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {error && <Text tone="secondary">{error}</Text>}
              <Button type="submit" className="w-full">
                Continue to dashboard
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConsumerSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <Text tone="secondary">{error}</Text>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <Text variant="body-sm" tone="secondary" className="text-center">
                Demo: demo@stipulate.io / demo-password-123
              </Text>
            </form>
          )}

          {!isDeveloper && (
            <Text variant="body-sm" tone="secondary" className="text-center">
              No account?{' '}
              <Link href="/signup" className="text-accent-400 hover:underline">
                Sign up
              </Link>
            </Text>
          )}
        </Card>
      </Container>
    </div>
  );
}
