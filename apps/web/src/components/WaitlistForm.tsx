'use client';

import { useState } from 'react';
import { Button, Card, Container, Heading, Input, Text } from '@stipulate/ui';
import { brand } from '@stipulate/brand';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setMessage(null);

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');

    try {
      const response = await fetch(`${apiBase}/public/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company: company || undefined }),
      });
      const json = (await response.json()) as { data?: { message: string }; error?: { message: string } };
      if (!response.ok) throw new Error(json.error?.message ?? 'Signup failed');
      setStatus('done');
      setMessage(json.data?.message ?? 'You are on the waitlist.');
      setEmail('');
      setCompany('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  return (
    <Card variant="glass" padding="lg" className="mx-auto max-w-xl text-left">
      <Text variant="overline" tone="tertiary" className="mb-3">
        Early access
      </Text>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <Input type="email" placeholder="you@company.com" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="text" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        <Button type="submit" className="shrink-0" disabled={status === 'loading'}>
          {status === 'loading' ? 'Joining…' : 'Join waitlist'}
        </Button>
        {message && <Text tone="secondary">{message}</Text>}
      </form>
    </Card>
  );
}

export function WaitlistSection() {
  return (
    <Container size="narrow" className="text-center">
      <Heading as="h2" size="md" className="mb-6">
        Get {brand.name} API access
      </Heading>
      <WaitlistForm />
    </Container>
  );
}
