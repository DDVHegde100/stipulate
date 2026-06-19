import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAILLMClient } from '../openai-client.js';

describe('OpenAILLMClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed completion on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'cmpl-1',
          model: 'gpt-4o-mini',
          choices: [{ message: { content: '{"benefits":[]}' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }),
        { status: 200 },
      ),
    );

    const client = new OpenAILLMClient({ apiKey: 'sk-test', maxRetries: 0 });
    const result = await client.complete({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'parse this' }],
    });

    expect(result.content).toBe('{"benefits":[]}');
    expect(result.usage?.totalTokens).toBe(150);
  });

  it('retries on 429 and succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'cmpl-2',
            model: 'gpt-4o-mini',
            choices: [{ message: { content: '{}' }, finish_reason: 'stop' }],
          }),
          { status: 200 },
        ),
      );

    const client = new OpenAILLMClient({ apiKey: 'sk-test', maxRetries: 2, initialRetryDelayMs: 1 });
    const result = await client.complete({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result.id).toBe('cmpl-2');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('invokes onUsage callback with cost estimate', async () => {
    const onUsage = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'cmpl-3',
          model: 'gpt-4o-mini',
          choices: [{ message: { content: '{}' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
        }),
        { status: 200 },
      ),
    );

    const client = new OpenAILLMClient({ apiKey: 'sk-test', onUsage, maxRetries: 0 });
    await client.complete({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'x' }] });

    expect(onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ totalTokens: 1500, estimatedCostUsd: expect.any(Number) }),
    );
  });
});
