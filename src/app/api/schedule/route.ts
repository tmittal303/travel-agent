import { NextRequest, NextResponse } from "next/server";
import { runScheduleAgent } from "@/lib/scheduling/agent";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const result = await runScheduleAgent(
      message.trim(),
      (history as Anthropic.MessageParam[]) ?? []
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/schedule] error:", err);
    return NextResponse.json({ error: err.message || "Agent failed" }, { status: 500 });
  }
}
