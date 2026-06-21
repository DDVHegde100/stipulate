'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, GlassPanel, Heading, Input, Text } from '@stipulate/ui';

import { getStoredUser, updateProfile, downloadConsumerExport } from '../../../lib/consumer-auth';
import { fetchConsumerBillingStatus, startConsumerCheckout, startConsumerPortal } from '../../../lib/consumer-billing';
import { PlaidConnectPanel } from '../../../components/PlaidConnectPanel';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London'];

export default function SettingsPage() {
  const user = getStoredUser();
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC');
  const [emailAlerts, setEmailAlerts] = useState(user?.notificationPrefs.email ?? true);
  const [pushAlerts, setPushAlerts] = useState(user?.notificationPrefs.push ?? false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<{ plan: string; status: string; isPremium: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setTimezone(user.timezone);
      setEmailAlerts(user.notificationPrefs.email);
      setPushAlerts(user.notificationPrefs.push);
      void fetchConsumerBillingStatus()
        .then(setBillingStatus)
        .catch(() => setBillingStatus(null));
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user.id, {
        name,
        timezone,
        notificationPrefs: { email: emailAlerts, push: pushAlerts },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <GlassPanel>
        <Text tone="secondary">Sign in to manage settings.</Text>
        <Link href="/login" className="mt-4 inline-block text-accent-400 hover:underline">
          Sign in
        </Link>
      </GlassPanel>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <Text variant="overline" tone="secondary">
          Account
        </Text>
        <Heading as="h1" size="lg">
          Settings
        </Heading>
      </div>

      <GlassPanel className="space-y-4">
        <div>
          <Text variant="overline" tone="secondary" className="mb-2 block">
            Email
          </Text>
          <Input value={user.email} disabled />
        </div>
        <div>
          <Text variant="overline" tone="secondary" className="mb-2 block">
            Display name
          </Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Text variant="overline" tone="secondary" className="mb-2 block">
            Timezone
          </Text>
          <select
            className="w-full rounded-xl border border-glass-border bg-ink-900 px-4 py-2.5 text-sm text-white"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
            className="accent-accent-500"
          />
          <Text variant="body-sm">Email benefit change alerts</Text>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={pushAlerts}
            onChange={(e) => setPushAlerts(e.target.checked)}
            className="accent-accent-500"
          />
          <Text variant="body-sm">Push alerts (mobile app)</Text>
        </label>
        <Button onClick={() => void handleSave()} disabled={loading}>
          {saved ? 'Saved!' : loading ? 'Saving…' : 'Save changes'}
        </Button>
      </GlassPanel>

      <PlaidConnectPanel />

      <Card className="p-6">
        <Heading as="h2" size="sm" className="mb-2">
          Billing
        </Heading>
        {billingStatus?.isPremium ? (
          <Text tone="secondary" className="mb-4">
            Consumer Premium is active ({billingStatus.status}).
          </Text>
        ) : billingStatus?.status === 'canceled' ? (
          <Text tone="secondary" className="mb-4">
            Your premium subscription was canceled. Resubscribe to restore full analytics and alerts.
          </Text>
        ) : (
          <Text tone="secondary" className="mb-4">
            Upgrade to Consumer Premium for full analytics and alerts.
          </Text>
        )}
        <div className="flex flex-wrap gap-3">
          {!billingStatus?.isPremium ? (
            <Button
              size="sm"
              disabled={billingLoading}
              onClick={() => {
                setBillingLoading(true);
                void startConsumerCheckout({
                  successUrl: `${window.location.origin}/app/settings?billing=success`,
                  cancelUrl: `${window.location.origin}/app/settings?billing=cancel`,
                })
                  .then((session) => {
                    window.location.href = session.url;
                  })
                  .catch(() => setBillingLoading(false));
              }}
            >
              {billingLoading ? 'Redirecting…' : 'Upgrade with Stripe'}
            </Button>
          ) : (
            <Text variant="body-sm" tone="secondary">
              Plan: {billingStatus.plan}
            </Text>
          )}
          {billingStatus?.isPremium ? (
            <Button
              variant="outline"
              size="sm"
              disabled={billingLoading}
              onClick={() => {
                setBillingLoading(true);
                void startConsumerPortal({ returnUrl: `${window.location.origin}/app/settings` })
                  .then((session) => {
                    window.location.href = session.url;
                  })
                  .catch(() => setBillingLoading(false));
              }}
            >
              {billingLoading ? 'Opening…' : 'Manage subscription'}
            </Button>
          ) : null}
          <Link href="/dashboard/billing">
            <Button variant="outline" size="sm">
              Developer billing
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="p-6">
        <Heading as="h2" size="sm" className="mb-2">
          Privacy
        </Heading>
        <Text tone="secondary" className="mb-4">
          Download a JSON bundle of your profile, wallet, linked accounts, and subscription data.
        </Text>
        <Button
          variant="outline"
          size="sm"
          disabled={exportLoading}
          onClick={() => {
            setExportLoading(true);
            void downloadConsumerExport()
              .then((bundle) => {
                const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `stipulate-export-${new Date().toISOString().slice(0, 10)}.json`;
                link.click();
                URL.revokeObjectURL(url);
              })
              .finally(() => setExportLoading(false));
          }}
        >
          {exportLoading ? 'Preparing…' : 'Download my data'}
        </Button>
      </Card>
    </div>
  );
}
