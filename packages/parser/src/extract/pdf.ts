import type { PdfExtractOptions } from "../types.js";
import type { ExtractionResult, SourceDocument } from "../types.js";

/** Stub PDF text extraction — returns structured blocks from a simulated parse. */
export async function extractFromPdf(
  buffer: Buffer | Uint8Array,
  document: Omit<SourceDocument, "format">,
  options: PdfExtractOptions = {},
): Promise<ExtractionResult> {
  const start = Date.now();
  const maxPages = options.maxPages ?? 50;
  const warnings: string[] = [];

  if (buffer.length === 0) {
    warnings.push("Empty PDF buffer provided");
  }

  if (!options.ocrFallback) {
    warnings.push("OCR fallback disabled; scanned PDFs may yield poor results");
  }

  const simulatedText = simulatePdfText(document.issuer, document.productName);
  const blocks = buildBlocksFromText(document.id, simulatedText, maxPages);

  const fullDocument: SourceDocument = {
    ...document,
    format: "pdf",
  };

  return {
    document: fullDocument,
    blocks,
    rawText: simulatedText,
    warnings,
    durationMs: Date.now() - start,
  };
}

/** Extract text from a PDF file path (stub reads as UTF-8 for dev fixtures). */
export async function extractFromPdfFile(
  filePath: string,
  document: Omit<SourceDocument, "format">,
  options?: PdfExtractOptions,
): Promise<ExtractionResult> {
  const { readFile } = await import("node:fs/promises");
  const buffer = await readFile(filePath);
  return extractFromPdf(buffer, document, options);
}

function simulatePdfText(issuer: string, productName?: string): string {
  const product = productName ?? "Rewards Card";
  return [
    `${issuer} ${product} Benefit Guide`,
    "",
    "Earning Rewards",
    "Earn 3x points on dining at restaurants including cafes, bars, and fast food.",
    "Earn 2x points on travel including airlines, hotels, and car rentals.",
    "Earn 1x point on all other purchases.",
    "",
    "Caps and Limitations",
    "Streaming services bonus capped at $5 per month ($60 annual).",
    "Foreign transaction fee: 3% of each transaction in U.S. dollars.",
    "",
    "Exclusions",
    "Purchases at warehouse clubs (Costco, Sam's Club) do not qualify for bonus categories.",
    "Cash equivalents including gift cards and money orders are excluded.",
    "Third-party payment processors may not qualify.",
  ].join("\n");
}

function buildBlocksFromText(
  documentId: string,
  text: string,
  maxPages: number,
): ExtractionResult["blocks"] {
  const lines = text.split("\n");
  const blocks: ExtractionResult["blocks"] = [];
  let currentSection = "Introduction";
  let page = 1;

  for (const line of lines) {
    if (page > maxPages) break;

    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const isHeading =
      trimmed.length < 60 &&
      !trimmed.startsWith("Earn") &&
      !trimmed.includes(":") &&
      /^[A-Z]/.test(trimmed);

    if (isHeading) {
      currentSection = trimmed;
      blocks.push({
        documentId,
        pageNumber: page,
        sectionTitle: trimmed,
        content: trimmed,
        blockType: "heading",
        confidence: 0.9,
      });
      continue;
    }

    blocks.push({
      documentId,
      pageNumber: page,
      sectionTitle: currentSection,
      content: trimmed,
      blockType: trimmed.startsWith("Earn") ? "list" : "paragraph",
      confidence: 0.85,
    });

    if (blocks.length % 8 === 0) {
      page += 1;
    }
  }

  return blocks;
}

/** Split extraction blocks into sections by heading. */
export function groupBlocksBySection(
  blocks: ExtractionResult["blocks"],
): Map<string, ExtractionResult["blocks"]> {
  const sections = new Map<string, ExtractionResult["blocks"]>();
  let currentKey = "default";

  for (const block of blocks) {
    if (block.blockType === "heading") {
      currentKey = block.content;
    }
    const existing = sections.get(currentKey) ?? [];
    existing.push(block);
    sections.set(currentKey, existing);
  }

  return sections;
}

/** Concatenate block content into a single string for LLM input. */
export function blocksToPromptText(blocks: ExtractionResult["blocks"]): string {
  return blocks
    .map((block) => {
      const prefix =
        block.sectionTitle && block.blockType !== "heading"
          ? `[${block.sectionTitle}] `
          : "";
      return `${prefix}${block.content}`;
    })
    .join("\n");
}
