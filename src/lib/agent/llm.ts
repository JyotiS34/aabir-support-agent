// LLM helper: thin wrapper around z-ai-web-dev-sdk with JSON parsing + retries.
// Server-side ONLY.

import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getLLM() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export interface LLMResult {
  content: string;
  latencyMs: number;
}

export async function llmComplete(
  systemPrompt: string,
  userPrompt: string,
  opts: { retries?: number } = {},
): Promise<LLMResult> {
  const retries = opts.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const start = Date.now();
    try {
      const zai = await getLLM();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      });
      const content = completion.choices[0]?.message?.content ?? "";
      if (!content || content.trim().length === 0) {
        throw new Error("Empty LLM response");
      }
      return { content, latencyMs: Date.now() - start };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM completion failed");
}

// Extract the first JSON object from a possibly-noisy LLM string.
export function extractJson<T = unknown>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall back to first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("No JSON object found in LLM response");
  }
}
