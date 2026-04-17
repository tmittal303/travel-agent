import { NextResponse } from "next/server";
import { tracker } from "@/lib/tracking/tracker";

export async function GET() {
  return NextResponse.json(tracker.getSummary());
}

export async function DELETE() {
  tracker.clear();
  return NextResponse.json({ cleared: true });
}