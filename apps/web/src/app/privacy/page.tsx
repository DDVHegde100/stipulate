import type { Metadata } from 'next';
import { Footer, Heading, NavBar, Text } from '@stipulate/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Stipulate collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-ink-950">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Text variant="overline" tone="secondary">
          Legal
        </Text>
        <Heading as="h1" size="lg" className="mb-2">
          Privacy Policy
        </Heading>
        <Text tone="secondary" className="mb-8">
          Last updated: June 19, 2026
        </Text>

        <div className="space-y-8 text-sm leading-relaxed text-ink-200">
          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Overview
            </Heading>
            <Text tone="secondary">
              Stipulate, Inc. (&quot;Stipulate&quot;, &quot;we&quot;) provides card benefit intelligence for
              consumers and developers. This policy describes how we handle personal data when you use
              stipulate.io, our API, and mobile apps.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Data we collect
            </Heading>
            <Text tone="secondary">
              Account email and profile settings; wallet card selections; optional bank link metadata via
              Plaid (we do not store bank credentials); routing and analytics derived from your usage;
              billing status from Stripe; device push tokens when you opt in to alerts.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              How we use data
            </Heading>
            <Text tone="secondary">
              We use your data to route purchases, track benefit caps, send benefit-change alerts you
              request, operate billing, improve the catalog, and comply with law. We do not sell personal
              data.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Your rights
            </Heading>
            <Text tone="secondary">
              Export your data or schedule account deletion from Settings (web or mobile). Deletion runs
              after a 30-day grace period. Contact{' '}
              <a href="mailto:privacy@stipulate.io" className="text-accent-400 hover:underline">
                privacy@stipulate.io
              </a>{' '}
              for other requests.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Processors
            </Heading>
            <Text tone="secondary">
              We use Stripe (payments), Plaid (bank linking), Resend (email), Expo (push), PostHog
              (product analytics), and Sentry (error monitoring). Each operates under its own privacy
              terms.
            </Text>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
