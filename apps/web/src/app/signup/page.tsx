'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Container, Heading, Input, Logo, Text } from '@stipulate/ui';

import { signup } from '../../lib/consumer-auth';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signup({ email, password, name: name || undefined });
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4">
      <Container size="narrow">
        <Card className="mx-auto max-w-md space-y-6 p-8">
          <div className="flex justify-center">
            <Logo variant="full" />
          </div>
          <Heading as="h1" size="md" className="text-center">
            Create your account
          </Heading>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password (8+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error && <Text tone="secondary">{error}</Text>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>
          <Text variant="body-sm" tone="secondary" className="text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-accent-400 hover:underline">
              Sign in
            </Link>
          </Text>
          <Text variant="caption" tone="tertiary" className="text-center">
            Developers:{' '}
            <Link href="/login" className="text-accent-400 hover:underline">
              API key login
            </Link>
          </Text>
        </Card>
      </Container>
    </div>
  );
}
