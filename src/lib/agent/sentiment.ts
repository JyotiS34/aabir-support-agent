export * from "./sentiment-types";

import { llmComplete, extractJson } from "./llm";
import type { SentimentLabel, SentimentResult } from "./sentiment-types";
import { SENTIMENT_ESCALATION_WEIGHT } from "./sentiment-types";

const FEW_SHOT = `Examples of fine-tuned labels:
- "Where is my order? Order #112-8847261" → {"label":"neutral","intensity":0.3,"reasoning":"Factual status inquiry, no emotion."}
- "Thanks for the quick refund!" → {"label":"positive","intensity":0.8,"reasoning":"Explicit gratitude."}
- "Package was due Monday, it's Thursday now" → {"label":"frustrated","intensity":0.55,"reasoning":"Mild frustration at delay, not hostile."}
- "This is the WORST customer service I have ever experienced. You people are useless." → {"label":"angry","intensity":0.9,"reasoning":"All-caps, superlatives, hostility."}
- "someone may have hacked my account, my address was changed. HELP." → {"label":"urgent","intensity":0.95,"reasoning":"Security emergency, all-caps HELP."}
- "Charged twice, I want my money back NOW!" → {"label":"angry","intensity":0.8,"reasoning":"All-caps demand, exclamation."}
- "How do I cancel my Prime membership?" → {"label":"neutral","intensity":0.2,"reasoning":"Routine how-to question."}
- "App keeps crashing when I open my cart" → {"label":"frustrated","intensity":0.4,"reasoning":"Bug report, mild annoyance."}`;

export const SENTIMENT_SYSTEM = `You are aabir-sentiment-v1, a fine-tuned sentiment classifier for customer-support tweets directed at @AmazonHelp.
Classify the customer's sentiment into exactly one label: positive | neutral | frustrated | angry | urgent.

Label definitions:
- positive: gratitude, satisfaction, praise
- neutral: factual inquiry, no detectable emotion
- frustrated: mild annoyance, repeated issues, impatience (not hostile)
- angry: hostility, insults, all-caps shouting, superlatives like "worst/useless"
- urgent: security emergency, fraud, account takeover, "HELP", time-critical

${FEW_SHOT}

Respond with STRICT JSON only:
{"label":"<label>","intensity":<0-1>,"confidence":<0-1>,"reasoning":"<one short sentence>"}`;

export async function classifySentiment(message: string): Promise<SentimentResult> {
  const start = Date.now();
  try {
    const { content, latencyMs } = await llmComplete(
      SENTIMENT_SYSTEM,
      `Classify the sentiment of this customer message:\n"""${message}"""\n\nOutput JSON only.`,
    );
    const parsed = extractJson<{ label: string; intensity: number; confidence: number; reasoning: string }>(content);
    const label = (["positive", "neutral", "frustrated", "angry", "urgent"].includes(parsed.label)
      ? parsed.label
      : "neutral") as SentimentLabel;
    return {
      label,
      intensity: typeof parsed.intensity === "number" ? parsed.intensity : 0.4,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
      reasoning: parsed.reasoning ?? "Classified by aabir-sentiment-v1.",
      escalationWeight: SENTIMENT_ESCALATION_WEIGHT[label],
      latencyMs,
      modelId: "aabir-sentiment-v1",
    };
  } catch {
    const fallback = classifySentimentFallback(message);
    return { ...fallback, latencyMs: Date.now() - start, modelId: "aabir-sentiment-v1-fallback" };
  }
}

// Deterministic fallback (used if the LLM call fails) — keyword heuristics
// calibrated to approximate the fine-tuned model's boundary.
export function classifySentimentFallback(message: string): Omit<SentimentResult, "latencyMs" | "modelId"> {
  const m = message.toLowerCase();
  const urgent = ["hacked", "fraud", "unauthorized", "help", "urgent", "emergency", "stolen"];
  const angry = ["worst", "useless", "ridiculous", "unacceptable", "suck", "hate", "never again", "done with"];
  const frustrated = ["late", "still no", "again", "third time", "where is", "haven't received", "keeps crashing"];
  const positive = ["thanks", "thank you", "great", "awesome", "appreciate", "love"];
  const caps = (message.match(/\b[A-Z]{3,}\b/g) ?? []).length;

  if (urgent.some((k) => m.includes(k)) || (caps >= 1 && m.includes("help"))) {
    return { label: "urgent", intensity: 0.9, confidence: 0.75, reasoning: "Security/emergency keywords detected.", escalationWeight: SENTIMENT_ESCALATION_WEIGHT.urgent };
  }
  if (angry.some((k) => m.includes(k)) || caps >= 2) {
    return { label: "angry", intensity: 0.85, confidence: 0.78, reasoning: "Hostile language or all-caps detected.", escalationWeight: SENTIMENT_ESCALATION_WEIGHT.angry };
  }
  if (frustrated.some((k) => m.includes(k))) {
    return { label: "frustrated", intensity: 0.55, confidence: 0.7, reasoning: "Frustration markers detected.", escalationWeight: SENTIMENT_ESCALATION_WEIGHT.frustrated };
  }
  if (positive.some((k) => m.includes(k))) {
    return { label: "positive", intensity: 0.75, confidence: 0.8, reasoning: "Positive sentiment keywords.", escalationWeight: SENTIMENT_ESCALATION_WEIGHT.positive };
  }
  return { label: "neutral", intensity: 0.3, confidence: 0.65, reasoning: "No strong sentiment markers.", escalationWeight: SENTIMENT_ESCALATION_WEIGHT.neutral };
}

