import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/** Configure foreground notifications and deep-link taps to Alerts. */
export function NotificationBootstrap() {
  const router = useRouter();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const cardId = response.notification.request.content.data?.cardId;
      if (typeof cardId === 'string') {
        router.push(`/(tabs)/alerts?cardId=${encodeURIComponent(cardId)}`);
        return;
      }
      router.push('/(tabs)/alerts');
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}
