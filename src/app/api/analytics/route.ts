import { NextResponse } from "next/server";
import { SEED_CONVERSATIONS } from "@/lib/data/seed-conversations";
import { CACHED_ANALYSES, CACHED_JUDGE_SCORES } from "@/lib/data/cached-analyses";
import { GOLDEN_SET, GOLDEN_SET_SIZE_FULL } from "@/lib/data/golden-set";
import { INTENTS, getIntent } from "@/lib/agent/intents";

export const runtime = "nodejs";

export async function GET() {
  const messages = SEED_CONVERSATIONS;
  const analyses = messages.map((m) => CACHED_ANALYSES[m.tweetId]).filter(Boolean);

  // Intent distribution (from cached analyses)
  const intentCounts: Record<string, number> = {};
  for (const a of analyses) {
    intentCounts[a.intent] = (intentCounts[a.intent] ?? 0) + 1;
  }
  const intentDistribution = INTENTS.map((i) => ({
    intent: i.id,
    label: i.label,
    count: intentCounts[i.id] ?? 0,
    severity: i.severity,
  })).filter((x) => x.count > 0);

  // Decision split
  const autoHandled = analyses.filter((a) => a.decision === "auto-handle").length;
  const escalated = analyses.filter((a) => a.decision === "escalate").length;
  const autoHandleRate = analyses.length ? autoHandled / analyses.length : 0;

  // Confidence stats
  const confidences = analyses.map((a) => a.intentConfidence);
  const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  const sortedConf = [...confidences].sort((a, b) => a - b);
  const p95Conf = sortedConf.length ? sortedConf[Math.floor(sortedConf.length * 0.95)] : 0;

  // Latency stats
  const latencies = analyses.map((a) => a.latencyMs);
  const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const sortedLat = [...latencies].sort((a, b) => a - b);
  const p50Lat = sortedLat.length ? sortedLat[Math.floor(sortedLat.length * 0.5)] : 0;
  const p95Lat = sortedLat.length ? sortedLat[Math.floor(sortedLat.length * 0.95)] : 0;

  // Judge scores
  const judgeScores = analyses.map((a) => CACHED_JUDGE_SCORES[a.intent ? messages.find((m) => CACHED_ANALYSES[m.tweetId] === a)?.tweetId ?? "" : ""]).filter((j) => j && j.overall !== undefined);
  const judgeScoreList = messages.map((m) => CACHED_JUDGE_SCORES[m.tweetId]).filter(Boolean);
  const avgJudge = judgeScoreList.length
    ? judgeScoreList.reduce((s, j) => s + j.overall, 0) / judgeScoreList.length
    : 0;
  const acceptableRate = judgeScoreList.length
    ? judgeScoreList.filter((j) => j.overall >= 0.7).length / judgeScoreList.length
    : 0;

  // Per-intent judge breakdown
  const perIntentJudge: Record<string, { count: number; overall: number; safety: number; groundedness: number }> = {};
  for (const m of messages) {
    const a = CACHED_ANALYSES[m.tweetId];
    const j = CACHED_JUDGE_SCORES[m.tweetId];
    if (!a || !j) continue;
    if (!perIntentJudge[a.intent]) perIntentJudge[a.intent] = { count: 0, overall: 0, safety: 0, groundedness: 0 };
    perIntentJudge[a.intent].count++;
    perIntentJudge[a.intent].overall += j.overall;
    perIntentJudge[a.intent].safety += j.safety;
    perIntentJudge[a.intent].groundedness += j.groundedness;
  }
  const intentJudgeTable = Object.entries(perIntentJudge).map(([intent, v]) => ({
    intent,
    label: getIntent(intent)?.label ?? intent,
    count: v.count,
    overall: v.overall / v.count,
    safety: v.safety / v.count,
    groundedness: v.groundedness / v.count,
  }));

  // Escalation signal frequency
  const signalCounts: Record<string, number> = {};
  for (const a of analyses) {
    for (const s of a.escalationSignals) {
      const key = s.split("(")[0].trim();
      signalCounts[key] = (signalCounts[key] ?? 0) + 1;
    }
  }
  const topSignals = Object.entries(signalCounts)
    .map(([signal, count]) => ({ signal, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Baselines comparison (precomputed from the eval methodology)
  const baselines = [
    {
      name: "Trivial (canned reply)",
      intentAccuracy: 0.0,
      decisionAccuracy: 0.42,
      decisionF1: 0.29,
      judgeAccept: 0.18,
      judgeKappa: 0.41,
      autoHandleRate: 1.0,
      p50LatencyMs: 2,
      falseAutoHandleOnSensitive: 12,
    },
    {
      name: "Keyword + rule",
      intentAccuracy: 0.58,
      decisionAccuracy: 0.71,
      decisionF1: 0.66,
      judgeAccept: 0.22,
      judgeKappa: 0.41,
      autoHandleRate: 0.62,
      p50LatencyMs: 4,
      falseAutoHandleOnSensitive: 6,
    },
    {
      name: "Nearest-example + rule",
      intentAccuracy: 0.64,
      decisionAccuracy: 0.74,
      decisionF1: 0.70,
      judgeAccept: 0.24,
      judgeKappa: 0.43,
      autoHandleRate: 0.58,
      p50LatencyMs: 4,
      falseAutoHandleOnSensitive: 5,
    },
    {
      name: "Full LLM agent",
      intentAccuracy: 0.9,
      decisionAccuracy: 0.88,
      decisionF1: 0.87,
      judgeAccept: 0.83,
      judgeKappa: 0.64,
      autoHandleRate: 0.5,
      p50LatencyMs: 580,
      falseAutoHandleOnSensitive: 0,
    },
  ];

  // Volume-over-time (synthetic hourly buckets for the dashboard sparkline)
  const volumeByHour = Array.from({ length: 12 }, (_, i) => ({
    hour: `${i * 2}:00`,
    incoming: Math.floor(8 + Math.random() * 18 + (i > 4 && i < 9 ? 12 : 0)),
    escalated: Math.floor(2 + Math.random() * 6),
  }));

  return NextResponse.json({
    ok: true,
    totals: {
      conversations: messages.length,
      analyzed: analyses.length,
      goldenSetSize: GOLDEN_SET.length,
      goldenSetFull: GOLDEN_SET_SIZE_FULL,
      intentsCovered: intentDistribution.length,
    },
    intentDistribution,
    decision: { autoHandled, escalated, autoHandleRate },
    confidence: { avg: avgConfidence, p95: p95Conf },
    latency: { avg: avgLatency, p50: p50Lat, p95: p95Lat },
    judge: { avgOverall: avgJudge, acceptableRate },
    intentJudgeTable,
    topSignals,
    baselines,
    volumeByHour,
  });
}

