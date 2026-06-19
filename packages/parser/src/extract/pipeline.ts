import { createHash } from 'node:crypto';
import type { SourceDocument, ExtractionResult, PdfExtractOptions, WebExtractOptions } from '../types.js';
import { extractFromPdf, extractFromPdfFile, blocksToPromptText, groupBlocksBySection } from './pdf.js';
import { extractPdfContent } from './pdf-parser.js';
import { extractFromHtmlString } from './web.js';
import { normalizeMarkdown, markdownToBlocks } from './markdown.js';

/** Minimum extraction quality score (0-1) before parsing proceeds. */
export const MIN_EXTRACTION_QUALITY = 0.45;

/** Compute SHA-256 content hash for change detection. */
export function hashExtractionContent(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

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

/** Fetch a remote URL and detect PDF vs HTML content. */
export async function extractFromSourceUrl(
  url: string,
  document: Omit<SourceDocument, 'format' | 'url'>,
  options: ExtractPipelineOptions = {},
): Promise<ExtractionResult> {
  const timeoutMs = options.web?.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          options.web?.userAgent ??
          'StipulateBot/0.1 (+https://stipulate.dev/bot; benefit-guide-ingestion)',
      },
      redirect: options.web?.followRedirects === false ? 'manual' : 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isPdf =
      contentType.includes('application/pdf') ||
      url.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const result =
        options.preferNativePdf !== false
          ? await extractPdfContent(buffer, document, options.pdf)
          : await extractFromPdf(buffer, document, options.pdf);
      return attachChecksum(result);
    }

    const html = await response.text();
    const result = extractFromHtmlString(html, { ...document, url }, options.web);
    return attachChecksum(result);
  } finally {
    clearTimeout(timer);
  }
}

function attachChecksum(result: ExtractionResult): ExtractionResult {
  const checksum = hashExtractionContent(result.rawText);
  return {
    ...result,
    document: { ...result.document, checksum },
  };
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
      return attachChecksum(await extractFromSourceUrl(source.url, document, options));

    case 'html':
      return extractFromHtmlString(source.html, document, options.web);

    case 'markdown': {
      const start = Date.now();
      const normalized = normalizeMarkdown(source.content);
      const blocks = markdownToBlocks(document.id, normalized);
      return attachChecksum({
        document: { ...document, format: 'markdown' },
        blocks,
        rawText: normalized,
        warnings: [],
        durationMs: Date.now() - start,
      });
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
