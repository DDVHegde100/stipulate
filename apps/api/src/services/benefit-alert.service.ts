import { createChildLogger } from '../lib/logger.js';
import { listConsumersForCard } from '../repositories/consumer-user.repository.js';
import { isConsumerPremium } from '../repositories/consumer-billing.repository.js';
import { sendTransactionalEmail } from './email.service.js';
import { sendPushNotifications } from './push-notification.service.js';

const log = createChildLogger({ component: 'benefit-alert' });

export async function notifyConsumersOfBenefitChange(input: {
  cardId: string;
  cardName?: string;
  changeSummary: string;
  severity: string;
}): Promise<{ notified: number; pushed: number; skippedPush: number }> {
  const users = await listConsumersForCard(input.cardId);
  let notified = 0;
  let skippedPush = 0;
  const label = input.cardName ?? input.cardId;

  for (const user of users) {
    if (user.notification_prefs.email) {
      const sent = await sendTransactionalEmail({
        to: user.email,
        subject: `Benefit change · ${label}`,
        html: `
          <p>Hi${user.name ? ` ${user.name}` : ''},</p>
          <p>A benefit on <strong>${label}</strong> was updated (${input.severity}).</p>
          <p>${input.changeSummary}</p>
          <p><a href="https://stipulate.io/app/alerts">View the diff in Stipulate</a></p>
        `,
      });
      if (sent) notified++;
    }
  }

  const premiumPushTokens: string[] = [];
  for (const user of users) {
    if (!user.notification_prefs.push || !user.expo_push_token) continue;

    const premium = await isConsumerPremium(user.id);
    if (!premium) {
      skippedPush += 1;
      continue;
    }

    premiumPushTokens.push(user.expo_push_token);
  }

  const pushed = await sendPushNotifications({
    tokens: premiumPushTokens,
    title: `Benefit change · ${label}`,
    body: input.changeSummary,
    data: { cardId: input.cardId, severity: input.severity },
  });

  log.info(
    { cardId: input.cardId, notified, pushed, skippedPush, eligible: users.length },
    'Benefit alert notifications dispatched',
  );
  return { notified, pushed, skippedPush };
}
