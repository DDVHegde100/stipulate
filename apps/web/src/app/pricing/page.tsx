import Link from 'next/link';
import {
  Badge,
  Button,
  Container,
  Footer,
  Heading,
  MotionFade,
  NavBar,
  PricingCard,
  Section,
  Text,
} from '@stipulate/ui';

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-mesh">
      <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden />
      <NavBar />

      <main>
        <Section spacing="lg">
          <Container className="text-center">
            <MotionFade>
              <Badge variant="accent" className="mb-4">
                Simple pricing
              </Badge>
              <Heading as="h1" size="lg" className="mb-4">
                Pay for what you route
              </Heading>
              <Text variant="body-lg" tone="secondary" className="mx-auto max-w-2xl">
                Start free, scale with API calls, or unlock unlimited routing with SaaS.
              </Text>
            </MotionFade>
          </Container>
        </Section>

        <Section spacing="md">
          <Container>
            <div className="grid gap-8 lg:grid-cols-3">
              <MotionFade delay={0}>
                <PricingCard
                  name="API"
                  price="$0.001"
                  period="/call"
                  description="Pay-as-you-go routing for integrators"
                  features={[
                    'POST /v1/route & /enrich',
                    '200+ card catalog',
                    'Org-scoped API keys',
                    'Usage metering dashboard',
                  ]}
                  cta={
                    <Link href="/signup">
                      <Button className="w-full" variant="outline">
                        Start building
                      </Button>
                    </Link>
                  }
                />
              </MotionFade>

              <MotionFade delay={100}>
                <PricingCard
                  name="SaaS"
                  price="$299"
                  description="Unlimited calls for production apps"
                  highlighted
                  features={[
                    'Unlimited API calls',
                    'Benefit-change webhooks',
                    'White-label config flags',
                    'Priority support',
                  ]}
                  cta={
                    <Link href="/dashboard/billing">
                      <Button className="w-full">Upgrade to SaaS</Button>
                    </Link>
                  }
                />
              </MotionFade>

              <MotionFade delay={200}>
                <PricingCard
                  name="Consumer"
                  price="$3.99"
                  description="Full wallet app for power users"
                  features={[
                    'All 200+ cards in wallet',
                    'Spend analytics & cap tracking',
                    'Benefit change alerts',
                    'Push notification nudges',
                  ]}
                  cta={
                    <Link href="/app/wallet">
                      <Button className="w-full" variant="outline">
                        Open wallet
                      </Button>
                    </Link>
                  }
                />
              </MotionFade>
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
