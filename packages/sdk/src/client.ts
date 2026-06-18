import type {
  BatchRouteRequest,
  BatchRouteResponse,
  EnrichRequest,
  EnrichResponse,
  RouteRequest,
  RouteResponse,
} from '@stipulate/schema';

export interface StipulateClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface StipulateApiEnvelope<T> {
  data: T;
  requestId: string;
}

export class StipulateError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'StipulateError';
  }
}

/** Production-grade HTTP client for the Stipulate card benefit API. */
export class StipulateClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: StipulateClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.stipulate.io/v1').replace(/\/$/, '');
    this.fetchFn = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async route(request: RouteRequest): Promise<RouteResponse> {
    return this.post<RouteResponse>('/route', request);
  }

  async routeBatch(request: BatchRouteRequest): Promise<BatchRouteResponse> {
    return this.post<BatchRouteResponse>('/route/batch', request);
  }

  async enrich(request: EnrichRequest): Promise<EnrichResponse> {
    return this.post<EnrichResponse>('/enrich', request);
  }

  async getOpenApiSpec(): Promise<string> {
    const response = await this.fetchFn(`${this.baseUrl}/openapi`, {
      headers: { 'X-API-Key': this.apiKey },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new StipulateError('Failed to fetch OpenAPI spec', response.status);
    }
    return response.text();
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const json = (await response.json()) as StipulateApiEnvelope<T> & {
      error?: { code: string; message: string };
      requestId?: string;
    };

    if (!response.ok) {
      throw new StipulateError(
        json.error?.message ?? `HTTP ${response.status}`,
        response.status,
        json.error?.code,
        json.requestId,
      );
    }

    return json.data;
  }
}

export { StipulateClient as default };