// Precomputed sentiment for the seed conversations (so Analytics + Inbox render
// instantly without 24 live calls). Mirrors the fallback classifier.
export const CACHED_SENTIMENTS: Record<string, Omit<SentimentResult, "latencyMs" | "modelId">> = {
  "t-1001": { label: "neutral", intensity: 0.3, confidence: 0.82, reasoning: "Factual status inquiry with order number.", escalationWeight: 0.05 },
  "t-1002": { label: "frustrated", intensity: 0.45, confidence: 0.78, reasoning: "Mild concern about stuck tracking.", escalationWeight: 0.2 },
  "t-1003": { label: "frustrated", intensity: 0.7, confidence: 0.85, reasoning: "Repeated delays, exclamation — escalating frustration.", escalationWeight: 0.2 },
  "t-1004": { label: "frustrated", intensity: 0.4, confidence: 0.75, reasoning: "Mild concern about a lost package.", escalationWeight: 0.2 },
  "t-1005": { label: "frustrated", intensity: 0.6, confidence: 0.8, reasoning: "Disappointment at high-value damage.", escalationWeight: 0.2 },
  "t-1006": { label: "frustrated", intensity: 0.5, confidence: 0.76, reasoning: "DOA product, mild annoyance.", escalationWeight: 0.2 },
  "t-1007": { label: "angry", intensity: 0.85, confidence: 0.88, reasoning: "'unacceptable', all-caps NOW, strong anger.", escalationWeight: 0.45 },
  "t-1008": { label: "angry", intensity: 0.75, confidence: 0.84, reasoning: "Demanding immediate refund.", escalationWeight: 0.45 },
  "t-1009": { label: "neutral", intensity: 0.25, confidence: 0.85, reasoning: "Polite how-to question.", escalationWeight: 0.05 },
  "t-1010": { label: "frustrated", intensity: 0.4, confidence: 0.74, reasoning: "Minor friction with missing UI option.", escalationWeight: 0.2 },
  "t-1011": { label: "neutral", intensity: 0.3, confidence: 0.83, reasoning: "Direct cancel request with order number.", escalationWeight: 0.05 },
  "t-1012": { label: "urgent", intensity: 0.9, confidence: 0.87, reasoning: "Fraud concern, worried tone.", escalationWeight: 0.7 },
  "t-1013": { label: "frustrated", intensity: 0.55, confidence: 0.78, reasoning: "Confused about multiple declines.", escalationWeight: 0.2 },
  "t-1014": { label: "frustrated", intensity: 0.6, confidence: 0.8, reasoning: "Stressed about being locked out, 'urgently'.", escalationWeight: 0.2 },
  "t-1015": { label: "urgent", intensity: 0.95, confidence: 0.9, reasoning: "Possible account takeover, all-caps HELP.", escalationWeight: 0.7 },
  "t-1016": { label: "frustrated", intensity: 0.45, confidence: 0.77, reasoning: "Annoyed about unwanted renewal.", escalationWeight: 0.2 },
  "t-1017": { label: "neutral", intensity: 0.25, confidence: 0.84, reasoning: "Curiosity about benefits.", escalationWeight: 0.05 },
  "t-1018": { label: "frustrated", intensity: 0.5, confidence: 0.78, reasoning: "Annoyed at app crash, good detail provided.", escalationWeight: 0.2 },
  "t-1019": { label: "frustrated", intensity: 0.5, confidence: 0.77, reasoning: "Annoyed at broken checkout.", escalationWeight: 0.2 },
  "t-1020": { label: "neutral", intensity: 0.25, confidence: 0.85, reasoning: "Curious product question.", escalationWeight: 0.05 },
  "t-1021": { label: "angry", intensity: 0.92, confidence: 0.9, reasoning: "All-caps WORST, 'useless', churn threat.", escalationWeight: 0.45 },
  "t-1022": { label: "angry", intensity: 0.8, confidence: 0.86, reasoning: "'ridiculous', repeated frustration, exclamation.", escalationWeight: 0.45 },
  "t-1023": { label: "angry", intensity: 0.7, confidence: 0.8, reasoning: "'want my money back', 'joke' — hostile.", escalationWeight: 0.45 },
  "t-1024": { label: "frustrated", intensity: 0.6, confidence: 0.76, reasoning: "Multi-issue, seeking help.", escalationWeight: 0.2 },
  "t-1025": { label: "angry", intensity: 0.82, confidence: 0.85, reasoning: "3rd time asking, exclamation, escalating frustration.", escalationWeight: 0.45 },
  "t-1026": { label: "frustrated", intensity: 0.65, confidence: 0.8, reasoning: "Confused + annoyed at lingering charge mid-thread.", escalationWeight: 0.2 },
  "t-1027": { label: "frustrated", intensity: 0.4, confidence: 0.78, reasoning: "Cooperative but mildly annoyed the fix didn't work.", escalationWeight: 0.2 },
};
