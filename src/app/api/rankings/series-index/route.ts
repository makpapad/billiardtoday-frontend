import { NextResponse } from "next/server";
import { fetchRankingSeriesIndex } from "@/lib/rankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchRankingSeriesIndex();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[api][rankings][series-index]", error);
    return NextResponse.json({ error: "Failed to load ranking series" }, { status: 500 });
  }
}
