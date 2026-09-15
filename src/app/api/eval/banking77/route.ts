import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { classifyByKeywords } from "@/lib/agent/classifier";
import { INTENTS } from "@/lib/agent/intents";

export const runtime = "nodejs";

interface B77Example {
  id: string;
  message: string;
  expectedIntent: string;
  expectedDecision: "auto-handle" | "escalate";
  difficulty: string;
  note: string;
  source: string;
  b77Intent: string;
}

// GET /api/eval/banking77 — returns Banking77 cross-domain intent eval results.
// Loads the real Banking77 golden set from data/banking77_golden_set.json.
export async function GET() {
  let examples: B77Example[] = [];
  let mapping: { banking77_intent: string; app_intent: string; examples: number; unmapped?: boolean }[] = [];
  try {
    const goldenPath = path.join(process.cwd(), "data", "banking77_golden_set.json");
    examples = JSON.parse(await fs.readFile(goldenPath, "utf-8")) as B77Example[];
    const mapPath = path.join(process.cwd(), "data", "banking77_intent_map.json");
    mapping = JSON.parse(await fs.readFile(mapPath, "utf-8")) as typeof mapping;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Banking77 data not found. Run scripts/build_banking77_golden.py first." },
      { status: 404 },
    );
  }

  // Run the keyword baseline classifier on each Banking77 example
  const results = examples.map((g) => {
    const cls = classifyByKeywords(g.message);
    const predictedIntent = cls.intent;
    const intentCorrect = predictedIntent === g.expectedIntent;
    // Decision predicted from predicted intent (non-circular)
    const sensitive = ["damaged_defective", "refund_request", "payment_issue", "account_access", "general_complaint"];
    const predictedDecision = sensitive.includes(predictedIntent) ? "escalate" : "auto-handle";
    const decisionCorrect = predictedDecision === g.expectedDecision;
    return {
      id: g.id,
      message: g.message,
      b77Intent: g.b77Intent,
      expectedIntent: g.expectedIntent,
      expectedIntentLabel: INTENTS.find((i) => i.id === g.expectedIntent)?.label ?? g.expectedIntent,
      predictedIntent,
      predictedIntentLabel: INTENTS.find((i) => i.id === predictedIntent)?.label ?? predictedIntent,
      intentCorrect,
      expectedDecision: g.expectedDecision,
      predictedDecision,
      decisionCorrect,
      note: g.note,
    };
  });

  const total = results.length;
  const intentAccuracy = results.filter((r) => r.intentCorrect).length / total;
  const decisionAccuracy = results.filter((r) => r.decisionCorrect).length / total;

  // Per-mapped-intent accuracy
  const perIntent = INTENTS.map((i) => {
    const subset = results.filter((r) => r.expectedIntent === i.id);
    return {
      intent: i.id,
      label: i.label,
      count: subset.length,
      accuracy: subset.length ? subset.filter((r) => r.intentCorrect).length / subset.length : null,
    };
  }).filter((p) => p.count > 0);

  // Per-source-Banking77-intent accuracy (top 15 by count)
  const b77Counts = new Map<string, { total: number; correct: number }>();
  for (const r of results) {
    const e = b77Counts.get(r.b77Intent) ?? { total: 0, correct: 0 };
    e.total++;
    if (r.intentCorrect) e.correct++;
    b77Counts.set(r.b77Intent, e);
  }
  const perB77Intent = Array.from(b77Counts.entries())
    .map(([b77, v]) => ({
      banking77Intent: b77,
      count: v.total,
      accuracy: v.correct / v.total,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Mismatches
  const mismatches = results
    .filter((r) => !r.intentCorrect)
    .map((r) => ({
      id: r.id,
      message: r.message,
      b77Intent: r.b77Intent,
      expectedApp: r.expectedIntentLabel,
      predictedApp: r.predictedIntentLabel,
    }));

  return NextResponse.json({
    ok: true,
    meta: {
      source: "REAL: Banking77 (Hugging Face PolyAI/banking77), 13,083 queries, 77 labelled intents. Cross-domain intent eval (banking → retail support).",
      totalExamples: total,
      totalBanking77Intents: 77,
      mappedIntents: mapping.filter((m) => !m.unmapped).length,
      unmappedIntents: mapping.filter((m) => m.unmapped).length,
    },
    metrics: {
      intentAccuracy,
      decisionAccuracy,
      // Note: Banking77 is intent-only (the assignment says "for intent work only"),
      // so decision/accuracy here is a bonus cross-domain check, not a headline metric.
    },
    perIntent,
    perB77Intent,
    mismatches,
    mapping,
  });
}
