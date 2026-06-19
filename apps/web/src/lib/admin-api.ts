const ADMIN_KEY_COOKIE = 'stipulate_admin_key';

export function getStoredAdminKey(): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${ADMIN_KEY_COOKIE}=`))
    ?.split('=')[1] ?? null;
}

export function storeAdminKey(key: string): void {
  document.cookie = `${ADMIN_KEY_COOKIE}=${encodeURIComponent(key)}; path=/; max-age=86400; SameSite=Lax`;
}

export function adminApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const adminKey = getStoredAdminKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (adminKey) headers['X-Admin-Key'] = decodeURIComponent(adminKey);

  const response = await fetch(`${adminApiBaseUrl()}${path}`, { ...init, headers });
  const json = (await response.json()) as { data: T; error?: { message: string } };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  return json.data;
}
