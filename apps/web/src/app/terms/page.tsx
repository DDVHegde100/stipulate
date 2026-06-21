import type { Metadata } from 'next';
import { Footer, Heading, NavBar, Text } from '@stipulate/ui';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of Stipulate products and services.',
};

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-ink-950">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Text variant="overline" tone="secondary">
          Legal
        </Text>
        <Heading as="h1" size="lg" className="mb-2">
          Terms of Service
        </Heading>
        <Text tone="secondary" className="mb-8">
          Last updated: June 19, 2026
        </Text>

        <div className="space-y-8 text-sm leading-relaxed text-ink-200">
          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Agreement
            </Heading>
            <Text tone="secondary">
              By using Stipulate&apos;s website, API, or mobile apps, you agree to these terms. If you use
              the API on behalf of an organization, you represent that you have authority to bind that
              organization.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Service
            </Heading>
            <Text tone="secondary">
              Stipulate parses issuer benefit information and recommends card routing. Recommendations are
              informational only — we do not guarantee reward eligibility, issuer approval, or merchant
              category coding.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Accounts & billing
            </Heading>
            <Text tone="secondary">
              You are responsible for account security. Consumer Premium and developer plans bill through
              Stripe. Fees are non-refundable except where required by law. Cancel subscriptions via the
              billing portal before renewal to avoid future charges.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Acceptable use
            </Heading>
            <Text tone="secondary">
              Do not abuse the API, scrape at rates that impair service, reverse engineer proprietary
              models, or use Stipulate for unlawful activity. We may suspend accounts that violate these
              terms.
            </Text>
          </section>

          <section>
            <Heading as="h2" size="sm" className="mb-2">
              Contact
            </Heading>
            <Text tone="secondary">
              Questions about these terms:{' '}
              <a href="mailto:legal@stipulate.io" className="text-accent-400 hover:underline">
                legal@stipulate.io
              </a>
              .
            </Text>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
