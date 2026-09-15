// Reply drafter — calls LLM grounded in the brand's historical resolution pattern.

import { llmComplete, extractJson } from "./llm";
import { drafterSystem, drafterUser } from "./prompts";
import { getResolutionPattern } from "../data/brand-context";

export interface DraftResult {
  reply: string;
  confidence: number;
  groundedIn: string[];
  latencyMs: number;
}

// Trivial baseline reply (used in eval as the trivial baseline).
export function trivialReply(message: string): string {
  return "Thanks for reaching out! Please DM us your order number and we'll look into this for you.";
}

export async function draftReply(
  message: string,
  intentId: string,
  customerName: string,
  threadContext?: string[],
): Promise<DraftResult> {
  const pattern = getResolutionPattern(intentId);
  if (!pattern) {
    return {
      reply: trivialReply(message),
      confidence: 0.4,
      groundedIn: ["fallback: no resolution pattern for this intent"],
      latencyMs: 0,
    };
  }
  const { content, latencyMs } = await llmComplete(
    drafterSystem(pattern),
    drafterUser(message, intentId, customerName, threadContext),
  );
  try {
    const parsed = extractJson<{ reply: string; confidence: number; groundedIn?: string[] }>(content);
    return {
      reply: parsed.reply,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.75,
      groundedIn: parsed.groundedIn ?? [`historical pattern for ${intentId}`],
      latencyMs,
    };
  } catch {
    // Fallback: compose a deterministic reply from the pattern.
    const composed = `${pattern.opening[0].replace("{name}", customerName)} ${pattern.closing[0].replace("{name}", customerName)}`;
    return {
      reply: composed,
      confidence: 0.5,
      groundedIn: [`fallback composed from pattern for ${intentId}`],
      latencyMs,
    };
  }
}
