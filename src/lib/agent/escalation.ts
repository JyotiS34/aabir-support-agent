// Escalation decision — combines deterministic rule-based signals with LLM judgment.

import { llmComplete, extractJson } from "./llm";
import { ESCALATION_SYSTEM, escalationUser } from "./prompts";
import { getIntent, SEVERITY_ESCALATION_BIAS } from "./intents";

export type Decision = "auto-handle" | "escalate";

export interface EscalationResult {
  decision: Decision;
  reason: string;
  signals: string[];
  latencyMs: number;
}

// Deterministic rule-based signals derived from the message + intent.
export function detectRuleSignals(message: string, intentId: string, confidence: number): string[] {
  const signals: string[] = [];
  const m = message.toLowerCase();
  const intent = getIntent(intentId);

  // 1. Intent severity bias
  if (intent && SEVERITY_ESCALATION_BIAS[intent.severity] >= 0.5) {
    signals.push(`Intent severity is "${intent.severity}" (escalation bias)`);
  }
  // 2. Intent not typically auto-handleable
  if (intent && !intent.autoHandleable) {
    signals.push(`Intent "${intent.label}" is not typically auto-handleable`);
  }
  // 3. Low classification confidence
  if (confidence < 0.6) {
    signals.push(`Low intent confidence (${confidence.toFixed(2)} < 0.60)`);
  }
  // 4. Emotional / threatening language
  const emotional = ["fraud", "lawsuit", "lawyer", "sue", "chargeback", "dispute", "bbb", "attorney", "closing my account", "done with amazon", "cancel my account", "hacked", "unauthorized"];
  const hit = emotional.find((k) => m.includes(k));
  if (hit) signals.push(`Emotional/risk keyword detected: "${hit}"`);
  // 5. All-caps shouting (strong emotion)
  const words = message.split(/\s+/).filter((w) => w.length >= 4);
  const capsWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length >= 2) signals.push(`Multiple ALL-CAPS words (${capsWords.length}) — high emotion`);
  // 6. Multiple exclamation marks
  if ((message.match(/!/g) ?? []).length >= 3) signals.push("Excessive exclamation marks — high emotion");
  // 7. Money movement / account security intents
  if (["refund_request", "payment_issue", "account_access"].includes(intentId)) {
    signals.push("Sensitive intent (money/account security) requires human verification");
  }
  // 8. Multi-intent ambiguity
  const intentKeywords: Record<string, string[]> = {
    damaged: ["broken", "cracked", "damaged", "defective"],
    refund: ["refund", "money back"],
    delay: ["late", "delayed"],
    bug: ["crash", "broken", "error"],
  };
  let intentHits = 0;
  for (const k of Object.values(intentKeywords)) {
    if (k.some((kw) => m.includes(kw))) intentHits++;
  }
  if (intentHits >= 2) signals.push("Possible multi-intent message — ambiguity");

  return signals;
}

// Rule-only decision (baseline / fallback).
export function ruleBasedDecision(message: string, intentId: string, confidence: number): EscalationResult {
  const signals = detectRuleSignals(message, intentId, confidence);
  const decision: Decision = signals.length >= 1 ? "escalate" : "auto-handle";
  return {
    decision,
    reason:
      decision === "escalate"
        ? `Escalated based on ${signals.length} rule signal(s): ${signals.slice(0, 2).join("; ")}.`
        : "No escalation signals detected; safe to auto-handle.",
    signals,
    latencyMs: 0,
  };
}

export async function decideEscalation(
  message: string,
  intentId: string,
  confidence: number,
): Promise<EscalationResult> {
  const ruleSignals = detectRuleSignals(message, intentId, confidence);
  try {
    const { content, latencyMs } = await llmComplete(
      ESCALATION_SYSTEM,
      escalationUser(message, intentId, confidence, ruleSignals),
    );
    const parsed = extractJson<{
      decision: string;
      reason: string;
      signals?: string[];
    }>(content);
    const decision: Decision = parsed.decision === "auto-handle" ? "auto-handle" : "escalate";
    return {
      decision,
      reason: parsed.reason ?? "Decided by LLM escalation module.",
      signals: Array.from(new Set([...ruleSignals, ...(parsed.signals ?? [])])),
      latencyMs,
    };
  } catch {
    return { ...ruleBasedDecision(message, intentId, confidence), latencyMs: 0 };
  }
}
