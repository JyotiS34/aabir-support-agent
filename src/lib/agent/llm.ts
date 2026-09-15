import ZAI from "z-ai-web-dev-sdk";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

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
  // Option 2: Separate env vars (also supported if your platform allows multiple)
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl,
    apiKey,
    ...(process.env.ZAI_TOKEN ? { token: process.env.ZAI_TOKEN } : {}),
    ...(process.env.ZAI_USER_ID ? { userId: process.env.ZAI_USER_ID } : {}),
  };
}

// Write env-based config to a temp .z-ai-config file so the SDK can read it
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
    // Set HOME to /tmp so the SDK finds it there
    process.env.HOME = "/tmp";
  }
}

export async function getLLM() {
  if (!zaiInstance) {
    // If env vars are set, write a config file from them before the SDK loads
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
