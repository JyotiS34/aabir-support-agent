// Intent classifier — calls LLM with the taxonomy, returns structured result.

import { llmComplete, extractJson } from "./llm";
import { CLASSIFIER_SYSTEM, classifierUser } from "./prompts";
import { INTENTS, type IntentId } from "./intents";

export interface ClassificationResult {
  intent: IntentId | string;
  confidence: number;
  reasoning: string;
  alternativeIntents: string[];
  latencyMs: number;
}

// Trivial baseline: keyword match (used as baseline #1 in eval).
export function classifyByKeywords(message: string): ClassificationResult {
  const m = message.toLowerCase();
  const rules: { intent: string; keywords: string[] }[] = [
    { intent: "refund_request", keywords: ["refund", "money back", "reimburse"] },
    { intent: "cancel_order", keywords: ["cancel"] },
    { intent: "return_request", keywords: ["return"] },
    { intent: "damaged_defective", keywords: ["broken", "damaged", "cracked", "defective", "doesn't turn on", "won't turn on", "not working"] },
    { intent: "delivery_delay", keywords: ["late", "delayed", "haven't received", "never came", "where is my", "where's my"] },
    { intent: "order_status", keywords: ["tracking", "order", "package", "deliver"] },
    { intent: "payment_issue", keywords: ["charged twice", "charge", "card", "payment", "declined", "unauthorized"] },
    { intent: "account_access", keywords: ["log in", "login", "locked out", "password", "account", "hacked"] },
    { intent: "prime_membership", keywords: ["prime"] },
    { intent: "app_website_bug", keywords: ["app", "website", "crash", "broken", "bug", "error", "not loading"] },
    { intent: "product_question", keywords: ["color", "compatible", "warranty", "spec", "size"] },
    { intent: "general_complaint", keywords: ["ridiculous", "worst", "useless", "suck", "terrible"] },
  ];
  for (const r of rules) {
    if (r.keywords.some((k) => m.includes(k))) {
      return {
        intent: r.intent,
        confidence: 0.55,
        reasoning: `Keyword match for "${r.intent}".`,
        alternativeIntents: [],
        latencyMs: 0,
      };
    }
  }
  return {
    intent: "general_complaint",
    confidence: 0.3,
    reasoning: "No keyword matched; defaulting to general complaint.",
    alternativeIntents: [],
    latencyMs: 0,
  };
}

// Simple baseline #2: TF-IDF-lite nearest-example (used as baseline #2 in eval).
// Implemented as token-overlap with each intent's example set.
export function classifyByNearestExample(message: string): ClassificationResult {
  const tokens = new Set(message.toLowerCase().match(/\b[a-z]{2,}\bg?/g) ?? []);
  let best: { intent: string; score: number } = { intent: "general_complaint", score: 0 };
  for (const intent of INTENTS) {
    const exTokens = new Set(
      intent.examples.join(" ").toLowerCase().match(/\b[a-z]{2,}\b/g) ?? [],
    );
    let overlap = 0;
    for (const t of tokens) if (exTokens.has(t)) overlap++;
    const score = overlap / Math.sqrt(exTokens.size);
    if (score > best.score) best = { intent: intent.id, score };
  }
  return {
    intent: best.intent,
    confidence: Math.min(0.4 + best.score * 0.4, 0.85),
    reasoning: `Nearest-example token overlap (score ${best.score.toFixed(2)}).`,
    alternativeIntents: [],
    latencyMs: 0,
  };
}

export async function classifyIntent(
  message: string,
  threadContext?: string[],
): Promise<ClassificationResult> {
  const { content, latencyMs } = await llmComplete(
    CLASSIFIER_SYSTEM,
    classifierUser(message, threadContext),
  );
  try {
    const parsed = extractJson<{
      intent: string;
      confidence: number;
      reasoning: string;
      alternativeIntents?: string[];
    }>(content);
    return {
      intent: parsed.intent,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      reasoning: parsed.reasoning ?? "Classified by LLM.",
      alternativeIntents: parsed.alternativeIntents ?? [],
      latencyMs,
    };
  } catch {
    // Fallback: keyword classification if LLM JSON parsing fails.
    const fallback = classifyByKeywords(message);
    return { ...fallback, reasoning: `LLM parse failed; ${fallback.reasoning}`, latencyMs };
  }
}
