import type { WebExtractOptions } from "../types.js";
import type { ExtractionResult, SourceDocument } from "../types.js";

const DEFAULT_USER_AGENT =
  "StipulateBot/0.1 (+https://stipulate.dev/bot; benefit-guide-ingestion)";

/** Stub web extraction — fetches HTML and strips tags into structured blocks. */
export async function extractFromWeb(
  url: string,
  document: Omit<SourceDocument, "format" | "url">,
  options: WebExtractOptions = {},
): Promise<ExtractionResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const timeoutMs = options.timeoutMs ?? 30000;

  let html: string;

  try {
    html = await fetchHtml(url, {
      userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
      timeoutMs,
      followRedirects: options.followRedirects ?? true,
    });
  } catch (error) {
    warnings.push(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    html = buildFallbackHtml(document.issuer, document.productName);
  }

  const stripped = stripHtml(html, options.stripNavigation ?? true);
  const blocks = htmlToBlocks(document.id, stripped);

  const fullDocument: SourceDocument = {
    ...document,
    url,
    format: "html",
  };

  return {
    document: fullDocument,
    blocks,
    rawText: stripped,
    warnings,
    durationMs: Date.now() - start,
  };
}

async function fetchHtml(
  url: string,
  options: { userAgent: string; timeoutMs: number; followRedirects: boolean },
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": options.userAgent },
      redirect: options.followRedirects ? "follow" : "manual",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function buildFallbackHtml(issuer: string, productName?: string): string {
  const product = productName ?? "Card";
  return `
    <html><body>
      <nav>Skip navigation</nav>
      <h1>${issuer} ${product} Rewards</h1>
      <h2>Dining</h2>
      <p>Earn 3 points per dollar on dining purchases.</p>
      <h2>Travel</h2>
      <p>Earn 2 points per dollar on travel purchases.</p>
      <footer>Terms apply</footer>
    </body></html>
  `;
}

function stripHtml(html: string, stripNavigation: boolean): string {
  let result = html;

  if (stripNavigation) {
    result = result.replace(/<nav[\s>][\s\S]*?<\/nav>/gi, "");
    result = result.replace(/<footer[\s>][\s\S]*?<\/footer>/gi, "");
    result = result.replace(/<header[\s>][\s\S]*?<\/header>/gi, "");
  }

  result = result.replace(/<script[\s>][\s\S]*?<\/script>/gi, "");
  result = result.replace(/<style[\s>][\s\S]*?<\/style>/gi, "");
  result = result.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, "\n## $2\n");
  result = result.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1\n");
  result = result.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
  result = result.replace(/<br\s*\/?>/gi, "\n");
  result = result.replace(/<[^>]+>/g, " ");
  result = result.replace(/&nbsp;/g, " ");
  result = result.replace(/&amp;/g, "&");
  result = result.replace(/&lt;/g, "<");
  result = result.replace(/&gt;/g, ">");
  result = result.replace(/\s+\n/g, "\n");
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

function htmlToBlocks(documentId: string, text: string): ExtractionResult["blocks"] {
  const lines = text.split("\n");
  const blocks: ExtractionResult["blocks"] = [];
  let section = "Introduction";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("## ")) {
      section = trimmed.slice(3).trim();
      blocks.push({
        documentId,
        sectionTitle: section,
        content: section,
        blockType: "heading",
        confidence: 0.88,
      });
      continue;
    }

    blocks.push({
      documentId,
      sectionTitle: section,
      content: trimmed.replace(/^-\s*/, ""),
      blockType: trimmed.startsWith("-") ? "list" : "paragraph",
      confidence: 0.82,
    });
  }

  return blocks;
}

/** Extract from inline HTML string without network fetch. */
export function extractFromHtmlString(
  html: string,
  document: Omit<SourceDocument, "format">,
  options?: WebExtractOptions,
): ExtractionResult {
  const start = Date.now();
  const stripped = stripHtml(html, options?.stripNavigation ?? true);
  const blocks = htmlToBlocks(document.id, stripped);

  return {
    document: { ...document, format: "html" },
    blocks,
    rawText: stripped,
    warnings: [],
    durationMs: Date.now() - start,
  };
}
