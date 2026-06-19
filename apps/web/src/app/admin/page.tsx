import Link from 'next/link';
import { Container, Heading, Text } from '@stipulate/ui';

const LINKS = [
  { href: '/admin/ingestion', label: 'Ingestion queue' },
  { href: '/admin/corrections', label: 'MCC corrections' },
] as const;

export default function AdminHomePage() {
  return (
    <Container className="space-y-8 py-10">
      <div>
        <Text variant="overline" tone="secondary">
          Internal
        </Text>
        <Heading as="h1" size="lg">
          Admin console
        </Heading>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-glass-border bg-ink-900 p-6 hover:border-[var(--color-accent)] transition-colors"
          >
            <Heading as="h2" size="sm">
              {link.label}
            </Heading>
          </Link>
        ))}
      </div>
    </Container>
  );
}
