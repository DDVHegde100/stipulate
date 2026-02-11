import { createHash } from 'node:crypto';
import type { PipelineResult } from '../types.js';
import { runBenefitPipeline } from '../pipeline/runner.js';

export interface ReparseTarget {
  cardId: string;
  issuer: string;
  productName: string;
  sourceUrl: string;
  lastContentHash?: string;
  lastParsedAt?: string;
}

export interface ReparseJobResult {
  cardId: string;
  sourceUrl: string;
  contentHash: string;
  changed: boolean;
  previousHash?: string;
  pipelineResult?: PipelineResult;
  error?: string;
  durationMs: number;
}

export interface ReparseSchedulerOptions {
  fetchContent?: (url: string) => Promise<string>;
  onJobComplete?: (result: ReparseJobResult) => void;
  llmModel?: string;
}

/** Compute SHA-256 content hash for change detection. */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Detect whether benefit page content has changed since last parse. */
export function hasContentChanged(currentHash: string, previousHash?: string): boolean {
  if (!previousHash) return true;
  return currentHash !== previousHash;
}

/** Fetch and hash a benefit guide URL (stub-friendly). */
export async function fetchAndHash(
  url: string,
  fetchFn?: (url: string) => Promise<string>,
): Promise<{ content: string; hash: string }> {
  let content: string;

  if (fetchFn) {
    content = await fetchFn(url);
  } else {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'StipulateBot/0.1 (+https://stipulate.io/bot)' },
        signal: AbortSignal.timeout(15000),
      });
      content = response.ok ? await response.text() : '';
    } catch {
      content = '';
    }
  }

  return { content, hash: hashContent(content || url) };
}

/** Run re-parse for a single card target. */
export async function reparseCard(
  target: ReparseTarget,
  options: ReparseSchedulerOptions = {},
): Promise<ReparseJobResult> {
  const start = Date.now();

  try {
    const { content, hash } = await fetchAndHash(target.sourceUrl, options.fetchContent);
    const changed = hasContentChanged(hash, target.lastContentHash);

    if (!changed) {
      return {
        cardId: target.cardId,
        sourceUrl: target.sourceUrl,
        contentHash: hash,
        changed: false,
        previousHash: target.lastContentHash,
        durationMs: Date.now() - start,
      };
    }

    const pipelineResult = await runBenefitPipeline(
      {
        issuer: target.issuer,
        cardId: target.cardId,
        productName: target.productName,
        sourceUrl: target.sourceUrl,
        llmModel: options.llmModel ?? 'gpt-4o-mini',
        skipExtraction: false,
      },
      { sourceHtml: content || undefined, sourceText: content || undefined },
    );

    const result: ReparseJobResult = {
      cardId: target.cardId,
      sourceUrl: target.sourceUrl,
      contentHash: hash,
      changed: true,
      previousHash: target.lastContentHash,
      pipelineResult,
      durationMs: Date.now() - start,
    };

    options.onJobComplete?.(result);
    return result;
  } catch (error) {
    return {
      cardId: target.cardId,
      sourceUrl: target.sourceUrl,
      contentHash: '',
      changed: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start,
    };
  }
}

/** Batch re-parse scheduler for weekly catalog refresh. */
export class ReparseScheduler {
  private readonly queue: ReparseTarget[] = [];
  private running = false;

  constructor(private readonly options: ReparseSchedulerOptions = {}) {}

  enqueue(target: ReparseTarget): void {
    this.queue.push(target);
  }

  enqueueAll(targets: ReparseTarget[]): void {
    this.queue.push(...targets);
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  /** Process all queued targets sequentially. */
  async runAll(): Promise<ReparseJobResult[]> {
    if (this.running) throw new Error('Scheduler already running');
    this.running = true;
    const results: ReparseJobResult[] = [];

    try {
      while (this.queue.length > 0) {
        const target = this.queue.shift()!;
        const result = await reparseCard(target, this.options);
        results.push(result);
      }
      return results;
    } finally {
      this.running = false;
    }
  }

  /** Process queue with concurrency limit. */
  async runConcurrent(limit = 3): Promise<ReparseJobResult[]> {
    if (this.running) throw new Error('Scheduler already running');
    this.running = true;

    try {
      const results: ReparseJobResult[] = [];
      const batch = [...this.queue];
      this.queue.length = 0;

      for (let i = 0; i < batch.length; i += limit) {
        const chunk = batch.slice(i, i + limit);
        const chunkResults = await Promise.all(
          chunk.map((target) => reparseCard(target, this.options)),
        );
        results.push(...chunkResults);
      }

      return results;
    } finally {
      this.running = false;
    }
  }
}

/** Summarize re-parse batch for changelog/webhook emission. */
export function summarizeReparseBatch(results: ReparseJobResult[]): {
  total: number;
  changed: number;
  unchanged: number;
  failed: number;
  cardIds: string[];
} {
  return {
    total: results.length,
    changed: results.filter((r) => r.changed && !r.error).length,
    unchanged: results.filter((r) => !r.changed && !r.error).length,
    failed: results.filter((r) => r.error).length,
    cardIds: results.filter((r) => r.changed).map((r) => r.cardId),
  };
}
