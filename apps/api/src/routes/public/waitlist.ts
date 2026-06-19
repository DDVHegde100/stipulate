import { Hono } from 'hono';
import { z } from 'zod';

import * as waitlistRepo from '../../repositories/waitlist.repository.js';
import { sendWaitlistConfirmation } from '../../services/email.service.js';
import { trackEvent } from '../../lib/observability.js';

const WaitlistSchema = z.object({
  email: z.string().email(),
  company: z.string().max(256).optional(),
});

export const waitlistHandler = new Hono();

waitlistHandler.post('/', async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = WaitlistSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Valid email required' } }, 422);
  }

  const lead = await waitlistRepo.insertWaitlistLead({
    email: parsed.data.email,
    company: parsed.data.company,
    source: 'web',
  });

  void sendWaitlistConfirmation(parsed.data.email);
  void trackEvent('waitlist.signup', { email: parsed.data.email, company: parsed.data.company });

  return c.json({ data: { id: lead.id, message: 'Thanks — you are on the waitlist.' } }, 201);
});
