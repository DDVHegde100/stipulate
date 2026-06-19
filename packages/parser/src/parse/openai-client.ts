import type {
  CompletionRequest,
  CompletionResponse,
  LLMClient,
} from '../types.js';

export interface OpenAILLMClientOptions {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  initialRetryDelayMs?: number;
  onUsage?: (usage: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }) => void;
}

/** Per-1M-token pricing for common models (USD). */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
};

function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4o-mini']!;
  return (
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output
  );
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Production OpenAI-compatible client with retries and cost tracking. */
export class OpenAILLMClient implements LLMClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly initialRetryDelayMs: number;
  private readonly onUsage?: OpenAILLMClientOptions['onUsage'];

  constructor(options: OpenAILLMClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.maxRetries = options.maxRetries ?? 3;
    this.initialRetryDelayMs = options.initialRetryDelayMs ?? 500;
    this.onUsage = options.onUsage;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            response_format: request.responseFormat,
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          if (isRetryableStatus(response.status) && attempt < this.maxRetries) {
            const delay = this.initialRetryDelayMs * 2 ** attempt;
            await sleep(delay);
            continue;
          }
          throw new Error(
            `LLM API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`,
          );
        }

        const data = (await response.json()) as {
          id: string;
          model: string;
          choices: Array<{
            message: { content: string };
            finish_reason: string;
          }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
          };
        };

        const rawUsage = data.usage;
        const usage = rawUsage
          ? {
              promptTokens: rawUsage.promptTokens ?? rawUsage.prompt_tokens ?? 0,
              completionTokens: rawUsage.completionTokens ?? rawUsage.completion_tokens ?? 0,
              totalTokens: rawUsage.totalTokens ?? rawUsage.total_tokens ?? 0,
            }
          : undefined;

        if (usage && this.onUsage) {
          this.onUsage({
            model: data.model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            estimatedCostUsd: estimateCostUsd(
              data.model,
              usage.promptTokens,
              usage.completionTokens,
            ),
          });
        }

        return {
          id: data.id,
          model: data.model,
          content: data.choices[0]?.message.content ?? '',
          usage,
          finishReason: data.choices[0]?.finish_reason as CompletionResponse['finishReason'],
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          await sleep(this.initialRetryDelayMs * 2 ** attempt);
          continue;
        }
      }
    }

    throw lastError ?? new Error('LLM request failed after retries');
  }
}

/** Create a production OpenAI client from environment-style config. */
export function createProductionLLMClient(
  apiKey: string,
  baseUrl?: string,
  onUsage?: OpenAILLMClientOptions['onUsage'],
): LLMClient {
  return new OpenAILLMClient({ apiKey, baseUrl, onUsage });
}
