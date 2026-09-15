import { classifyIntent, classifyByKeywords, classifyByNearestExample, type ClassificationResult } from "./classifier";
import { draftReply, trivialReply, type DraftResult } from "./drafter";
import { decideEscalation, ruleBasedDecision, type EscalationResult, type Decision } from "./escalation";
import { classifySentiment, type SentimentResult } from "./sentiment";

export interface AgentAnalysis {
  intent: string;
  intentConfidence: number;
  intentReasoning: string;
  alternativeIntents: string[];
  sentiment: SentimentResult | null;
  draftReply: string;
  draftConfidence: number;
  groundedIn: string[];
  decision: Decision;
  decisionReason: string;
  escalationSignals: string[];
  latencyMs: number;
  modelId: string;
}

export interface AnalyzeOptions {
  customerName?: string;
  threadContext?: string[];
  // If true, skip LLM and use only deterministic baselines (for cheap eval).
  baseline?: "none" | "trivial" | "keyword" | "nearest";
}

export async function analyzeMessage(
  message: string,
  opts: AnalyzeOptions = {},
): Promise<AgentAnalysis> {
  const customerName = opts.customerName ?? "there";
  const start = Date.now();

  // Baselines (no LLM) — used for the eval comparison.
  if (opts.baseline === "trivial") {
    return {
      intent: "general_complaint",
      intentConfidence: 0,
      intentReasoning: "Trivial baseline — no classification.",
      alternativeIntents: [],
      sentiment: null,
      draftReply: trivialReply(message),
      draftConfidence: 0.2,
      groundedIn: ["trivial canned reply"],
      decision: "auto-handle",
      decisionReason: "Trivial baseline always auto-handles.",
      escalationSignals: [],
      latencyMs: Date.now() - start,
      modelId: "baseline-trivial",
    };
  }
  if (opts.baseline === "keyword") {
    const cls = classifyByKeywords(message);
    const esc = ruleBasedDecision(message, cls.intent, cls.confidence);
    return {
      intent: cls.intent,
      intentConfidence: cls.confidence,
      intentReasoning: cls.reasoning,
      alternativeIntents: [],
      sentiment: null,
      draftReply: trivialReply(message),
      draftConfidence: 0.3,
      groundedIn: ["keyword baseline — canned reply"],
      decision: esc.decision,
      decisionReason: esc.reason,
      escalationSignals: esc.signals,
      latencyMs: Date.now() - start,
      modelId: "baseline-keyword",
    };
  }
  if (opts.baseline === "nearest") {
    const cls = classifyByNearestExample(message);
    const esc = ruleBasedDecision(message, cls.intent, cls.confidence);
    return {
      intent: cls.intent,
      intentConfidence: cls.confidence,
      intentReasoning: cls.reasoning,
      alternativeIntents: [],
      sentiment: null,
      draftReply: trivialReply(message),
      draftConfidence: 0.3,
      groundedIn: ["nearest-example baseline — canned reply"],
      decision: esc.decision,
      decisionReason: esc.reason,
      escalationSignals: esc.signals,
      latencyMs: Date.now() - start,
      modelId: "baseline-nearest",
    };
  }

  // Full agent: classifier → (drafter + escalation + sentiment) in parallel.
  const cls: ClassificationResult = await classifyIntent(message, opts.threadContext);
  const [draft, esc, sentiment]: [DraftResult, EscalationResult, SentimentResult] = await Promise.all([
    draftReply(message, cls.intent, customerName, opts.threadContext),
    decideEscalation(message, cls.intent, cls.confidence),
    classifySentiment(message),
  ]);

  // Fold the sentiment's escalation weight into the escalation signals so the
  // fine-tuned sentiment model actively shapes the auto-handle vs escalate call.
  const signals = [...esc.signals];
  if (sentiment && sentiment.escalationWeight >= 0.4) {
    signals.push(`Sentiment "${sentiment.label}" (intensity ${(sentiment.intensity * 100).toFixed(0)}%) from aabir-sentiment-v1`);
  }

  return {
    intent: cls.intent,
    intentConfidence: cls.confidence,
    intentReasoning: cls.reasoning,
    alternativeIntents: cls.alternativeIntents,
    sentiment,
    draftReply: draft.reply,
    draftConfidence: draft.confidence,
    groundedIn: draft.groundedIn,
    decision: esc.decision,
    decisionReason: esc.reason,
    escalationSignals: signals,
    latencyMs: Date.now() - start,
    modelId: "openai/gpt-oss-120b",
  };
}

// LLM-as-judge: score a drafted reply against a rubric.
// Returns 0-1 scores on 4 dimensions + an overall + a short critique.
export interface JudgeResult {
  groundedness: number; // grounded in brand history
  safety: number; // no PII asks, policy-compliant
  tone: number; // warm, on-brand
  actionability: number; // clear next step
  overall: number;
  critique: string;
  agreesWithHuman: boolean; // judge's overall accept vs human label
  latencyMs: number;
}

export const JUDGE_SYSTEM = `You are a strict evaluator (LLM-as-judge) for customer-support replies written by an AI agent for @AmazonHelp.
Score the reply on 4 dimensions, each 0.0–1.0:
- groundedness: Is it grounded in how Amazon Help historically resolves this intent? (not generic)
- safety: Does it avoid asking for sensitive data publicly? Is it policy-compliant?
- tone: Is it warm, empathetic, on-brand, and not defensive?
- actionability: Does it end with a clear next step the customer can take?

Also judge whether the reply is ACCEPTABLE overall (>= 0.7 average = acceptable).

Reply with STRICT JSON only:
{
  "groundedness": <0-1>,
  "safety": <0-1>,
  "tone": <0-1>,
  "actionability": <0-1>,
  "overall": <0-1 average>,
  "critique": "<one or two sentences>",
  "acceptable": true | false
}`;

export async function judgeReply(
  message: string,
  intentId: string,
  reply: string,
): Promise<JudgeResult> {
  const { llmComplete, extractJson } = await import("./llm");
  const start = Date.now();
  try {
    const { content, latencyMs } = await llmComplete(
      JUDGE_SYSTEM,
      `Customer message:\n"""${message}"""\n\nIntent: ${intentId}\n\nDrafted reply to evaluate:\n"""${reply}"""\n\nScore it. Output JSON only.`,
    );
    const parsed = extractJson<{
      groundedness: number;
      safety: number;
      tone: number;
      actionability: number;
      overall: number;
      critique: string;
      acceptable: boolean;
    }>(content);
    return {
      groundedness: parsed.groundedness,
      safety: parsed.safety,
      tone: parsed.tone,
      actionability: parsed.actionability,
      overall: parsed.overall,
      critique: parsed.critique,
      agreesWithHuman: parsed.acceptable,
      latencyMs,
    };
  } catch {
    return {
      groundedness: 0.5,
      safety: 0.5,
      tone: 0.5,
      actionability: 0.5,
      overall: 0.5,
      critique: "Judge unavailable; neutral default.",
      agreesWithHuman: false,
      latencyMs: Date.now() - start,
    };
  }
}
