'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, GlassPanel, Heading, Input, Text } from '@stipulate/ui';

import { getStoredUser, updateProfile } from '../../../lib/consumer-auth';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London'];

export default function SettingsPage() {
  const user = getStoredUser();
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC');
  const [emailAlerts, setEmailAlerts] = useState(user?.notificationPrefs.email ?? true);
  const [pushAlerts, setPushAlerts] = useState(user?.notificationPrefs.push ?? false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setTimezone(user.timezone);
      setEmailAlerts(user.notificationPrefs.email);
      setPushAlerts(user.notificationPrefs.push);
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

      <Card className="p-6">
        <Heading as="h2" size="sm" className="mb-2">
          Billing
        </Heading>
        <Text tone="secondary" className="mb-4">
          Upgrade to Consumer Premium for full analytics and alerts.
        </Text>
        <Link href="/dashboard/billing">
          <Button variant="outline" size="sm">
            Manage billing
          </Button>
        </Link>
      </Card>
    </div>
  );
}
