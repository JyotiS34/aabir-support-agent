import ZAI from "z-ai-web-dev-sdk";
import { promises as fs } from "fs";
import path from "path";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

function configFromEnv(): Record<string, string> | null {
  const fullConfig = process.env.ZAI_CONFIG;
  if (fullConfig) {
    try {
      const parsed = JSON.parse(fullConfig);
      if (parsed.baseUrl && parsed.apiKey) return parsed;
    } catch {
      // invalid JSON, fall through
    }
  }
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl,
    apiKey,
    ...(process.env.ZAI_USER_ID ? { userId: process.env.ZAI_USER_ID } : {}),
  };
}

async function ensureConfigFile(): Promise<void> {
  const envConfig = configFromEnv();
  if (!envConfig) return; // no env vars → SDK will look for the file itself

  // Write to project root so the SDK finds it
  const configPath = path.join(process.cwd(), ".z-ai-config");
  try {
    await fs.writeFile(configPath, JSON.stringify(envConfig, null, 2), "utf-8");
  } catch {
    // If we can't write to cwd (e.g., read-only filesystem), try /tmp
    const tmpPath = "/tmp/.z-ai-config";
    await fs.writeFile(tmpPath, JSON.stringify(envConfig, null, 2), "utf-8");
    process.env.HOME = "/tmp";
  }
}

export async function getLLM() {
  if (!zaiInstance) {
    await ensureConfigFile();
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
        model: "glm-4-plus",
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      });
      if (!completion) {
        throw new Error("LLM API returned an empty response. Check your ZAI_CONFIG credentials and baseUrl.");
      }
      const choices = completion.choices;
      if (!Array.isArray(choices) || choices.length === 0) {
        const errMsg = completion.error?.message || completion.message || JSON.stringify(completion).slice(0, 200);
        throw new Error(`LLM API error: ${errMsg}. Verify ZAI_CONFIG baseUrl (should be https://api.z.ai/api/paas/v4) and apiKey are correct.`);
      }
      const content = choices[0]?.message?.content ?? "";
      if (!content || content.trim().length === 0) {
        throw new Error("Empty LLM response — the API returned no content.");
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

