import type {
  BatchRouteRequest,
  BatchRouteResponse,
  BenefitChangelogResponse,
  CardCatalogResponse,
  CardBenefitsResponse,
  EnrichRequest,
  EnrichResponse,
  PointsValuationTable,
  ProxyPayRequest,
  ProxyPayResponse,
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

  async listCards(query: { q?: string; limit?: number } = {}): Promise<CardCatalogResponse> {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return this.get<CardCatalogResponse>(`/cards${qs ? `?${qs}` : ''}`);
  }

  async getCardBenefits(cardId: string, query: { asOf?: string; version?: number } = {}): Promise<CardBenefitsResponse> {
    const params = new URLSearchParams();
    if (query.asOf) params.set('as_of', query.asOf);
    if (query.version) params.set('version', String(query.version));
    const qs = params.toString();
    return this.get<CardBenefitsResponse>(`/cards/${encodeURIComponent(cardId)}/benefits${qs ? `?${qs}` : ''}`);
  }

  async getChangelog(query: { limit?: number; cursor?: string; cardId?: string } = {}): Promise<BenefitChangelogResponse> {
    const params = new URLSearchParams();
    if (query.limit) params.set('limit', String(query.limit));
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.cardId) params.set('card_id', query.cardId);
    const qs = params.toString();
    return this.get<BenefitChangelogResponse>(`/changelog${qs ? `?${qs}` : ''}`);
  }

  async getValuations(): Promise<PointsValuationTable> {
    return this.get<PointsValuationTable>('/valuations');
  }

  async getUsage(): Promise<{
    periodStart: string;
    totalCalls: number;
    totalCostUsd: number;
    plan: string;
  }> {
    return this.get('/usage');
  }

  async listWebhookSubscriptions(): Promise<Array<{ id: string; url: string; events: string[]; is_active: boolean }>> {
    return this.get('/webhooks');
  }

  async listWebhookDeliveries(limit = 50): Promise<{
    deliveries: Array<{
      id: string;
      url: string;
      event_id: string;
      status: string;
      attempts: number;
      response_status: number | null;
    }>;
  }> {
    return this.get(`/webhooks/deliveries?limit=${limit}`);
  }

  async getOrgAuditLog(limit = 50): Promise<{
    events: Array<{ id: string; action: string; resource_type?: string; created_at: string }>;
  }> {
    return this.get(`/org/audit?limit=${limit}`);
  }

  async createWebhookSubscription(input: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<{ id: string; url: string; secret?: string }> {
    return this.post('/webhooks', input);
  }

  async deleteWebhookSubscription(id: string): Promise<{ revoked: boolean }> {
    return this.delete(`/webhooks/${encodeURIComponent(id)}`);
  }

  async listApiKeys(): Promise<Array<{ id: string; prefix: string; name: string; is_active: boolean }>> {
    return this.get('/keys');
  }

  async createApiKey(input: { name: string; scopes?: string[] }): Promise<{ apiKey: string; prefix: string }> {
    return this.post('/keys', input);
  }

  async revokeApiKey(id: string): Promise<{ revoked: boolean }> {
    return this.delete(`/keys/${encodeURIComponent(id)}`);
  }

  async getSpendSummary(query: { userRef: string; cardIds: string[] }): Promise<{
    caps: Array<{ cardId: string; category: string; spentMinor: number }>;
  }> {
    const params = new URLSearchParams({
      user_ref: query.userRef,
      card_ids: query.cardIds.join(','),
    });
    return this.get(`/spend/summary?${params}`);
  }

  async createBillingCheckout(input: {
    plan: 'payg' | 'saas';
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    return this.post('/billing/checkout', {
      plan: input.plan,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
  }

  async createBillingPortal(returnUrl: string): Promise<{ url: string }> {
    return this.post(`/billing/portal?return_url=${encodeURIComponent(returnUrl)}`, {});
  }

  async submitEnrichCorrection(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post('/enrich/corrections', input);
  }

  async proxyPay(request: ProxyPayRequest): Promise<ProxyPayResponse> {
    return this.post<ProxyPayResponse>('/proxy-pay', request);
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

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      headers: { 'X-API-Key': this.apiKey },
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

  private async delete<T>(path: string): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': this.apiKey },
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
