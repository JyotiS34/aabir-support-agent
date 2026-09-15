// Pure constants & types for the sentiment model — safe to import from client
// components (no server-only SDK dependency). The actual classifySentiment()
// function lives in sentiment.ts and imports the LLM, so it stays server-only.

export type SentimentLabel =
  | "positive"
  | "neutral"
  | "frustrated"
  | "angry"
  | "urgent";

export interface SentimentResult {
  label: SentimentLabel;
  intensity: number; // 0-1, how strong the sentiment is
  confidence: number; // 0-1, model confidence
  reasoning: string;
  // contribution to escalation bias (0-1)
  escalationWeight: number;
  latencyMs: number;
  modelId: string;
}

// Severity → escalation bias
export const SENTIMENT_LABELS: SentimentLabel[] = ["positive", "neutral", "frustrated", "angry", "urgent"];

export const SENTIMENT_META: Record<SentimentLabel, { label: string; color: string; description: string }> = {
  positive: { label: "Positive", color: "oklch(0.62 0.13 162)", description: "Gratitude, satisfaction, praise" },
  neutral: { label: "Neutral", color: "oklch(0.55 0.01 150)", description: "Factual inquiry, no emotion" },
  frustrated: { label: "Frustrated", color: "oklch(0.72 0.16 70)", description: "Mild annoyance, impatience" },
  angry: { label: "Angry", color: "oklch(0.68 0.17 45)", description: "Hostility, insults, all-caps" },
  urgent: { label: "Urgent", color: "oklch(0.6 0.2 25)", description: "Security emergency, fraud, HELP" },
};

export const SENTIMENT_ESCALATION_WEIGHT: Record<SentimentLabel, number> = {
  positive: 0.0,
  neutral: 0.05,
  frustrated: 0.2,
  angry: 0.45,
  urgent: 0.7,
};
