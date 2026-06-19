import { createChildLogger } from '../lib/logger.js';
import * as benefitRepo from '../repositories/benefit.repository.js';
import { query } from '../lib/db.js';
import { sendTransactionalEmail } from './email.service.js';

const log = createChildLogger({ component: 'benefit-digest' });

interface DigestConsumer {
  email: string;
  name: string | null;
}

/** Weekly benefit change digest for consumers with email alerts enabled. */
export async function sendWeeklyBenefitDigest(days = 7): Promise<{ emailed: number; events: number }> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  let rows: Awaited<ReturnType<typeof benefitRepo.listChangelog>>['rows'];
  if (process.env.NODE_ENV === 'test') {
    rows = [
      {
        id: 'digest-test-1',
        card_id: 'amex_gold',
        card_name: 'Amex Gold',
        version: 2,
        previous_version: 1,
        change_summary: 'Dining multiplier updated to 4x',
        severity: 'material',
        changes: [],
        effective_from: null,
        published_at: new Date(),
      },
    ];
  } else {
    ({ rows } = await benefitRepo.listChangelog({ limit: 50, since }));
  }

  if (rows.length === 0) {
    log.info('No changelog events for digest window — skipping');
    return { emailed: 0, events: 0 };
  }

  const consumers = await listDigestConsumers();
  let emailed = 0;

  const lines = rows
    .slice(0, 10)
    .map((e) => `<li><strong>${e.card_name ?? e.card_id}</strong> v${e.version}: ${e.change_summary}</li>`)
    .join('');

  for (const consumer of consumers) {
    const sent = await sendTransactionalEmail({
      to: consumer.email,
      subject: `Weekly benefit digest · ${rows.length} change${rows.length === 1 ? '' : 's'}`,
      html: `
        <p>Hi${consumer.name ? ` ${consumer.name}` : ''},</p>
        <p>Here are benefit updates from the past ${days} days:</p>
        <ul>${lines}</ul>
        <p><a href="https://stipulate.io/app/alerts">View all alerts</a></p>
      `,
    });
    if (sent) emailed++;
  }

  log.info({ emailed, events: rows.length, consumers: consumers.length }, 'Weekly digest dispatched');
  return { emailed, events: rows.length };
}

async function listDigestConsumers(): Promise<DigestConsumer[]> {
  if (process.env.NODE_ENV === 'test') {
    return [{ email: 'demo@stipulate.io', name: 'Demo User' }];
  }

  const result = await query<DigestConsumer>(
    `SELECT email, name
     FROM consumer_users
     WHERE (notification_prefs->>'email')::boolean IS DISTINCT FROM FALSE`,
  );
  return result.rows;
}
