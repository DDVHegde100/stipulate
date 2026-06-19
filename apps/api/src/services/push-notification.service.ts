import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger({ component: 'push' });

/** Send push notifications via the Expo Push API (best-effort). */
export async function sendPushNotifications(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<number> {
  const tokens = [...new Set(input.tokens.filter(Boolean))];
  if (tokens.length === 0) return 0;

  if (process.env.NODE_ENV === 'test') {
    log.info({ count: tokens.length, title: input.title }, 'Push skipped (test mode)');
    return tokens.length;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(
        tokens.map((token) => ({
          to: token,
          title: input.title,
          body: input.body,
          data: input.data,
          sound: 'default',
        })),
      ),
    });

    if (!response.ok) {
      log.warn({ status: response.status }, 'Expo push API error');
      return 0;
    }

    const json = (await response.json()) as { data?: Array<{ status?: string }> };
    const delivered = (json.data ?? []).filter((item) => item.status === 'ok').length;
    log.info({ requested: tokens.length, delivered, title: input.title }, 'Push notifications sent');
    return delivered;
  } catch (error) {
    log.warn({ err: error }, 'Failed to send push notifications');
    return 0;
  }
}
