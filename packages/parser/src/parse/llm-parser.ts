import {
  BenefitRuleSchema,
  type BenefitRule,
  type SpendingCategory,
} from "@stipulate/schema";
import type {
  CompletionRequest,
  CompletionResponse,
  LLMClient,
  ParseResult,
  RawParsedBenefit,
} from "../types.js";
import { scoreParseResult, buildReviewReasons } from "./confidence.js";

const SYSTEM_PROMPT = `You are a credit card benefit guide parser. Extract structured earning rules from issuer benefit text.

Return JSON with this shape:
{
  "benefits": [
    {
      "name": "string",
      "description": "string (optional)",
      "category": "dining|groceries|travel|airfare|hotels|transit|gas|streaming|entertainment|retail|healthcare|utilities|insurance|education|charity|government|cash_equivalent|other",
      "multiplier": number,
      "rewardType": "points|cashback|miles (optional)",
      "caps": [{ "period": "annual|monthly|quarterly|per_transaction|lifetime", "amountMinor": number, "currency": "USD", "description": "string" }],
      "exclusions": [{ "type": "merchant|mcc|category|channel|geography", "matcher": "string", "reason": "string" }],
      "requiresActivation": boolean
    }
  ],
  "unparsedSections": ["string"]
}

Rules:
- multiplier is points-per-dollar for points/miles, or decimal cashback rate (2% = 0.02)
- amountMinor is cents (e.g. $150 = 15000)
- Only include rules explicitly stated in the text
- Put ambiguous sections in unparsedSections`;

/** Default stub LLM client that parses heuristically without network calls. */
export class StubLLMClient implements LLMClient {
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const userContent =
      request.messages.find((m) => m.role === "user")?.content ?? "";
    const benefits = heuristicParse(userContent);

    return {
      id: `stub-${Date.now()}`,
      model: request.model,
      content: JSON.stringify({
        benefits,
        unparsedSections: [],
      }),
      usage: {
        promptTokens: Math.ceil(userContent.length / 4),
        completionTokens: 200,
        totalTokens: Math.ceil(userContent.length / 4) + 200,
      },
      finishReason: "stop",
    };
  }
}

/** Heuristic parser for dev/test — extracts earn rates from common patterns. */
export function heuristicParse(text: string): RawParsedBenefit[] {
  const benefits: RawParsedBenefit[] = [];
  const lines = text.split("\n");

  const earnPattern =
    /earn\s+(\d+(?:\.\d+)?)\s*(x|points?|%\s*cash\s*back|%\s*back|miles?)\s+(?:on|for|at)?\s*(.+)/i;

  for (const line of lines) {
    const match = line.match(earnPattern);
    if (!match) continue;

    const multiplier = parseFloat(match[1]);
    const rewardRaw = match[2].toLowerCase();
    const categoryRaw = match[3].replace(/\.$/, "").trim();

    let rewardType: "points" | "cashback" | "miles" = "points";
    if (rewardRaw.includes("%") || rewardRaw.includes("back")) {
      rewardType = "cashback";
    } else if (rewardRaw.includes("mile")) {
      rewardType = "miles";
    }

    const normalizedMultiplier =
      rewardType === "cashback" ? multiplier / 100 : multiplier;

    benefits.push({
      name: `${multiplier}${rewardRaw.startsWith("x") ? "x" : ""} ${categoryRaw}`,
      description: line.trim(),
      category: inferCategoryFromText(categoryRaw),
      multiplier: normalizedMultiplier,
      rewardType,
    });
  }

  if (benefits.length === 0 && /1x|1 point|all other/i.test(text)) {
    benefits.push({
      name: "Base Earn",
      category: "other",
      multiplier: 1,
      rewardType: "points",
      description: "Earn on all other purchases",
    });
  }

  return benefits;
}

function inferCategoryFromText(text: string): string {
  const lower = text.toLowerCase();
  const mappings: Array<[RegExp, SpendingCategory]> = [
    [/dining|restaurant|food|bar|cafe/, "dining"],
    [/grocery|supermarket/, "groceries"],
    [/travel/, "travel"],
    [/airline|airfare|flight/, "airfare"],
    [/hotel|lodging/, "hotels"],
    [/transit|rideshare|uber|lyft|taxi/, "transit"],
    [/gas|fuel|ev charging/, "gas"],
    [/streaming|netflix|spotify/, "streaming"],
    [/entertainment/, "entertainment"],
  ];

  for (const [pattern, category] of mappings) {
    if (pattern.test(lower)) return category;
  }

  return "other";
}

/** Parse benefit guide text into raw benefits using an LLM client. */
export async function parseBenefitsWithLLM(
  client: LLMClient,
  text: string,
  options: {
    documentId: string;
    cardId: string;
    model?: string;
    temperature?: number;
  },
): Promise<ParseResult> {
  const start = Date.now();
  const model = options.model ?? "gpt-4o-mini";

  const request: CompletionRequest = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract benefit rules from this card benefit guide:\n\n${text}`,
      },
    ],
    temperature: options.temperature ?? 0,
    responseFormat: { type: "json_object" },
  };

  const response = await client.complete(request);
  const parsed = JSON.parse(response.content) as {
    benefits: RawParsedBenefit[];
    unparsedSections?: string[];
  };

  const rawBenefits = parsed.benefits ?? [];
  const scoring = scoreParseResult(rawBenefits, text);

  return {
    documentId: options.documentId,
    cardId: options.cardId,
    rawBenefits: scoring.scoredBenefits,
    unparsedSections: parsed.unparsedSections ?? [],
    llmModel: model,
    tokenUsage: response.usage,
    durationMs: Date.now() - start,
    averageConfidence: scoring.averageConfidence,
    requiresHumanReview: scoring.requiresHumanReview,
    reviewReasons: buildReviewReasons(scoring.scoredBenefits),
  };
}

/** Convert raw parsed benefits to validated BenefitRule schema objects. */
export function rawBenefitsToRules(
  rawBenefits: RawParsedBenefit[],
  cardId: string,
): BenefitRule[] {
  return rawBenefits.map((raw, index) =>
    BenefitRuleSchema.parse({
      id: `rule-${cardId}-${index}`,
      cardId,
      name: raw.name,
      description: raw.description,
      category: raw.category,
      multiplier: raw.multiplier,
      rewardType: raw.rewardType ?? "points",
      caps: (raw.caps ?? []).map((cap, capIndex) => ({
        id: `cap-${cardId}-${index}-${capIndex}`,
        period: cap.period,
        limit: {
          amountMinor: cap.amountMinor,
          currency: cap.currency ?? "USD",
        },
        description: cap.description,
      })),
      exclusions: (raw.exclusions ?? []).map((ex, exIndex) => ({
        id: `ex-${cardId}-${index}-${exIndex}`,
        type: ex.type,
        matcher: ex.matcher,
        reason: ex.reason,
      })),
      requiresActivation: raw.requiresActivation ?? false,
    }),
  );
}

/** Create an OpenAI-compatible client from a fetch-based API endpoint. */
export function createOpenAICompatibleClient(
  apiKey: string,
  baseUrl = "https://api.openai.com/v1",
): LLMClient {
  return {
    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        id: string;
        model: string;
        choices: Array<{
          message: { content: string };
          finish_reason: string;
        }>;
        usage?: CompletionResponse["usage"];
      };

      return {
        id: data.id,
        model: data.model,
        content: data.choices[0]?.message.content ?? "",
        usage: data.usage,
        finishReason: data.choices[0]?.finish_reason as CompletionResponse["finishReason"],
      };
    },
  };
}
