import { NextRequest, NextResponse } from "next/server";
import { analyzeMessage, judgeReply } from "@/lib/agent";
import { GOLDEN_SET } from "@/lib/data/golden-set";
import { INTENTS } from "@/lib/agent/intents";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/eval/run — runs a LIVE evaluation on a random sample of N golden examples.
// Body: { sampleSize?: number (default 3, max 6) }
// This proves the live pipeline works end-to-end (real LLM calls + real judge).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sampleSize = Math.min(Math.max(Number(body.sampleSize) || 3, 1), 6);
    // Pick a reproducible-ish random sample
    const shuffled = [...GOLDEN_SET].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, sampleSize);

    const results: Array<{
      id: string;
      message: string;
      expectedIntent: string;
      expectedIntentLabel: string;
      predictedIntent: string;
      predictedIntentLabel: string;
      intentCorrect: boolean;
      expectedDecision: string;
      predictedDecision: string;
      decisionCorrect: boolean;
      draftReply: string;
      judgeOverall: number;
      judgeAcceptable: boolean;
      judgeCritique: string;
      latencyMs: number;
      difficulty: string;
    }> = [];
    for (const g of sample) {
      const analysis = await analyzeMessage(g.message, { customerName: "there" });
      const judge = await judgeReply(g.message, analysis.intent, analysis.draftReply);
      results.push({
        id: g.id,
        message: g.message,
        expectedIntent: g.expectedIntent,
        expectedIntentLabel: INTENTS.find((i) => i.id === g.expectedIntent)?.label ?? g.expectedIntent,
        predictedIntent: analysis.intent,
        predictedIntentLabel: INTENTS.find((i) => i.id === analysis.intent)?.label ?? analysis.intent,
        intentCorrect: analysis.intent === g.expectedIntent,
        expectedDecision: g.expectedDecision,
        predictedDecision: analysis.decision,
        decisionCorrect: analysis.decision === g.expectedDecision,
        draftReply: analysis.draftReply,
        judgeOverall: judge.overall,
        judgeAcceptable: judge.overall >= 0.7,
        judgeCritique: judge.critique,
        latencyMs: analysis.latencyMs,
        difficulty: g.difficulty,
      });
    }

    const intentAcc = results.filter((r) => r.intentCorrect).length / results.length;
    const decisionAcc = results.filter((r) => r.decisionCorrect).length / results.length;
    const acceptRate = results.filter((r) => r.judgeAcceptable).length / results.length;

    return NextResponse.json({
      ok: true,
      sampleSize: results.length,
      metrics: {
        intentAccuracy: intentAcc,
        decisionAccuracy: decisionAcc,
        acceptableRate: acceptRate,
      },
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "eval run failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
