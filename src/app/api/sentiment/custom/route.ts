import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/sentiment/custom — calls the custom fine-tuned BERT sentiment model
// hosted at https://jyqti-bert-novel.hf.space/predict
// Returns a 4-class sentiment: positive / negative / neutral / irrelevant
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = (body.text ?? "").toString().trim();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const start = Date.now();
    const res = await fetch("https://jyqti-bert-novel.hf.space/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "customer_msg", text }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Custom model returned ${res.status}: ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const latencyMs = Date.now() - start;

    // The model returns: { label, score, probs: { negative, positive, neutral, irrelevant } }
    const label: string = data.label ?? "neutral";
    const probs: Record<string, number> = data.probs ?? {};
    const score: number = data.score ?? 0;

    // Map the 4-class output to the app's 5-level escalation weight
    // negative → escalate bias (could be frustrated/angry/urgent)
    // irrelevant → neutral (factual, no emotion)
    const escalationWeight: Record<string, number> = {
      negative: 0.4,
      positive: 0.0,
      neutral: 0.05,
      irrelevant: 0.05,
    };

    return NextResponse.json({
      ok: true,
      sentiment: {
        label,
        score,
        probs,
        escalationWeight: escalationWeight[label] ?? 0.05,
        modelId: "bert-novel-v1",
        latencyMs,
        endpoint: "jyqti-bert-novel.hf.space",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "custom sentiment failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
