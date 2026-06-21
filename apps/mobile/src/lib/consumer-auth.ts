import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface ConsumerUser {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  onboardingComplete: boolean;
  walletCardIds: string[];
  notificationPrefs: { email: boolean; push: boolean };
}

const USER_KEY = '@stipulate/consumer_user';

function publicApiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  const apiUrl = extra?.apiUrl ?? 'http://localhost:3000/v1';
  return apiUrl.replace(/\/v1$/, '');
}

export async function getStoredUser(): Promise<ConsumerUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsumerUser;
  } catch {
    return null;
  }
}

export async function storeUser(user: ConsumerUser): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function signup(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<ConsumerUser> {
  const response = await fetch(`${publicApiBase()}/public/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await response.json()) as { data: ConsumerUser; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  await storeUser(json.data);
  return json.data;
}

export async function login(input: { email: string; password: string }): Promise<ConsumerUser> {
  const response = await fetch(`${publicApiBase()}/public/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await response.json()) as { data: ConsumerUser; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  await storeUser(json.data);
  return json.data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<{
    name: string;
    timezone: string;
    onboardingComplete: boolean;
    walletCardIds: string[];
    notificationPrefs: { email: boolean; push: boolean };
  }>,
): Promise<ConsumerUser> {
  const response = await fetch(`${publicApiBase()}/public/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    credentials: 'include',
    body: JSON.stringify(patch),
  });
  const json = (await response.json()) as { data: ConsumerUser; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  await storeUser(json.data);
  return json.data;
}

export async function downloadConsumerExport(): Promise<Record<string, unknown>> {
  const user = await getStoredUser();
  if (!user) throw new Error('Not signed in');

  const response = await fetch(`${publicApiBase()}/public/auth/export`, {
    headers: { 'X-User-Id': user.id },
    credentials: 'include',
  });

  const json = (await response.json()) as {
    data: Record<string, unknown>;
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  return json.data;
}

export async function scheduleConsumerDeletion(): Promise<{ scheduledFor: string }> {
  const user = await getStoredUser();
  if (!user) throw new Error('Not signed in');

  const response = await fetch(`${publicApiBase()}/public/auth/delete`, {
    method: 'POST',
    headers: { 'X-User-Id': user.id },
    credentials: 'include',
  });

  const json = (await response.json()) as {
    data: { scheduledFor: string };
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  await clearUser();
  return { scheduledFor: json.data.scheduledFor };
}

export async function fetchConsumerDeletionStatus(): Promise<{
  scheduledFor: string;
  status: string;
} | null> {
  const user = await getStoredUser();
  if (!user) throw new Error('Not signed in');

  const response = await fetch(`${publicApiBase()}/public/auth/delete`, {
    headers: { 'X-User-Id': user.id },
    credentials: 'include',
  });

  const json = (await response.json()) as {
    data: { scheduledFor: string; status: string } | null;
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  return json.data;
}

export async function cancelConsumerDeletion(): Promise<void> {
  const user = await getStoredUser();
  if (!user) throw new Error('Not signed in');

  const response = await fetch(`${publicApiBase()}/public/auth/delete/cancel`, {
    method: 'POST',
    headers: { 'X-User-Id': user.id },
    credentials: 'include',
  });

  const json = (await response.json()) as { error?: { message: string } };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }
}
