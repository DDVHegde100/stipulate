import { describe, it, expect, vi } from 'vitest';
import {
  hashContent,
  hasContentChanged,
  reparseCard,
  ReparseScheduler,
  summarizeReparseBatch,
} from '../reparse.js';

describe('reparse scheduler', () => {
  it('hashes content deterministically', () => {
    const hash = hashContent('benefit guide v1');
    expect(hash).toHaveLength(64);
    expect(hashContent('benefit guide v1')).toBe(hash);
  });

  it('detects content changes via hash diff', () => {
    const hash = hashContent('updated guide');
    expect(hasContentChanged(hash, hashContent('old guide'))).toBe(true);
    expect(hasContentChanged(hash, hash)).toBe(false);
  });

  it('skips pipeline when content unchanged', async () => {
    const content = 'Chase Sapphire Preferred benefits';
    const hash = hashContent(content);

    const result = await reparseCard(
      {
        cardId: 'chase_sapphire_preferred',
        issuer: 'Chase',
        productName: 'Sapphire Preferred',
        sourceUrl: 'https://example.com/guide',
        lastContentHash: hash,
      },
      { fetchContent: async () => content },
    );

    expect(result.changed).toBe(false);
    expect(result.pipelineResult).toBeUndefined();
  });

  it('runs pipeline when content changed', async () => {
    const result = await reparseCard(
      {
        cardId: 'chase_sapphire_preferred',
        issuer: 'Chase',
        productName: 'Sapphire Preferred',
        sourceUrl: 'https://example.com/guide',
        lastContentHash: hashContent('old'),
      },
      { fetchContent: async () => 'Earn 3x on dining at restaurants.' },
    );

    expect(result.changed).toBe(true);
    expect(result.pipelineResult?.success).toBe(true);
  });

  it('processes batch via scheduler', async () => {
    const scheduler = new ReparseScheduler({
      fetchContent: async () => 'Earn 2x on travel purchases.',
    });

    scheduler.enqueue({
      cardId: 'test_card',
      issuer: 'Chase',
      productName: 'Test',
      sourceUrl: 'https://example.com/a',
    });

    const results = await scheduler.runAll();
    expect(results).toHaveLength(1);
    expect(summarizeReparseBatch(results).total).toBe(1);
  });
});
