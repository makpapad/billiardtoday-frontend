import { NextResponse } from "next/server";
import { fetchScoreboardSessionById, normalizeLiveSessionRow } from "@/lib/liveSessions";
import { getScoreboardApiToken } from "@/lib/server-token";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const row = await fetchScoreboardSessionById(sessionId, getScoreboardApiToken());
    if (!row) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json({ data: [normalizeLiveSessionRow(row)] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch scoreboard session" },
      { status: 500 },
    );
  }
}
