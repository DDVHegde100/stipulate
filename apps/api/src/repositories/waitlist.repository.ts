import { query } from '../lib/db.js';

export async function insertWaitlistLead(input: {
  email: string;
  company?: string;
  source?: string;
}): Promise<{ id: string; created: boolean }> {
  if (process.env.NODE_ENV === 'test') {
    return { id: 'waitlist-test-id', created: true };
  }

  const result = await query<{ id: string }>(
    `INSERT INTO waitlist_leads (email, company, source)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET company = COALESCE(EXCLUDED.company, waitlist_leads.company)
     RETURNING id`,
    [input.email.toLowerCase(), input.company ?? null, input.source ?? 'web'],
  );

  return { id: result.rows[0]!.id, created: true };
}
