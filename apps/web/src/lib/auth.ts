const API_KEY_COOKIE = 'stipulate_api_key';

export function getStoredApiKey(): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${API_KEY_COOKIE}=`))
    ?.split('=')[1] ?? null;
}

export function storeApiKey(apiKey: string): void {
  document.cookie = `${API_KEY_COOKIE}=${encodeURIComponent(apiKey)}; path=/; max-age=2592000; SameSite=Lax`;
}

export function clearApiKey(): void {
  document.cookie = `${API_KEY_COOKIE}=; path=/; max-age=0`;
}

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = getStoredApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (apiKey) headers['X-API-Key'] = decodeURIComponent(apiKey);

  const response = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers });
  const json = (await response.json()) as { data: T; error?: { message: string } };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  return json.data;
}
