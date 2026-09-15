import { NextRequest, NextResponse } from "next/server";
import { judgeReply } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/eval/judge — judge a single (message, intent, reply) triple live.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message: string = (body.message ?? "").toString().trim();
    const intent: string = (body.intent ?? "").toString();
    const reply: string = (body.reply ?? "").toString().trim();
    if (!message || !reply) {
      return NextResponse.json({ error: "message and reply are required" }, { status: 400 });
    }
    const judge = await judgeReply(message, intent, reply);
    return NextResponse.json({ ok: true, judge });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "judge failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
