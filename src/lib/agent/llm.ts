export interface LLMResult {
  content: string;
  latencyMs: number;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "openai/gpt-oss-120b",     
  "openai/gpt-oss-20b",      
  "qwen/qwen3.8-27b",      
  "groq/compound",          
  "groq/compound-mini",    
];

let workingGroqModel: string | null = null;

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set. Get a free key at https://console.groq.com");

  // If we already found a working model, use it directly
  const modelsToTry = workingGroqModel ? [workingGroqModel] : GROQ_MODELS;

  let lastError: unknown;
  for (const model of modelsToTry) {
    const start = Date.now();
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `status ${res.status}`;
        if (res.status === 404 || errMsg.includes("does not exist") || errMsg.includes("model_not_found")) {
          lastError = new Error(`Groq model "${model}" not available: ${errMsg}`);
          continue;
        }
        throw new Error(`Groq API error ${res.status}: ${errMsg}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      if (!content || content.trim().length === 0) {
        throw new Error(`Groq returned empty content for model ${model}`);
      }

      workingGroqModel = model;
      return { content, latencyMs: Date.now() - start };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("not available") && !msg.includes("model_not_found")) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Groq models failed. Check your GROQ_API_KEY at console.groq.com");
}

export async function llmComplete(
  systemPrompt: string,
  userPrompt: string,
  opts: { retries?: number } = {},
): Promise<LLMResult> {
  const retries = opts.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callGroq(systemPrompt, userPrompt);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM completion failed");
}

export function extractJson<T = unknown>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("No JSON object found in LLM response");
  }
}
