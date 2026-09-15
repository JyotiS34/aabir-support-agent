import { NextResponse } from "next/server";
import { SEED_CONVERSATIONS } from "@/lib/data/seed-conversations";
import { CACHED_ANALYSES } from "@/lib/data/cached-analyses";
import { getIntent } from "@/lib/agent/intents";

export const runtime = "nodejs";

export interface MessageWithAnalysis {
  tweetId: string;
  customerHandle: string;
  customerName: string;
  message: string;
  threadContext?: string[];
  occurredAt: string;
  expectedIntent: string;
  expectedDecision: "auto-handle" | "escalate";
  difficulty: "easy" | "medium" | "hard";
  analysis?: ReturnType<typeof Object> & {
    intent: string;
    intentConfidence: number;
    intentReasoning: string;
    draftReply: string;
    draftConfidence: number;
    groundedIn: string[];
    decision: "auto-handle" | "escalate";
    decisionReason: string;
    escalationSignals: string[];
    latencyMs: number;
    modelId: string;
  };
}

// GET /api/messages — list all seed conversations with cached analyses + intent meta
export async function GET() {
  const now = Date.now();
  const messages = SEED_CONVERSATIONS.map((c) => {
    const analysis = CACHED_ANALYSES[c.tweetId];
    const intent = analysis ? getIntent(analysis.intent) : undefined;
    const occurredAt = new Date(now - c.ageHours * 3600_000).toISOString();
    return {
      ...c,
      occurredAt,
      analysis: analysis
        ? { ...analysis, intentLabel: intent?.label, intentSeverity: intent?.severity }
        : undefined,
    };
  });
  return NextResponse.json({ ok: true, messages });
}
