'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  Container,
  FeatureGrid,
  Footer,
  MotionFade,
  NavBar,
  Section,
  StatStrip,
  TestimonialCard,
  Heading,
  Text,
} from '@stipulate/ui';

import { WaitlistForm } from '../components/WaitlistForm';

const features = [
  {
    title: 'Parse stipulations',
    description:
      'LLM pipeline extracts benefit rules, caps, and exclusions from issuer fine print — versioned and diffable.',
  },
  {
    title: 'Route spend',
    description:
      'Sub-20ms routing ranks every card in a wallet by expected return for any merchant, MCC, and amount.',
  },
  {
    title: 'Developer-first API',
    description:
      'Typed OpenAPI, TypeScript + Python SDKs, webhooks on benefit changes, and metered billing built in.',
  },
];

const testimonials = [
  {
    quote:
      'Stipulate is the infrastructure layer for card optimization — parse the fine print once, route every transaction.',
    author: 'Alex Johnson',
    role: 'Fintech Takes',
  },
  {
    quote:
      'The clarity of doing one thing very simply. POST /route and get a ranked answer with reasoning.',
    author: 'Simon Taylor',
    role: 'Fintech Brainfood',
  },
  {
    quote:
      'Finally an API that understands issuer MCC overrides. Accuracy is the moat.',
    author: 'Mike Darlington',
    role: '@DarlingtonDev',
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gradient-mesh">
      <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden />
      <NavBar />

      <main>
        <Section spacing="lg" className="relative">
          <Container size="narrow" className="text-center">
            <MotionFade delay={0}>
              <div className="mb-6 flex justify-center">
                <Badge variant="accent">Card benefit intelligence</Badge>
              </div>
            </MotionFade>

            <MotionFade delay={80}>
              <Heading as="h1" size="hero" gradient className="mb-6">
                Route every swipe to max return.
              </Heading>
            </MotionFade>

            <MotionFade delay={160}>
              <Text variant="body-lg" tone="secondary" className="mx-auto mb-10 max-w-2xl">
                Stipulate parses credit card fine print, enriches merchant categories, and routes spend to
                the card that maximizes net return — via API or wallet app.
              </Text>
            </MotionFade>

            <MotionFade delay={240}>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg">Get started free</Button>
                </Link>
                <Link href="/console">
                  <Button variant="outline" size="lg">
                    View API console
                  </Button>
                </Link>
              </div>
            </MotionFade>

            <MotionFade delay={320}>
              <div className="mx-auto mt-16 max-w-3xl">
                <StatStrip
                  stats={[
                    { label: 'US cards', value: '200+' },
                    { label: 'Routing latency', value: '<20ms' },
                    { label: 'MCC codes', value: '450+' },
                    { label: 'API price', value: '$0.001' },
                  ]}
                />
              </div>
            </MotionFade>
          </Container>
        </Section>

        <Section spacing="md">
          <Container>
            <div className="mb-12 text-center">
              <Heading as="h2" size="lg" className="mb-4">
                Built for fintech &amp; rewards platforms
              </Heading>
              <Text variant="body-lg" tone="secondary" className="mx-auto max-w-2xl">
                One API call answers the question every wallet app needs: which card maximizes return for
                this purchase?
              </Text>
            </div>
            <FeatureGrid features={features} />
          </Container>
        </Section>

        <Section spacing="md">
          <Container>
            <Heading as="h2" size="lg" className="mb-8 text-center">
              What builders are saying
            </Heading>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <MotionFade key={t.author} delay={i * 100}>
                  <TestimonialCard {...t} />
                </MotionFade>
              ))}
            </div>
          </Container>
        </Section>

        <Section spacing="md">
          <Container size="narrow">
            <MotionFade>
              <div className="rounded-2xl border border-glass-border bg-glass-surface p-8 shadow-glass backdrop-blur-xl">
                <WaitlistForm />
              </div>
            </MotionFade>
          </Container>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
