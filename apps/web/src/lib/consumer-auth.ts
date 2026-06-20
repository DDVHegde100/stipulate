export interface ConsumerUser {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  onboardingComplete: boolean;
  walletCardIds: string[];
  notificationPrefs: { email: boolean; push: boolean };
}

const USER_KEY = 'stipulate_user';

function publicApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');
}

export function getStoredUser(): ConsumerUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsumerUser;
  } catch {
    return null;
  }
}

export function storeUser(user: ConsumerUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `stipulate_user_id=${user.id}; path=/; max-age=2592000; SameSite=Lax`;
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
  document.cookie = 'stipulate_user_id=; path=/; max-age=0';
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
  storeUser(json.data);
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
  storeUser(json.data);
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
  storeUser(json.data);
  return json.data;
}

export async function registerPushToken(userId: string, token: string | null): Promise<void> {
  const response = await fetch(`${publicApiBase()}/public/auth/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    credentials: 'include',
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    const json = (await response.json()) as { error?: { message: string } };
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }
}
