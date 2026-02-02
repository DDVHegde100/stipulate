import { brand } from '@stipulate/brand';
import {
  Badge,
  Button,
  Card,
  Container,
  Heading,
  Input,
  Logo,
  Section,
  Text,
} from '@stipulate/ui';

const features = [
  {
    title: 'Parse stipulations',
    description: 'Extract benefit rules, caps, and merchant categories from card fine print automatically.',
  },
  {
    title: 'Route spend',
    description: 'Match transactions to the card that maximizes return for every purchase category.',
  },
  {
    title: 'Developer-first API',
    description: 'Structured JSON responses with typed schemas — integrate in minutes, not weeks.',
  },
] as const;

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gradient-mesh">
      <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden />

      <header className="sticky top-0 z-50 border-b border-glass-border bg-ink-950/80 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <Logo variant="full" />
          <nav className="hidden items-center gap-8 md:flex">
            <Text as="span" variant="body-sm" tone="secondary" className="hover:text-[var(--color-text-primary)] transition-colors">
              API
            </Text>
            <Text as="span" variant="body-sm" tone="secondary" className="hover:text-[var(--color-text-primary)] transition-colors">
              Docs
            </Text>
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </nav>
        </Container>
      </header>

      <main>
        <Section spacing="lg" className="relative">
          <Container size="narrow" className="text-center">
            <div className="stipulate-animate-in mb-6 flex justify-center">
              <Badge variant="accent">Card benefit intelligence</Badge>
            </div>

            <Heading as="h1" size="hero" gradient className="stipulate-animate-in mb-6">
              {brand.tagline.split('.')[0]}.
            </Heading>

            <Text
              variant="body-lg"
              tone="secondary"
              className="stipulate-animate-in mx-auto mb-10 max-w-2xl"
            >
              {brand.description}
            </Text>

            <div className="stipulate-animate-in flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg">Get API access</Button>
              <Button variant="outline" size="lg">
                View documentation
              </Button>
            </div>

            <Card variant="glass" padding="lg" className="stipulate-animate-in mx-auto mt-16 max-w-xl text-left">
              <Text variant="overline" tone="tertiary" className="mb-3">
                Early access
              </Text>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input type="email" placeholder="you@company.com" aria-label="Email address" />
                <Button className="shrink-0">Join waitlist</Button>
              </div>
            </Card>
          </Container>
        </Section>

        <Section spacing="md">
          <Container>
            <div className="mb-12 text-center">
              <Heading as="h2" size="lg" className="mb-4">
                Built for fintech &amp; rewards platforms
              </Heading>
              <Text variant="body-lg" tone="secondary" className="mx-auto max-w-2xl">
                Stipulate turns opaque card terms into actionable routing logic your product can trust.
              </Text>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} variant="glass" hover padding="lg">
                  <Heading as="h3" size="sm" className="mb-3">
                    {feature.title}
                  </Heading>
                  <Text tone="secondary">{feature.description}</Text>
                </Card>
              ))}
            </div>
          </Container>
        </Section>
      </main>

      <footer className="border-t border-glass-border py-8">
        <Container className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo variant="wordmark" className="opacity-80" />
          <Text variant="caption" tone="tertiary">
            © {new Date().getFullYear()} {brand.name}. {brand.domain}
          </Text>
        </Container>
      </footer>
    </div>
  );
}
