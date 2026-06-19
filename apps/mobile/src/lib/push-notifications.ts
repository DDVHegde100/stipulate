import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');

/** Request notification permission and obtain the Expo push token. */
export async function obtainPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    return process.env.EXPO_PUBLIC_PUSH_TOKEN ?? null;
  }
}

/** Register or clear the Expo push token for the signed-in user. */
export async function syncPushToken(userId: string, enabled: boolean): Promise<void> {
  const token = enabled ? (await obtainPushToken()) ?? process.env.EXPO_PUBLIC_PUSH_TOKEN ?? null : null;

  const response = await fetch(`${API_BASE}/public/auth/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`Push token sync failed: ${response.status}`);
  }
}
