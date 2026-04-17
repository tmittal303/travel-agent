import { NextRequest, NextResponse } from "next/server";
import { runTravelAgent } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a travel intent query" },
        { status: 400 }
      );
    }

    const result = await runTravelAgent(query.trim());

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/search] error:", err);
    return NextResponse.json(
      { error: err.message || "Agent failed" },
      { status: 500 }
    );
  }
}
