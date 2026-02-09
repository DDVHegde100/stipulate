import { describe, it, expect } from 'vitest';
import { runExtractionPipeline, scoreExtractionQuality } from '../pipeline.js';
import { normalizeMarkdown, markdownToBlocks } from '../markdown.js';

describe('extraction pipeline', () => {
  it('extracts from markdown source', async () => {
    const md = `# Dining\n\nEarn 3x points on dining purchases.\n\n## Travel\n\nEarn 2x on travel.`;
    const result = await runExtractionPipeline(
      { type: 'markdown', content: md },
      { id: 'doc-1', issuer: 'Chase', fetchedAt: new Date().toISOString() },
    );

    expect(result.blocks.length).toBeGreaterThan(2);
    expect(result.rawText).toContain('Earn 3x');
    expect(result.document.format).toBe('markdown');
  });

  it('extracts from html string', async () => {
    const html = '<h1>Benefits</h1><p>Earn 4x points at restaurants.</p>';
    const result = await runExtractionPipeline(
      { type: 'html', html },
      { id: 'doc-2', issuer: 'Amex', fetchedAt: new Date().toISOString() },
    );
    expect(result.rawText).toContain('Earn 4x');
  });

  it('scores extraction quality higher for complete guides', () => {
    const good = {
      document: { id: 'd', format: 'pdf' as const, issuer: 'Chase', fetchedAt: '' },
      blocks: [
        { documentId: 'd', content: 'Earn 3x dining', blockType: 'list' as const, confidence: 0.9 },
        { documentId: 'd', content: 'Cap $5000/year', blockType: 'paragraph' as const, confidence: 0.85 },
        { documentId: 'd', content: 'Excludes warehouse clubs', blockType: 'paragraph' as const, confidence: 0.85 },
      ],
      rawText: 'Earn 3x points on dining at restaurants worldwide. Cap $5000 per year maximum. Excludes warehouse clubs and cash equivalents.',
      warnings: [],
      durationMs: 10,
    };
    expect(scoreExtractionQuality(good)).toBeGreaterThan(0.6);
  });

  it('normalizes markdown headings to blocks', () => {
    const blocks = markdownToBlocks('doc', '# Earning\n\n- Earn 3x dining');
    expect(blocks.some((b) => b.blockType === 'heading')).toBe(true);
    expect(blocks.some((b) => b.blockType === 'list')).toBe(true);
  });
});
