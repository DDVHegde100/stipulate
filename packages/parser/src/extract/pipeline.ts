import type { SourceDocument, ExtractionResult, PdfExtractOptions, WebExtractOptions } from '../types.js';
import { extractFromPdf, extractFromPdfFile, blocksToPromptText, groupBlocksBySection } from './pdf.js';
import { extractPdfContent } from './pdf-parser.js';
import { extractFromWeb, extractFromHtmlString } from './web.js';
import { normalizeMarkdown, markdownToBlocks } from './markdown.js';

export type ExtractSource =
  | { type: 'pdf'; buffer: Buffer | Uint8Array }
  | { type: 'pdf_file'; path: string }
  | { type: 'url'; url: string }
  | { type: 'html'; html: string }
  | { type: 'markdown'; content: string };

export interface ExtractPipelineOptions {
  pdf?: PdfExtractOptions;
  web?: WebExtractOptions;
  preferNativePdf?: boolean;
}

/** Unified extraction entry point — routes to the correct extractor by source type. */
export async function runExtractionPipeline(
  source: ExtractSource,
  document: Omit<SourceDocument, 'format' | 'url'>,
  options: ExtractPipelineOptions = {},
): Promise<ExtractionResult> {
  switch (source.type) {
    case 'pdf':
      if (options.preferNativePdf !== false) {
        return extractPdfContent(source.buffer, document, options.pdf);
      }
      return extractFromPdf(source.buffer, document, options.pdf);

    case 'pdf_file':
      if (options.preferNativePdf !== false) {
        const { readFile } = await import('node:fs/promises');
        const buffer = await readFile(source.path);
        return extractPdfContent(buffer, document, options.pdf);
      }
      return extractFromPdfFile(source.path, document, options.pdf);

    case 'url':
      return extractFromWeb(source.url, document, options.web);

    case 'html':
      return extractFromHtmlString(source.html, document, options.web);

    case 'markdown': {
      const start = Date.now();
      const normalized = normalizeMarkdown(source.content);
      const blocks = markdownToBlocks(document.id, normalized);
      return {
        document: { ...document, format: 'markdown' },
        blocks,
        rawText: normalized,
        warnings: [],
        durationMs: Date.now() - start,
      };
    }

    default:
      throw new Error(`Unsupported source type`);
  }
}

export { blocksToPromptText, groupBlocksBySection };

/** Compute content quality score for extraction output (0-1). */
export function scoreExtractionQuality(result: ExtractionResult): number {
  if (result.rawText.length < 100) return 0.2;
  if (result.blocks.length < 3) return 0.4;

  const avgConfidence =
    result.blocks.reduce((sum, b) => sum + b.confidence, 0) / result.blocks.length;

  const hasEarnRules = /earn\s+\d+/i.test(result.rawText) ? 0.15 : 0;
  const hasCaps = /cap|limit|maximum/i.test(result.rawText) ? 0.1 : 0;
  const hasExclusions = /exclud|does not qualify|not eligible/i.test(result.rawText) ? 0.1 : 0;

  return Math.min(1, avgConfidence * 0.65 + hasEarnRules + hasCaps + hasExclusions);
}
