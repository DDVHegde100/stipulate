import type { ExtractedBlock } from '../types.js';

/** Normalize markdown: collapse excessive whitespace, standardize headings. */
export function normalizeMarkdown(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/^#{1,6}\s+/gm, (match) => {
      const level = match.trim().length;
      return '#'.repeat(level) + ' ';
    })
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/** Convert markdown to structured extraction blocks. */
export function markdownToBlocks(documentId: string, markdown: string): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  const lines = markdown.split('\n');
  let section = 'Introduction';
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || !trimmed) continue;

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      section = headingMatch[2]!;
      blocks.push({
        documentId,
        sectionTitle: section,
        content: section,
        blockType: 'heading',
        confidence: 0.95,
      });
      continue;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      blocks.push({
        documentId,
        sectionTitle: section,
        content: listMatch[1]!,
        blockType: 'list',
        confidence: 0.9,
      });
      continue;
    }

    blocks.push({
      documentId,
      sectionTitle: section,
      content: trimmed,
      blockType: 'paragraph',
      confidence: 0.88,
    });
  }

  return blocks;
}

/** Convert markdown to plain text suitable for LLM input. */
export function markdownToPlainText(markdown: string): string {
  return normalizeMarkdown(markdown)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1');
}

/** Extract frontmatter metadata from markdown benefit guides. */
export function extractMarkdownFrontmatter(markdown: string): {
  content: string;
  metadata: Record<string, string>;
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { content: markdown, metadata: {} };

  const metadata: Record<string, string> = {};
  for (const line of match[1]!.split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) metadata[key.trim()] = rest.join(':').trim();
  }

  return { content: match[2]!, metadata };
}
