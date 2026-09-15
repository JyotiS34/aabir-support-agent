import { NextRequest, NextResponse } from "next/server";
import { analyzeMessage } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message: string = (body.message ?? "").toString().trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const customerName: string = (body.customerName ?? "there").toString();
    const threadContext: string[] | undefined = Array.isArray(body.threadContext)
      ? body.threadContext.map(String)
      : undefined;

    const analysis = await analyzeMessage(message, { customerName, threadContext });
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "analyze failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
