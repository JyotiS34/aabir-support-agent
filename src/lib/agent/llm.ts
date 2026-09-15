import ZAI from "z-ai-web-dev-sdk";
import { promises as fs } from "fs";
import path from "path";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "openai/gpt-oss-120b",     
  "openai/gpt-oss-20b",      
  "qwen/qwen3.8-27b",        
  "groq/compound",           
  "groq/compound-mini",     
];

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

function configFromEnv(): Record<string, string> | null {
  const fullConfig = process.env.ZAI_CONFIG;
  if (fullConfig) {
    try {
      const parsed = JSON.parse(fullConfig);
      if (parsed.baseUrl && parsed.apiKey) return parsed;
    } catch {}
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
  if (!envConfig) return;
  const configPath = path.join(process.cwd(), ".z-ai-config");
  try {
    await fs.writeFile(configPath, JSON.stringify(envConfig, null, 2), "utf-8");
  } catch {
    const tmpPath = "/tmp/.z-ai-config";
    await fs.writeFile(tmpPath, JSON.stringify(envConfig, null, 2), "utf-8");
    process.env.HOME = "/tmp";
  }
}

async function getZaiLLM() {
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

let workingGroqModel: string | null = null;

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

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
        // If model not found, try next model
        if (res.status === 404 || errMsg.includes("does not exist") || errMsg.includes("model_not_found")) {
          lastError = new Error(`Groq model "${model}" not available: ${errMsg}`);
          continue; // try next model
        }
        // Other errors (rate limit, auth, etc.) — throw immediately
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

async function callZai(
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResult> {
  const start = Date.now();
  const zai = await getZaiLLM();
  const completion = await zai.chat.completions.create({
    model: "glm-4-plus",
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });
  if (!completion) {
    throw new Error("Z.ai API returned an empty response. Check your ZAI_CONFIG.");
  }
  const choices = completion.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    const errMsg = completion.error?.message || completion.message || JSON.stringify(completion).slice(0, 200);
    throw new Error(`Z.ai API error: ${errMsg}. Verify ZAI_CONFIG baseUrl and apiKey.`);
  }
  const content = choices[0]?.message?.content ?? "";
  if (!content || content.trim().length === 0) {
    throw new Error("Z.ai returned empty content");
  }
  return { content, latencyMs: Date.now() - start };
}

export async function llmComplete(
  systemPrompt: string,
  userPrompt: string,
  opts: { retries?: number } = {},
): Promise<LLMResult> {
  const retries = opts.retries ?? 2;

  const useGroq = !!process.env.GROQ_API_KEY || !!process.env.ZAI_CONFIG?.includes("groq");

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (useGroq) {
        return await callGroq(systemPrompt, userPrompt);
      } else {
        return await callZai(systemPrompt, userPrompt);
      }
    } catch (err) {
      lastError = err;
      if (useGroq && (process.env.ZAI_CONFIG || await hasZaiConfigFile())) {
        try {
          return await callZai(systemPrompt, userPrompt);
        } catch (zaiErr) {
          lastError = zaiErr;
        }
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM completion failed");
}

async function hasZaiConfigFile(): Promise<boolean> {
  try {
    await fs.readFile(path.join(process.cwd(), ".z-ai-config"), "utf-8");
    return true;
  } catch {
    return false;
  }
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
