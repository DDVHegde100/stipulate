export function demoApiKey(): string {
  return process.env.NEXT_PUBLIC_DEMO_API_KEY ?? 'stip_dev_local_key_change_in_production';
}

export function apiV1Base(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
}

export async function demoApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiV1Base()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': demoApiKey(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = (await response.json()) as { data: T; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data;
}
