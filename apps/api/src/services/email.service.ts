import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger({ component: 'email' });

let emailsAttempted = 0;
let emailsDelivered = 0;

export function isEmailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getEmailDeliveryStats(): { attempted: number; delivered: number } {
  return { attempted: emailsAttempted, delivered: emailsDelivered };
}

/** Send transactional email via Resend HTTP API (best-effort). */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  emailsAttempted += 1;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || process.env.NODE_ENV === 'test') {
    log.info({ to: input.to, subject: input.subject }, 'Email skipped (no provider or test mode)');
    emailsDelivered += 1;
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'Stipulate <hello@stipulate.io>',
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!response.ok) {
      log.warn({ status: response.status }, 'Resend API error');
      return false;
    }

    emailsDelivered += 1;
    return true;
  } catch (error) {
    log.warn({ err: error }, 'Failed to send email');
    return false;
  }
}

export async function sendWaitlistConfirmation(email: string): Promise<void> {
  await sendTransactionalEmail({
    to: email,
    subject: 'You are on the Stipulate waitlist',
    html: `<p>Thanks for joining the Stipulate waitlist. We will reach out when API access opens for your team.</p>`,
  });
}
